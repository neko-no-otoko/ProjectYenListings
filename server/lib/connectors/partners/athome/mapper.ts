import type { InsertListingVariant, InsertPropertyEntity } from "@shared/schema";
import type { ParsedRow } from "../../ckan/datasetParsers";
import { generateSourceKey } from "../../../ingestion/upsert";

export function mapAtHomeRow(row: ParsedRow, rowIndex: number, rawCaptureId?: string): {
  variant: InsertListingVariant;
  propertyEntity: InsertPropertyEntity;
} | null {
  const { mapped, raw } = row;
  
  if (!mapped.address && !mapped.title && !mapped.price) {
    return null;
  }
  
  const sourceKey = generateSourceKey(
    "athome",
    mapped.address || Object.values(raw).slice(0, 3).join("|"),
    String(rowIndex)
  );
  
  const variant: InsertListingVariant = {
    sourceType: "athome",
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
