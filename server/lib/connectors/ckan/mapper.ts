import type { InsertListingVariant, InsertPropertyEntity } from "@shared/schema";
import type { ParsedRow } from "./datasetParsers";
import { generateSourceKey } from "../../ingestion/upsert";

export interface MappedVariant {
  variant: InsertListingVariant;
  propertyEntity: InsertPropertyEntity;
}

export function mapParsedRowToVariant(
  row: ParsedRow,
  ckanInstanceUrl: string,
  packageId: string,
  resourceId: string,
  rowIndex: number,
  rawCaptureId?: string
): MappedVariant | null {
  const { mapped, raw } = row;
  
  if (!mapped.address && !mapped.title && !mapped.price) {
    return null;
  }
  
  const sourceKey = generateSourceKey(
    ckanInstanceUrl,
    packageId,
    resourceId,
    mapped.address || Object.values(raw).slice(0, 3).join("|"),
    String(rowIndex)
  );
  
  const variant: InsertListingVariant = {
    sourceType: "ckan_akiya",
    sourceKey,
    sourceUrl: mapped.url,
    titleJp: mapped.title || mapped.address,
    descJp: mapped.description,
    priceJpy: mapped.price,
    ldk: mapped.ldk,
    landAreaM2: mapped.landAreaM2,
    buildingAreaM2: mapped.buildingAreaM2,
    yearBuilt: mapped.yearBuilt,
    hasLand: mapped.landAreaM2 !== undefined && mapped.landAreaM2 > 0,
    rawCaptureId,
    status: "active",
    translateStatus: "pending",
  };
  
  const propertyEntity: InsertPropertyEntity = {
    canonicalLat: mapped.lat,
    canonicalLon: mapped.lon,
    canonicalAddressJp: mapped.address,
    prefecture: mapped.prefecture,
    municipality: mapped.municipality,
    confidenceScore: row.confidence,
  };
  
  return { variant, propertyEntity };
}

export function mapRowsToVariants(
  rows: ParsedRow[],
  ckanInstanceUrl: string,
  packageId: string,
  resourceId: string,
  rawCaptureId?: string
): MappedVariant[] {
  const results: MappedVariant[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const mapped = mapParsedRowToVariant(
      rows[i],
      ckanInstanceUrl,
      packageId,
      resourceId,
      i,
      rawCaptureId
    );
    
    if (mapped) {
      results.push(mapped);
    }
  }
  
  return results;
}
