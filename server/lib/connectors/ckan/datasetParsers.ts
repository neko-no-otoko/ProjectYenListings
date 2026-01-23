import { AKIYA_FIELD_PATTERNS, type AkiyaFieldMapping } from "../types";

export interface ParsedRow {
  raw: Record<string, string>;
  mapped: {
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
  };
  confidence: number;
}

export interface ParseResult {
  success: boolean;
  rows?: ParsedRow[];
  headers?: string[];
  encoding?: string;
  error?: string;
  schemaRecognized: boolean;
  fieldMapping?: Record<string, string>;
}

function detectEncoding(buffer: Buffer): string {
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return "utf-8-bom";
  }
  
  const shiftJisIndicators = [0x82, 0x83, 0x84, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F];
  let shiftJisScore = 0;
  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    if (shiftJisIndicators.includes(buffer[i])) {
      shiftJisScore++;
    }
  }
  
  if (shiftJisScore > 5) {
    return "shift_jis";
  }
  
  return "utf-8";
}

function decodeBuffer(buffer: Buffer, encoding: string): string {
  try {
    if (encoding === "shift_jis") {
      const decoder = new TextDecoder("shift_jis");
      return decoder.decode(buffer);
    }
    if (encoding === "utf-8-bom") {
      return buffer.slice(3).toString("utf-8");
    }
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("utf-8");
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function findFieldMapping(headers: string[]): { mapping: Record<string, string>; recognized: boolean } {
  const mapping: Record<string, string> = {};
  let matchCount = 0;
  
  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [fieldName, patterns] of Object.entries(AKIYA_FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedHeader.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(normalizedHeader)) {
          mapping[header] = fieldName;
          matchCount++;
          break;
        }
      }
      if (mapping[header]) break;
    }
  }
  
  const keyFields = ["address", "price", "ldk", "landArea"];
  const hasKeyFields = keyFields.some(field => Object.values(mapping).includes(field));
  
  return {
    mapping,
    recognized: matchCount >= 2 && hasKeyFields,
  };
}

function parsePrice(value: string): number | undefined {
  if (!value) return undefined;
  
  const cleaned = value.replace(/[,，、円¥￥\s]/g, "");
  
  if (cleaned.includes("万")) {
    const num = parseFloat(cleaned.replace("万", ""));
    return isNaN(num) ? undefined : num * 10000;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function parseArea(value: string): number | undefined {
  if (!value) return undefined;
  
  const cleaned = value.replace(/[,，㎡m²平米坪\s]/g, "");
  
  if (value.includes("坪")) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num * 3.30579;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function parseYear(value: string): number | undefined {
  if (!value) return undefined;
  
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
  
  return undefined;
}

function parseCoordinate(value: string): number | undefined {
  if (!value) return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

export function parseCSV(buffer: Buffer): ParseResult {
  try {
    const encoding = detectEncoding(buffer);
    const content = decodeBuffer(buffer, encoding);
    
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, error: "Not enough rows", schemaRecognized: false };
    }
    
    const headers = parseCSVLine(lines[0]);
    const { mapping, recognized } = findFieldMapping(headers);
    
    const rows: ParsedRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;
      
      const raw: Record<string, string> = {};
      headers.forEach((header, idx) => {
        raw[header] = values[idx] ?? "";
      });
      
      const mapped: ParsedRow["mapped"] = {};
      let fieldsFound = 0;
      
      for (const [header, value] of Object.entries(raw)) {
        const fieldName = mapping[header];
        if (!fieldName || !value) continue;
        
        switch (fieldName) {
          case "address":
            mapped.address = value;
            fieldsFound++;
            break;
          case "price":
            mapped.price = parsePrice(value);
            if (mapped.price !== undefined) fieldsFound++;
            break;
          case "ldk":
            mapped.ldk = value;
            fieldsFound++;
            break;
          case "landArea":
            mapped.landAreaM2 = parseArea(value);
            if (mapped.landAreaM2 !== undefined) fieldsFound++;
            break;
          case "buildingArea":
            mapped.buildingAreaM2 = parseArea(value);
            if (mapped.buildingAreaM2 !== undefined) fieldsFound++;
            break;
          case "yearBuilt":
            mapped.yearBuilt = parseYear(value);
            if (mapped.yearBuilt !== undefined) fieldsFound++;
            break;
          case "url":
            mapped.url = value.startsWith("http") ? value : undefined;
            if (mapped.url) fieldsFound++;
            break;
          case "title":
            mapped.title = value;
            fieldsFound++;
            break;
          case "description":
            mapped.description = value;
            fieldsFound++;
            break;
          case "lat":
            mapped.lat = parseCoordinate(value);
            if (mapped.lat !== undefined) fieldsFound++;
            break;
          case "lon":
            mapped.lon = parseCoordinate(value);
            if (mapped.lon !== undefined) fieldsFound++;
            break;
          case "prefecture":
            mapped.prefecture = value;
            fieldsFound++;
            break;
          case "municipality":
            mapped.municipality = value;
            fieldsFound++;
            break;
        }
      }
      
      const confidence = Math.min(1, fieldsFound / 5);
      
      rows.push({ raw, mapped, confidence });
    }
    
    return {
      success: true,
      rows,
      headers,
      encoding,
      schemaRecognized: recognized,
      fieldMapping: mapping,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      schemaRecognized: false,
    };
  }
}

export function parseJSON(buffer: Buffer): ParseResult {
  try {
    const content = buffer.toString("utf-8");
    const data = JSON.parse(content);
    
    let records: Record<string, unknown>[];
    
    if (Array.isArray(data)) {
      records = data;
    } else if (data.records && Array.isArray(data.records)) {
      records = data.records;
    } else if (data.results && Array.isArray(data.results)) {
      records = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      records = data.data;
    } else {
      return { success: false, error: "Could not find array in JSON", schemaRecognized: false };
    }
    
    if (records.length === 0) {
      return { success: false, error: "Empty records array", schemaRecognized: false };
    }
    
    const headers = Object.keys(records[0]);
    const { mapping, recognized } = findFieldMapping(headers);
    
    const rows: ParsedRow[] = records.map(record => {
      const raw: Record<string, string> = {};
      for (const [key, value] of Object.entries(record)) {
        raw[key] = String(value ?? "");
      }
      
      const mapped: ParsedRow["mapped"] = {};
      let fieldsFound = 0;
      
      for (const [header, value] of Object.entries(raw)) {
        const fieldName = mapping[header];
        if (!fieldName || !value) continue;
        
        switch (fieldName) {
          case "address":
            mapped.address = value;
            fieldsFound++;
            break;
          case "price":
            mapped.price = parsePrice(value);
            if (mapped.price !== undefined) fieldsFound++;
            break;
          case "ldk":
            mapped.ldk = value;
            fieldsFound++;
            break;
          case "landArea":
            mapped.landAreaM2 = parseArea(value);
            if (mapped.landAreaM2 !== undefined) fieldsFound++;
            break;
          case "buildingArea":
            mapped.buildingAreaM2 = parseArea(value);
            if (mapped.buildingAreaM2 !== undefined) fieldsFound++;
            break;
          case "yearBuilt":
            mapped.yearBuilt = parseYear(value);
            if (mapped.yearBuilt !== undefined) fieldsFound++;
            break;
          case "url":
            mapped.url = value.startsWith("http") ? value : undefined;
            if (mapped.url) fieldsFound++;
            break;
          case "title":
            mapped.title = value;
            fieldsFound++;
            break;
          case "description":
            mapped.description = value;
            fieldsFound++;
            break;
          case "lat":
            mapped.lat = parseCoordinate(value);
            if (mapped.lat !== undefined) fieldsFound++;
            break;
          case "lon":
            mapped.lon = parseCoordinate(value);
            if (mapped.lon !== undefined) fieldsFound++;
            break;
          case "prefecture":
            mapped.prefecture = value;
            fieldsFound++;
            break;
          case "municipality":
            mapped.municipality = value;
            fieldsFound++;
            break;
        }
      }
      
      const confidence = Math.min(1, fieldsFound / 5);
      
      return { raw, mapped, confidence };
    });
    
    return {
      success: true,
      rows,
      headers,
      schemaRecognized: recognized,
      fieldMapping: mapping,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      schemaRecognized: false,
    };
  }
}

export function parseResource(buffer: Buffer, format: string): ParseResult {
  const normalizedFormat = format.toLowerCase();
  
  if (normalizedFormat === "csv" || normalizedFormat.includes("csv")) {
    return parseCSV(buffer);
  }
  
  if (normalizedFormat === "json" || normalizedFormat.includes("json")) {
    return parseJSON(buffer);
  }
  
  try {
    return parseJSON(buffer);
  } catch {
    try {
      return parseCSV(buffer);
    } catch {
      return { success: false, error: `Unsupported format: ${format}`, schemaRecognized: false };
    }
  }
}
