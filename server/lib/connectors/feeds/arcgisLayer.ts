import type { SourceFeed, ArcgisLayerConfig } from "@shared/schema";
import type { FeedConnector, ConnectorResult, NormalizedRecord } from "./types";
import { isArcgisLayerConfig, generateStableSourceKey } from "./types";

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: {
    x?: number;
    y?: number;
  };
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: { message: string };
}

export class ArcgisLayerConnector implements FeedConnector {
  async fetch(feed: SourceFeed): Promise<ConnectorResult> {
    if (!isArcgisLayerConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid ArcGIS config" };
    }
    return this.fetchAllPages(feed.config, feed.id);
  }

  async preview(feed: SourceFeed, limit = 3): Promise<ConnectorResult> {
    if (!isArcgisLayerConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid ArcGIS config" };
    }
    return this.fetchPage(feed.config, feed.id, 0, limit);
  }

  private async fetchAllPages(config: ArcgisLayerConfig, feedId: string): Promise<ConnectorResult> {
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
    config: ArcgisLayerConfig,
    feedId: string,
    offset: number,
    limit: number
  ): Promise<ConnectorResult> {
    const where = encodeURIComponent(config.where || "1=1");
    const url = `${config.layerUrl}/query?where=${where}&outFields=*&f=json&resultOffset=${offset}&resultRecordCount=${limit}`;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "YenLow/1.0" },
      });

      if (!response.ok) {
        return { records: [], fetchedCount: 0, error: `ArcGIS error: ${response.status}` };
      }

      const data = await response.json() as ArcGISResponse;
      if (data.error) {
        return { records: [], fetchedCount: 0, error: data.error.message };
      }

      const records = (data.features || []).map((feature) =>
        this.mapFeature(feature, config.fieldMap, feedId)
      );

      return { records, fetchedCount: records.length, rawPayload: data };
    } catch (error) {
      return {
        records: [],
        fetchedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private mapFeature(
    feature: ArcGISFeature,
    fieldMap: Record<string, string>,
    feedId: string
  ): NormalizedRecord {
    const attrs = feature.attributes;
    const getValue = (key: string): unknown => {
      const mappedField = fieldMap[key];
      return mappedField ? attrs[mappedField] : undefined;
    };

    const sourceKeyField = fieldMap.sourceKey || "OBJECTID";
    const sourceKeyValue = attrs[sourceKeyField] ?? attrs["OBJECTID"];
    const sourceKey = sourceKeyValue 
      ? `${feedId}:${sourceKeyValue}` 
      : generateStableSourceKey(feedId, attrs);

    return {
      sourceKey,
      titleJp: getValue("titleJp") as string | undefined,
      titleEn: getValue("titleEn") as string | undefined,
      addressJp: getValue("addressJp") as string | undefined,
      lat: (getValue("lat") as number) ?? feature.geometry?.y,
      lon: (getValue("lon") as number) ?? feature.geometry?.x,
      priceJpy: getValue("priceJpy") as number | undefined,
      landAreaM2: getValue("landAreaM2") as number | undefined,
      buildingAreaM2: getValue("buildingAreaM2") as number | undefined,
      yearBuilt: getValue("yearBuilt") as number | undefined,
      hasLand: getValue("hasLand") as boolean | undefined,
    };
  }
}
