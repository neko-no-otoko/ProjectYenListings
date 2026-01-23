import type { Connector, ConnectorStatus, FetchResult } from "../types";
import type { InsertCkanDataset, InsertCkanResource } from "@shared/schema";
import { getSearchCkanJpClient, CkanClient } from "./ckanClient";
import { upsertCkanDataset, upsertCkanResource, createIngestionLog, updateIngestionLog } from "../../ingestion/upsert";
import { CONNECTOR_NAMES } from "../index";

const AKIYA_KEYWORDS = [
  "空き家バンク",
  "空き家",
  "移住 住宅",
  "空き家バンク 物件",
  "akiya",
  "空き家 一覧",
];

const PERMISSIVE_LICENSES = [
  "cc-by",
  "cc-by-sa",
  "cc-zero",
  "cc0",
  "odc-pddl",
  "odc-by",
  "odc-odbl",
  "public-domain",
  "notspecified",
  "",
];

export class CkanDiscoveryConnector implements Connector {
  readonly name = CONNECTOR_NAMES.CKAN_DISCOVERY;
  readonly sourceType = "ckan_akiya" as const;
  
  private client: CkanClient;
  private lastRunAt?: Date;
  private lastError?: string;
  private itemsFetched = 0;
  private itemsUpserted = 0;

  constructor() {
    this.client = getSearchCkanJpClient();
  }

  isConfigured(): boolean {
    return true;
  }

  isEnabled(): boolean {
    return true;
  }

  async getStatus(): Promise<ConnectorStatus> {
    return {
      name: this.name,
      configured: this.isConfigured(),
      enabled: this.isEnabled(),
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      itemsFetched: this.itemsFetched,
      itemsUpserted: this.itemsUpserted,
    };
  }

  async discoverDatasets(keywords: string[] = AKIYA_KEYWORDS): Promise<FetchResult<InsertCkanDataset>> {
    const logId = await createIngestionLog({
      connectorName: this.name,
      jobType: "discovery",
      status: "running",
    });

    try {
      const allDatasets: InsertCkanDataset[] = [];
      const seenPackageIds = new Set<string>();

      for (const keyword of keywords) {
        let start = 0;
        const rows = 100;
        let hasMore = true;

        while (hasMore) {
          const result = await this.client.packageSearch(keyword, { rows, start });

          if (!result.success || !result.data) {
            console.log(`[CKAN Discovery] Search failed for "${keyword}": ${result.error}`);
            break;
          }

          for (const pkg of result.data.results) {
            if (seenPackageIds.has(pkg.id)) continue;
            seenPackageIds.add(pkg.id);

            const licenseId = (pkg.license_id || "").toLowerCase();
            const isPermissive = PERMISSIVE_LICENSES.some(l => licenseId.includes(l)) || licenseId === "";
            const status = isPermissive ? "active" : "review_required";

            const dataset: InsertCkanDataset = {
              ckanInstanceBaseUrl: this.client.getBaseUrl(),
              packageId: pkg.id,
              packageName: pkg.name,
              title: pkg.title,
              organization: pkg.organization?.title || pkg.organization?.name,
              licenseId: pkg.license_id,
              licenseTitle: pkg.license_title,
              tags: pkg.tags?.map(t => t.name) || [],
              notes: pkg.notes,
              status: status as "active" | "review_required" | "denied" | "inactive",
            };

            allDatasets.push(dataset);
          }

          hasMore = result.data.results.length === rows && start + rows < result.data.count;
          start += rows;
        }
      }

      this.itemsFetched = allDatasets.length;
      let upserted = 0;

      for (const dataset of allDatasets) {
        const result = await upsertCkanDataset(dataset);
        if (result.isNew) upserted++;

        if (dataset.status === "active") {
          const pkgResult = await this.client.packageShow(dataset.packageId);
          if (pkgResult.success && pkgResult.data?.resources) {
            for (const res of pkgResult.data.resources) {
              const format = (res.format || "").toLowerCase();
              if (["csv", "json", "xlsx"].includes(format)) {
                const resource: InsertCkanResource = {
                  ckanDatasetId: result.id,
                  resourceId: res.id,
                  format: res.format,
                  downloadUrl: res.url,
                };
                await upsertCkanResource(resource);
              }
            }
          }
        }
      }

      this.itemsUpserted = upserted;
      this.lastRunAt = new Date();

      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: "completed",
        itemsFetched: this.itemsFetched,
        itemsUpserted: this.itemsUpserted,
      });

      return {
        success: true,
        data: allDatasets,
        metadata: {
          keywordsSearched: keywords.length,
          totalFound: allDatasets.length,
          upserted,
        },
      };
    } catch (error) {
      this.lastError = (error as Error).message;
      
      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: "failed",
        errorMessage: this.lastError,
      });

      return {
        success: false,
        error: this.lastError,
      };
    }
  }
}

export const ckanDiscoveryConnector = new CkanDiscoveryConnector();
