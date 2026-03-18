/**
 * BODIK CKAN Data Ingestion Pipeline
 * 
 * This pipeline fetches vacant house (akiya) datasets from the BODIK CKAN API,
 * normalizes the data to the app's property schema, and stores it in the database.
 * 
 * BODIK (Big Data & Open Data Initiative Kyushu) provides open data from
 * municipalities across Kyushu and other regions of Japan.
 * 
 * @see https://odcs.bodik.jp/developers/
 */

import { BODIKConnector, type Dataset, type Resource, type DatastoreSearchResult } from "../datasources/connectors/bodik-connector";
import { db } from "../../db";
import {
  ckanDatasets,
  ckanResources,
  rawCaptures,
  listingVariants,
  propertyEntities,
  ingestionLogs,
  type InsertCkanDataset,
  type InsertCkanResource,
  type InsertRawCapture,
  type InsertListingVariant,
  type InsertPropertyEntity,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  captureRaw,
  upsertListingVariant,
  upsertCkanDataset,
  upsertCkanResource,
  generateSourceKey,
  generateSha256,
  createIngestionLog,
  updateIngestionLog,
} from "./upsert";
import { resolvePropertyEntity } from "./dedupe";
import { withJobLock } from "./jobLock";
import type { JobResult, FetchResult } from "../connectors/types";

const JOB_NAME = "bodik_ingestion";
const CONNECTOR_NAME = "bodik";
const BASE_URL = "https://data.bodik.jp";

/**
 * Known BODIK field mappings for akiya datasets
 * Different municipalities use different column names
 */
const BODIK_FIELD_MAPPINGS: Record<string, string[]> = {
  address: ["住所", "所在地", "物件所在地", "address", "location", "住所（番地）", "所在", "所在地（番地）"],
  price: ["価格", "売価", "販売価格", "希望価格", "price", "金額", "価格（円）", "価格(円)"],
  ldk: ["間取り", "間取", "ldk", "layout", "間取り（部屋数）"],
  landArea: ["土地面積", "敷地面積", "land_area", "土地", "土地面積（㎡）", "敷地面積（㎡）"],
  buildingArea: ["延床面積", "建物面積", "延べ面積", "床面積", "building_area", "建物面積（㎡）", "延床面積（㎡）"],
  yearBuilt: ["建築年", "築年", "築年数", "year_built", "建築年月", "建築年（西暦）", "築年数（年）"],
  url: ["url", "URL", "リンク", "詳細URL", "物件URL"],
  title: ["物件名", "名称", "title", "name"],
  description: ["備考", "説明", "概要", "description", "notes", "備考欄"],
  lat: ["緯度", "lat", "latitude", "緯度（世界測地系）"],
  lon: ["経度", "lon", "lng", "longitude", "経度（世界測地系）"],
  prefecture: ["都道府県", "prefecture"],
  municipality: ["市区町村", "市町村", "municipality", "city", "所在地（市区町村）"],
};

/**
 * Result of parsing a BODIK record
 */
interface ParsedBodikRecord {
  address?: string;
  price?: number;
  ldk?: string;
  landAreaM2?: number;
  buildingAreaM2?: number;
  yearBuilt?: number;
  url?: string;
  title?: string;
  description?: string;
  lat?: number;
  lon?: number;
  prefecture?: string;
  municipality?: string;
}

/**
 * Pipeline configuration options
 */
export interface BodikPipelineConfig {
  /** Maximum datasets to process per run (default: 50) */
  maxDatasets?: number;
  /** Maximum records per dataset to fetch (default: 1000) */
  maxRecordsPerDataset?: number;
  /** Specific organization (municipality) to filter by */
  organizationId?: string;
  /** Whether to process all datasets or only akiya-related ones */
  onlyAkiyaDatasets?: boolean;
  /** Enable dry-run mode (don't actually save to DB) */
  dryRun?: boolean;
}

/**
 * Pipeline execution result
 */
export interface BodikPipelineResult {
  success: boolean;
  datasetsProcessed: number;
  datasetsFailed: number;
  recordsFetched: number;
  recordsUpserted: number;
  recordsSkipped: number;
  errors: string[];
  logId?: string;
}

/**
 * Find the best matching field from a record based on possible field names
 */
function findFieldValue(record: Record<string, any>, fieldOptions: string[]): any {
  for (const option of fieldOptions) {
    if (record[option] !== undefined && record[option] !== null && record[option] !== "") {
      return record[option];
    }
  }
  return undefined;
}

/**
 * Parse a Japanese price string to a number
 */
function parsePrice(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  
  if (typeof value === "number") return value;
  
  if (typeof value === "string") {
    // Remove common Japanese price suffixes and clean
    const cleaned = value
      .replace(/[,，]/g, "")
      .replace(/円/g, "")
      .replace(/万/g, "0000")
      .replace(/億/g, "00000000")
      .trim();
    
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
  }
  
  return undefined;
}

/**
 * Parse a Japanese area string to square meters
 */
function parseArea(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  
  if (typeof value === "number") return value;
  
  if (typeof value === "string") {
    // Remove units and clean
    const cleaned = value
      .replace(/[,，]/g, "")
      .replace(/㎡/g, "")
      .replace(/m2/gi, "")
      .replace(/平方メートル/g, "")
      .replace(/坪/g, "")
      .trim();
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  
  return undefined;
}

/**
 * Parse a year built value
 */
function parseYearBuilt(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  
  if (typeof value === "number") {
    // Handle both 4-digit years and ages
    if (value > 1800 && value <= new Date().getFullYear()) {
      return value;
    }
    if (value < 200) {
      // Assume it's an age, convert to year
      return new Date().getFullYear() - value;
    }
    return undefined;
  }
  
  if (typeof value === "string") {
    // Extract 4-digit year
    const match = value.match(/(\d{4})/);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year > 1800 && year <= new Date().getFullYear() + 1) {
        return year;
      }
    }
    
    // Try parsing as number
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num)) {
      if (num > 1800 && num <= new Date().getFullYear()) {
        return num;
      }
      if (num < 200) {
        return new Date().getFullYear() - num;
      }
    }
  }
  
  return undefined;
}

/**
 * Parse a BODIK record into normalized fields
 */
function parseBodikRecord(record: Record<string, any>): ParsedBodikRecord {
  return {
    address: findFieldValue(record, BODIK_FIELD_MAPPINGS.address),
    price: parsePrice(findFieldValue(record, BODIK_FIELD_MAPPINGS.price)),
    ldk: findFieldValue(record, BODIK_FIELD_MAPPINGS.ldk),
    landAreaM2: parseArea(findFieldValue(record, BODIK_FIELD_MAPPINGS.landArea)),
    buildingAreaM2: parseArea(findFieldValue(record, BODIK_FIELD_MAPPINGS.buildingArea)),
    yearBuilt: parseYearBuilt(findFieldValue(record, BODIK_FIELD_MAPPINGS.yearBuilt)),
    url: findFieldValue(record, BODIK_FIELD_MAPPINGS.url),
    title: findFieldValue(record, BODIK_FIELD_MAPPINGS.title),
    description: findFieldValue(record, BODIK_FIELD_MAPPINGS.description),
    lat: parseFloat(findFieldValue(record, BODIK_FIELD_MAPPINGS.lat)) || undefined,
    lon: parseFloat(findFieldValue(record, BODIK_FIELD_MAPPINGS.lon)) || undefined,
    prefecture: findFieldValue(record, BODIK_FIELD_MAPPINGS.prefecture),
    municipality: findFieldValue(record, BODIK_FIELD_MAPPINGS.municipality),
  };
}

/**
 * Create a source key for a BODIK record
 */
function createBodikSourceKey(
  datasetId: string,
  resourceId: string,
  record: Record<string, any>,
  rowIndex: number
): string {
  const address = findFieldValue(record, BODIK_FIELD_MAPPINGS.address) || "";
  const title = findFieldValue(record, BODIK_FIELD_MAPPINGS.title) || "";
  return generateSourceKey(BASE_URL, datasetId, resourceId, address, title, String(rowIndex));
}

/**
 * Map a parsed BODIK record to listing variant and property entity
 */
function mapToListingVariant(
  parsed: ParsedBodikRecord,
  sourceKey: string,
  rawCaptureId: string
): { variant: InsertListingVariant; propertyEntity: InsertPropertyEntity } | null {
  // Skip records with no meaningful data
  if (!parsed.address && !parsed.title && !parsed.price) {
    return null;
  }

  const variant: InsertListingVariant = {
    sourceType: "bodik",
    sourceKey,
    sourceUrl: parsed.url,
    titleJp: parsed.title || parsed.address,
    descJp: parsed.description,
    priceJpy: parsed.price,
    ldk: parsed.ldk,
    landAreaM2: parsed.landAreaM2,
    buildingAreaM2: parsed.buildingAreaM2,
    yearBuilt: parsed.yearBuilt,
    hasLand: parsed.landAreaM2 !== undefined && parsed.landAreaM2 > 0,
    rawCaptureId,
    status: "active",
    translateStatus: "pending",
  };

  const propertyEntity: InsertPropertyEntity = {
    canonicalLat: parsed.lat,
    canonicalLon: parsed.lon,
    canonicalAddressJp: parsed.address,
    prefecture: parsed.prefecture,
    municipality: parsed.municipality,
    confidenceScore: parsed.lat && parsed.lon ? 0.8 : 0.5,
  };

  return { variant, propertyEntity };
}

/**
 * Check if a dataset is akiya-related
 */
function isAkiyaDataset(dataset: Dataset): boolean {
  const akiyaKeywords = [
    "空き家",
    "あき家",
    "空家",
    "akiya",
    "vacant house",
    "家屋",
    "住宅",
    "住居",
    "空きバンク",
    "空家バンク",
  ];
  
  const text = `${dataset.title} ${dataset.notes || ""} ${dataset.tags.map((t) => t.name).join(" ")}`.toLowerCase();
  return akiyaKeywords.some((kw) => text.includes(kw.toLowerCase()));
}

/**
 * Process a single BODIK dataset
 */
async function processBodikDataset(
  connector: BODIKConnector,
  dataset: Dataset,
  config: BodikPipelineConfig,
  logId: string
): Promise<{ success: boolean; recordsFetched: number; recordsUpserted: number; recordsSkipped: number; error?: string }> {
  let recordsFetched = 0;
  let recordsUpserted = 0;
  let recordsSkipped = 0;

  try {
    // Find best resource (prefer CSV with datastore)
    const resource = dataset.resources.find(
      (r) => r.datastore_active && r.format?.toUpperCase() === "CSV"
    ) || dataset.resources.find(
      (r) => r.format?.toUpperCase() === "CSV" || r.format?.toUpperCase() === "XLSX"
    ) || dataset.resources[0];

    if (!resource) {
      return { success: true, recordsFetched: 0, recordsUpserted: 0, recordsSkipped: 1, error: "No resources found" };
    }

    // Only process datastore-enabled resources for now
    if (!resource.datastore_active) {
      return { success: true, recordsFetched: 0, recordsUpserted: 0, recordsSkipped: 1, error: "Resource not datastore-enabled" };
    }

    const maxRecords = config.maxRecordsPerDataset || 1000;
    let offset = 0;
    let hasMore = true;
    let allRecords: Record<string, any>[] = [];

    // Fetch records in batches
    while (hasMore && allRecords.length < maxRecords) {
      const batchSize = Math.min(100, maxRecords - allRecords.length);
      const result = await connector.getAkiyaData(resource.id, batchSize, offset);
      
      if (result.records && result.records.length > 0) {
        allRecords = allRecords.concat(result.records);
        offset += result.records.length;
        hasMore = result.records.length === batchSize && offset < (result.total || Infinity);
      } else {
        hasMore = false;
      }
    }

    recordsFetched = allRecords.length;

    if (allRecords.length === 0) {
      return { success: true, recordsFetched: 0, recordsUpserted: 0, recordsSkipped: 0 };
    }

    if (config.dryRun) {
      return { success: true, recordsFetched, recordsUpserted: recordsFetched, recordsSkipped: 0 };
    }

    // Create raw capture
    const rawCaptureData: InsertRawCapture = {
      sourceType: "bodik",
      contentType: "json",
      sha256: generateSha256(JSON.stringify(allRecords)),
      inlineJson: {
        datasetId: dataset.id,
        resourceId: resource.id,
        datasetName: dataset.name,
        recordCount: allRecords.length,
      },
    };

    const rawCaptureId = await captureRaw(rawCaptureData);

    // Process records
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      const parsed = parseBodikRecord(record);
      const sourceKey = createBodikSourceKey(dataset.id, resource.id, record, i);

      const mapped = mapToListingVariant(parsed, sourceKey, rawCaptureId);
      
      if (!mapped) {
        recordsSkipped++;
        continue;
      }

      try {
        const entityId = await resolvePropertyEntity(mapped.propertyEntity);
        const result = await upsertListingVariant({
          ...mapped.variant,
          propertyEntityId: entityId,
        });

        if (result.isNew) {
          recordsUpserted++;
        }
      } catch (error) {
        console.error(`[BODIK Pipeline] Error processing record ${i}:`, error);
        recordsSkipped++;
      }
    }

    return { success: true, recordsFetched, recordsUpserted, recordsSkipped };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, recordsFetched, recordsUpserted, recordsSkipped, error: errorMessage };
  }
}

/**
 * Store BODIK dataset metadata in the database
 */
async function storeDatasetMetadata(dataset: Dataset): Promise<string> {
  const ckanDataset: InsertCkanDataset = {
    ckanInstanceBaseUrl: BASE_URL,
    packageId: dataset.id,
    packageName: dataset.name,
    title: dataset.title,
    organization: dataset.organization?.title,
    licenseId: dataset.license_id,
    licenseTitle: dataset.license_title,
    tags: dataset.tags.map((t) => t.name),
    notes: dataset.notes,
    status: "active",
  };

  const result = await upsertCkanDataset(ckanDataset);
  return result.id;
}

/**
 * Store BODIK resource metadata in the database
 */
async function storeResourceMetadata(
  datasetId: string,
  resource: Resource
): Promise<string> {
  const ckanResource: InsertCkanResource = {
    ckanDatasetId: datasetId,
    resourceId: resource.id,
    format: resource.format,
    downloadUrl: resource.url,
  };

  const result = await upsertCkanResource(ckanResource);
  return result.id;
}

/**
 * Run the BODIK ingestion pipeline
 */
export async function runBodikPipeline(
  config: BodikPipelineConfig = {}
): Promise<BodikPipelineResult> {
  const lockResult = await withJobLock(JOB_NAME, async () => {
    const logId = await createIngestionLog({
      connectorName: CONNECTOR_NAME,
      jobType: "bodik_ingestion",
      status: "running",
    });

    const result: BodikPipelineResult = {
      success: true,
      datasetsProcessed: 0,
      datasetsFailed: 0,
      recordsFetched: 0,
      recordsUpserted: 0,
      recordsSkipped: 0,
      errors: [],
      logId,
    };

    try {
      const connector = new BODIKConnector();
      const maxDatasets = config.maxDatasets || 50;

      console.log(`[BODIK Pipeline] Starting ingestion with config:`, config);

      // Search for akiya datasets
      let datasets: Dataset[] = [];
      
      if (config.organizationId) {
        // Search by specific municipality
        const searchResult = await connector.searchByMunicipality(
          config.organizationId,
          config.onlyAkiyaDatasets !== false ? "空き家" : undefined,
          maxDatasets
        );
        // We need to fetch full dataset details for each result
        const datasetPromises = searchResult.map(async (ds) => {
          try {
            return await connector.getPackage(ds.datasetId);
          } catch (e) {
            return null;
          }
        });
        datasets = (await Promise.all(datasetPromises)).filter((d): d is Dataset => d !== null);
      } else {
        // Search for all akiya datasets
        const searchResult = await connector.searchAkiyaDatasets(maxDatasets);
        const datasetPromises = searchResult.map(async (ds) => {
          try {
            return await connector.getPackage(ds.datasetId);
          } catch (e) {
            return null;
          }
        });
        datasets = (await Promise.all(datasetPromises)).filter((d): d is Dataset => d !== null);
      }

      console.log(`[BODIK Pipeline] Found ${datasets.length} datasets to process`);

      // Process each dataset
      for (const dataset of datasets) {
        // Filter non-akiya datasets if configured
        if (config.onlyAkiyaDatasets !== false && !isAkiyaDataset(dataset)) {
          console.log(`[BODIK Pipeline] Skipping non-akiya dataset: ${dataset.title}`);
          continue;
        }

        console.log(`[BODIK Pipeline] Processing dataset: ${dataset.title}`);

        try {
          // Store dataset metadata
          if (!config.dryRun) {
            const dbDatasetId = await storeDatasetMetadata(dataset);
            
            // Store resource metadata
            for (const resource of dataset.resources) {
              await storeResourceMetadata(dbDatasetId, resource);
            }
          }

          // Process the dataset
          const processResult = await processBodikDataset(connector, dataset, config, logId);

          if (processResult.success) {
            result.datasetsProcessed++;
            result.recordsFetched += processResult.recordsFetched;
            result.recordsUpserted += processResult.recordsUpserted;
            result.recordsSkipped += processResult.recordsSkipped;
          } else {
            result.datasetsFailed++;
            if (processResult.error) {
              result.errors.push(`${dataset.title}: ${processResult.error}`);
            }
          }
        } catch (error) {
          result.datasetsFailed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`${dataset.title}: ${errorMessage}`);
          console.error(`[BODIK Pipeline] Error processing dataset ${dataset.title}:`, error);
        }
      }

      // Update final status
      result.success = result.datasetsFailed === 0;

      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: result.success ? "completed" : "completed_with_errors",
        itemsFetched: result.recordsFetched,
        itemsUpserted: result.recordsUpserted,
        itemsSkipped: result.recordsSkipped,
        errorMessage: result.errors.length > 0 ? result.errors.join("; ") : undefined,
        metadata: {
          datasetsProcessed: result.datasetsProcessed,
          datasetsFailed: result.datasetsFailed,
        },
      });

      console.log(`[BODIK Pipeline] Completed:`, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(`Pipeline error: ${errorMessage}`);

      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: "failed",
        errorMessage,
        itemsFetched: result.recordsFetched,
        itemsUpserted: result.recordsUpserted,
        itemsSkipped: result.recordsSkipped,
      });

      console.error(`[BODIK Pipeline] Failed:`, error);

      return result;
    }
  });

  if (lockResult.skipped) {
    return {
      success: false,
      datasetsProcessed: 0,
      datasetsFailed: 0,
      recordsFetched: 0,
      recordsUpserted: 0,
      recordsSkipped: 0,
      errors: ["Job already running (lock not acquired)"],
    };
  }

  return lockResult.result!;
}

/**
 * Get the status of the BODIK connector
 */
export async function getBodikConnectorStatus(): Promise<{
  configured: boolean;
  enabled: boolean;
  lastRunAt?: Date;
  lastError?: string;
}> {
  const log = await db.query.ingestionLogs.findFirst({
    where: eq(ingestionLogs.connectorName, CONNECTOR_NAME),
    orderBy: (logs, { desc }) => [desc(logs.startedAt)],
  });

  return {
    configured: true,
    enabled: true,
    lastRunAt: log?.startedAt || undefined,
    lastError: log?.errorMessage || undefined,
  };
}

export default runBodikPipeline;
