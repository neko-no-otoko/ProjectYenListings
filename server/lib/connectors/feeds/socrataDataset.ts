import type { SourceFeed, SocrataDatasetConfig } from "@shared/schema";
import type { FeedConnector, ConnectorResult, NormalizedRecord } from "./types";
import { isSocrataDatasetConfig, generateStableSourceKey } from "./types";

export class SocrataDatasetConnector implements FeedConnector {
  async fetch(feed: SourceFeed): Promise<ConnectorResult> {
    if (!isSocrataDatasetConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid Socrata config" };
    }
    return this.fetchAllPages(feed.config, feed.id);
  }

  async preview(feed: SourceFeed, limit = 3): Promise<ConnectorResult> {
    if (!isSocrataDatasetConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid Socrata config" };
    }
    return this.fetchPage(feed.config, feed.id, 0, limit);
  }

  private async fetchAllPages(config: SocrataDatasetConfig, feedId: string): Promise<ConnectorResult> {
    const allRecords: NormalizedRecord[] = [];
    let offset = 0;
    const pageSize = config.pageSize || 500;
    let hasMore = true;

    while (hasMore) {
      const result = await this.fetchPage(config, feedId, offset, pageSize);
      if (result.error) {
        return { records: allRecords, fetchedCount: allRecords.length, error: result.error };
      }
      allRecords.push(...result.records);
      offset += pageSize;
      hasMore = result.records.length === pageSize;
    }

    return { records: allRecords, fetchedCount: allRecords.length };
  }

  private async fetchPage(
    config: SocrataDatasetConfig,
    feedId: string,
    offset: number,
    limit: number
  ): Promise<ConnectorResult> {
    let url = `https://${config.domain}/resource/${config.resourceId}.json?$limit=${limit}&$offset=${offset}`;
    if (config.where) {
      url += `&$where=${encodeURIComponent(config.where)}`;
    }

    const headers: Record<string, string> = { "User-Agent": "YenLow/1.0" };
    if (config.appTokenEnv) {
      const token = process.env[config.appTokenEnv];
      if (token) {
        headers["X-App-Token"] = token;
      }
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        return { records: [], fetchedCount: 0, error: `Socrata error: ${response.status}` };
      }

      const data = await response.json() as Record<string, unknown>[];
      const records = data.map((row) => this.mapRow(row, config.fieldMap, feedId));

      return { records, fetchedCount: records.length, rawPayload: data };
    } catch (error) {
      return {
        records: [],
        fetchedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
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

    const sourceKeyField = fieldMap.sourceKey || ":id";
    const sourceKeyValue = row[sourceKeyField] ?? row[":id"];
    const sourceKey = sourceKeyValue 
      ? `${feedId}:${sourceKeyValue}` 
      : generateStableSourceKey(feedId, row);

    return {
      sourceKey,
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
