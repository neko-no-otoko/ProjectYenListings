import type { SourceFeed, HttpFileConfig } from "@shared/schema";
import type { FeedConnector, ConnectorResult, NormalizedRecord } from "./types";
import { isHttpFileConfig } from "./types";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export class HttpFileConnector implements FeedConnector {
  async fetch(feed: SourceFeed): Promise<ConnectorResult> {
    if (!isHttpFileConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid HTTP file config" };
    }
    return this.fetchFile(feed.config, feed.id);
  }

  async preview(feed: SourceFeed, limit = 3): Promise<ConnectorResult> {
    const result = await this.fetch(feed);
    if (result.error) return result;
    return {
      records: result.records.slice(0, limit),
      fetchedCount: limit,
      rawPayload: result.rawPayload,
    };
  }

  private async fetchFile(config: HttpFileConfig, feedId: string): Promise<ConnectorResult> {
    try {
      const response = await fetch(config.url, {
        headers: { "User-Agent": "YenLow/1.0" },
      });

      if (!response.ok) {
        return { records: [], fetchedCount: 0, error: `HTTP error: ${response.status}` };
      }

      const contentType = response.headers.get("content-type") || "";
      let format = config.format;

      if (format === "auto") {
        if (contentType.includes("json") || config.url.endsWith(".json")) {
          format = "json";
        } else if (contentType.includes("xlsx") || config.url.endsWith(".xlsx")) {
          format = "xlsx";
        } else {
          format = "csv";
        }
      }

      let rows: Record<string, unknown>[];

      if (format === "json") {
        rows = await response.json() as Record<string, unknown>[];
        if (!Array.isArray(rows)) {
          const obj = rows as Record<string, unknown>;
          rows = (obj.data || obj.results || obj.items || [rows]) as Record<string, unknown>[];
        }
      } else if (format === "xlsx") {
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
      } else {
        const text = await response.text();
        const encoding = this.detectEncoding(text);
        rows = this.parseCsv(text, encoding);
      }

      const records = rows.map((row) => this.mapRow(row, config.fieldMap, feedId));

      return { records, fetchedCount: records.length, rawPayload: rows };
    } catch (error) {
      return {
        records: [],
        fetchedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private detectEncoding(_text: string): BufferEncoding {
    return "utf-8";
  }

  private parseCsv(text: string, _encoding: BufferEncoding): Record<string, unknown>[] {
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

  private mapRow(
    row: Record<string, unknown>,
    fieldMap: Record<string, string>,
    feedId: string
  ): NormalizedRecord {
    const getValue = (key: string): unknown => {
      const mappedField = fieldMap[key];
      return mappedField ? row[mappedField] : undefined;
    };

    const sourceKeyField = fieldMap.sourceKey || "id";
    const sourceKeyValue = row[sourceKeyField] ?? String(Math.random());

    return {
      sourceKey: `${feedId}:${sourceKeyValue}`,
      titleJp: getValue("titleJp") as string | undefined,
      titleEn: getValue("titleEn") as string | undefined,
      addressJp: getValue("addressJp") as string | undefined,
      lat: parseFloat(String(getValue("lat"))) || undefined,
      lon: parseFloat(String(getValue("lon"))) || undefined,
      priceJpy: parseInt(String(getValue("priceJpy")), 10) || undefined,
      landAreaM2: parseFloat(String(getValue("landAreaM2"))) || undefined,
      buildingAreaM2: parseFloat(String(getValue("buildingAreaM2"))) || undefined,
      yearBuilt: parseInt(String(getValue("yearBuilt")), 10) || undefined,
      hasLand: getValue("hasLand") as boolean | undefined,
    };
  }
}
