import type { SourceFeed, CkanInstanceConfig } from "@shared/schema";
import type { FeedConnector, ConnectorResult, NormalizedRecord } from "./types";
import { isCkanInstanceConfig, generateStableSourceKey } from "./types";
import { parse as csvParse } from "csv-parse/sync";

interface CkanResource {
  id: string;
  url?: string;
  format?: string;
  name?: string;
}

interface CkanPackage {
  id: string;
  title?: string;
  name?: string;
  notes?: string;
  resources?: CkanResource[];
}

interface CkanSearchResponse {
  success: boolean;
  result?: {
    results?: CkanPackage[];
  };
}

async function fetchWithRateLimit(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent": "YenLow/1.0 (Real Estate Aggregator)",
    },
  });
}

export class CkanInstanceConnector implements FeedConnector {
  async fetch(feed: SourceFeed): Promise<ConnectorResult> {
    if (!isCkanInstanceConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid CKAN config" };
    }
    return this.fetchRecords(feed.config, feed.id, false);
  }

  async preview(feed: SourceFeed, limit = 3): Promise<ConnectorResult> {
    if (!isCkanInstanceConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid CKAN config" };
    }
    return this.fetchRecords(feed.config, feed.id, true, limit);
  }

  private async fetchRecords(
    config: CkanInstanceConfig, 
    feedId: string,
    isPreview = false,
    previewLimit = 3
  ): Promise<ConnectorResult> {
    const allRecords: NormalizedRecord[] = [];
    const query = config.query || "空き家";
    const rows = config.rows || 100;
    const errors: string[] = [];

    try {
      const baseUrl = config.baseUrl.replace(/\/$/, '');
      const apiPath = baseUrl.includes('/api/3') ? '/action/package_search' : '/api/3/action/package_search';
      const searchUrl = `${baseUrl}${apiPath}?q=${encodeURIComponent(query)}&rows=${rows}`;
      
      const response = await fetchWithRateLimit(searchUrl);

      if (!response.ok) {
        return { records: [], fetchedCount: 0, error: `CKAN API error: ${response.status}` };
      }

      const data = await response.json() as CkanSearchResponse;

      if (!data.success || !data.result?.results) {
        return { records: [], fetchedCount: 0, error: "CKAN search failed" };
      }

      const packages = data.result.results;
      console.log(`[CKAN] Found ${packages.length} datasets for query "${query}"`);

      for (const pkg of packages) {
        if (isPreview && allRecords.length >= previewLimit) break;

        const csvJsonResources = (pkg.resources || []).filter(r => {
          const format = (r.format || '').toLowerCase();
          const url = (r.url || '').toLowerCase();
          return format === 'csv' || format === 'json' || 
                 url.endsWith('.csv') || url.endsWith('.json');
        });

        for (const resource of csvJsonResources) {
          if (isPreview && allRecords.length >= previewLimit) break;
          if (!resource.url) continue;

          try {
            const resourceRecords = await this.fetchAndParseResource(
              resource, 
              feedId, 
              pkg,
              config.fieldMap
            );
            
            if (resourceRecords.length > 0) {
              console.log(`[CKAN] Parsed ${resourceRecords.length} records from ${resource.url}`);
              allRecords.push(...resourceRecords);
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`Resource ${resource.id}: ${errorMsg}`);
          }
        }
      }

      return {
        records: isPreview ? allRecords.slice(0, previewLimit) : allRecords,
        fetchedCount: allRecords.length,
        rawPayload: { packages: packages.length, resources: allRecords.length },
        error: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
      };
    } catch (error) {
      return {
        records: [],
        fetchedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async fetchAndParseResource(
    resource: CkanResource,
    feedId: string,
    pkg: CkanPackage,
    fieldMap?: Record<string, string>
  ): Promise<NormalizedRecord[]> {
    const response = await fetchWithRateLimit(resource.url!);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const url = resource.url!.toLowerCase();
    const format = (resource.format || '').toLowerCase();
    
    let rows: Record<string, unknown>[];

    if (format === 'json' || contentType.includes('json') || url.endsWith('.json')) {
      const jsonData = await response.json();
      rows = this.normalizeJsonData(jsonData);
    } else {
      const text = await response.text();
      rows = this.parseCsv(text);
    }

    if (rows.length === 0) return [];

    const detectedFieldMap = fieldMap || this.autoDetectFieldMap(rows[0]);
    
    return rows.map((row, idx) => 
      this.mapRow(row, detectedFieldMap, feedId, resource.id, pkg, idx)
    );
  }

  private normalizeJsonData(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const key of ['data', 'results', 'items', 'records', 'features']) {
        if (Array.isArray(obj[key])) {
          return obj[key] as Record<string, unknown>[];
        }
      }
    }
    return [];
  }

  private parseCsv(text: string): Record<string, unknown>[] {
    try {
      return csvParse(text, {
        columns: true,
        skip_empty_lines: true,
        relaxColumnCount: true,
        bom: true,
      });
    } catch {
      return [];
    }
  }

  private autoDetectFieldMap(sample: Record<string, unknown>): Record<string, string> {
    const fieldMap: Record<string, string> = {};
    const keys = Object.keys(sample);

    const patterns: Record<string, RegExp[]> = {
      sourceKey: [/^id$/i, /^no$/i, /^番号/, /^物件.*番号/, /^管理.*番号/],
      titleJp: [/^title$/i, /^name$/i, /^物件名/, /^名称/, /^タイトル/],
      addressJp: [/address/i, /所在地/, /住所/, /^所在$/, /連結表記/],
      priceJpy: [/price/i, /金額/, /価格/, /売買価格/, /賃料/],
      lat: [/^lat/i, /緯度/, /latitude/i, /^y$/i],
      lon: [/^lon/i, /^lng/i, /経度/, /longitude/i, /^x$/i],
      landAreaM2: [/land.*area/i, /土地.*面積/, /敷地面積/, /宅地面積/],
      buildingAreaM2: [/building.*area/i, /建物.*面積/, /延床面積/, /床面積/],
      yearBuilt: [/year.*built/i, /築年/, /建築年/, /建設年/],
      sourceUrl: [/^url$/i, /リンク/, /詳細.*url/, /ページ/],
    };

    for (const [field, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        const match = keys.find(k => regex.test(k));
        if (match) {
          fieldMap[field] = match;
          break;
        }
      }
    }

    return fieldMap;
  }

  private mapRow(
    row: Record<string, unknown>,
    fieldMap: Record<string, string>,
    feedId: string,
    resourceId: string,
    pkg: CkanPackage,
    rowIndex: number
  ): NormalizedRecord {
    const getValue = (key: string): unknown => {
      const mappedField = fieldMap[key];
      return mappedField ? row[mappedField] : undefined;
    };

    const sourceKeyField = fieldMap.sourceKey;
    const sourceKeyValue = sourceKeyField ? row[sourceKeyField] : undefined;
    const sourceKey = sourceKeyValue 
      ? `${feedId}:${resourceId}:${sourceKeyValue}` 
      : generateStableSourceKey(`${feedId}:${resourceId}`, row);

    const parseNumber = (val: unknown): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const str = String(val).replace(/[,，円¥\s]/g, '');
      const num = parseFloat(str);
      return isNaN(num) ? undefined : num;
    };

    const titleJp = (getValue("titleJp") as string) || 
                    (getValue("addressJp") as string) || 
                    pkg.title || 
                    `物件 ${rowIndex + 1}`;

    return {
      sourceKey,
      titleJp,
      titleEn: getValue("titleEn") as string | undefined,
      addressJp: getValue("addressJp") as string | undefined,
      lat: parseNumber(getValue("lat")),
      lon: parseNumber(getValue("lon")),
      priceJpy: parseNumber(getValue("priceJpy")),
      landAreaM2: parseNumber(getValue("landAreaM2")),
      buildingAreaM2: parseNumber(getValue("buildingAreaM2")),
      yearBuilt: parseNumber(getValue("yearBuilt")),
      hasLand: getValue("hasLand") as boolean | undefined,
      sourceUrl: getValue("sourceUrl") as string | undefined,
    };
  }
}
