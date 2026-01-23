import type { SourceFeed, CkanInstanceConfig } from "@shared/schema";
import type { FeedConnector, ConnectorResult, NormalizedRecord } from "./types";
import { isCkanInstanceConfig } from "./types";

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
    return this.fetchRecords(feed.config, feed.id);
  }

  async preview(feed: SourceFeed, limit = 3): Promise<ConnectorResult> {
    if (!isCkanInstanceConfig(feed.config)) {
      return { records: [], fetchedCount: 0, error: "Invalid CKAN config" };
    }
    const config = { ...feed.config, rows: limit };
    return this.fetchRecords(config, feed.id);
  }

  private async fetchRecords(config: CkanInstanceConfig, feedId: string): Promise<ConnectorResult> {
    const records: NormalizedRecord[] = [];
    const query = config.query || "空き家";
    const rows = config.rows || 100;

    try {
      const searchUrl = `${config.baseUrl}/action/package_search?q=${encodeURIComponent(query)}&rows=${rows}`;
      const response = await fetchWithRateLimit(searchUrl);

      if (!response.ok) {
        return { records: [], fetchedCount: 0, error: `CKAN API error: ${response.status}` };
      }

      const data = await response.json() as {
        success: boolean;
        result?: {
          results?: Array<{
            id: string;
            title?: string;
            name?: string;
            notes?: string;
            resources?: Array<{
              id: string;
              url?: string;
              format?: string;
            }>;
          }>;
        };
      };

      if (!data.success || !data.result?.results) {
        return { records: [], fetchedCount: 0, error: "CKAN search failed" };
      }

      for (const pkg of data.result.results) {
        const record: NormalizedRecord = {
          sourceKey: `${feedId}:${pkg.id}`,
          sourceUrl: pkg.resources?.[0]?.url,
          titleJp: pkg.title || pkg.name,
          descJp: pkg.notes,
        };
        records.push(record);
      }

      return {
        records,
        fetchedCount: records.length,
        rawPayload: data,
      };
    } catch (error) {
      return {
        records: [],
        fetchedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
