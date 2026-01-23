import type { InsertReinfolibTransaction } from "@shared/schema";
import type { ReinfolibTransactionRecord } from "./client";
import { generateSourceKey } from "../../ingestion/upsert";

export function parseJapaneseNumber(value: string | undefined): number | null {
  if (!value) return null;
  
  const cleaned = value.replace(/[,，]/g, "");
  const num = parseInt(cleaned, 10);
  
  return isNaN(num) ? null : num;
}

export function parseArea(value: string | undefined): number | null {
  if (!value) return null;
  
  const cleaned = value.replace(/[,，㎡m²]/g, "");
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}

export function parseBuildingYear(value: string | undefined): number | null {
  if (!value) return null;
  
  const warekiMatch = value.match(/(昭和|平成|令和)(\d+)/);
  if (warekiMatch) {
    const era = warekiMatch[1];
    const year = parseInt(warekiMatch[2], 10);
    
    switch (era) {
      case "昭和": return 1925 + year;
      case "平成": return 1988 + year;
      case "令和": return 2018 + year;
    }
  }
  
  const seirekiMatch = value.match(/(\d{4})/);
  if (seirekiMatch) {
    return parseInt(seirekiMatch[1], 10);
  }
  
  return null;
}

export function parseTransactionDate(period: string | undefined): string | null {
  if (!period) return null;
  
  const match = period.match(/(\d{4})年第(\d)四半期/);
  if (match) {
    const year = match[1];
    const quarter = parseInt(match[2], 10);
    const month = (quarter - 1) * 3 + 1;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }
  
  return null;
}

export function mapTransactionRecord(
  record: ReinfolibTransactionRecord,
  rawCaptureId?: string
): InsertReinfolibTransaction {
  const sourceKey = generateSourceKey(
    record.Prefecture,
    record.Municipality,
    record.DistrictName,
    record.Period,
    record.TradePrice,
    record.Area,
    record.TotalFloorArea
  );
  
  return {
    prefecture: record.Prefecture || null,
    municipality: record.Municipality || null,
    district: record.DistrictName || null,
    lat: null,
    lon: null,
    transactionDate: parseTransactionDate(record.Period),
    priceTotalJpy: parseJapaneseNumber(record.TradePrice),
    unitPriceJpy: parseJapaneseNumber(record.PricePerUnit),
    landAreaM2: parseArea(record.Area),
    buildingAreaM2: parseArea(record.TotalFloorArea),
    buildingYear: parseBuildingYear(record.BuildingYear),
    propertyType: record.Type || null,
    sourceKey,
    rawCaptureId: rawCaptureId || null,
  };
}

export function mapTransactionRecords(
  records: ReinfolibTransactionRecord[],
  rawCaptureId?: string
): InsertReinfolibTransaction[] {
  return records.map(record => mapTransactionRecord(record, rawCaptureId));
}
