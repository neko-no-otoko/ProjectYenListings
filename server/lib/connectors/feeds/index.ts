import type { SourceFeed } from "@shared/schema";
import type { FeedConnector, ConnectorResult } from "./types";
import { CkanInstanceConnector } from "./ckanInstance";
import { ArcgisLayerConnector } from "./arcgisLayer";
import { SocrataDatasetConnector } from "./socrataDataset";
import { HttpFileConnector } from "./httpFile";

const connectors: Record<string, FeedConnector> = {
  ckan_instance: new CkanInstanceConnector(),
  arcgis_layer: new ArcgisLayerConnector(),
  socrata_dataset: new SocrataDatasetConnector(),
  http_file: new HttpFileConnector(),
};

export function getConnector(feedType: string): FeedConnector | null {
  return connectors[feedType] || null;
}

export async function fetchFeed(feed: SourceFeed): Promise<ConnectorResult> {
  const connector = getConnector(feed.type);
  if (!connector) {
    return { records: [], fetchedCount: 0, error: `Unknown feed type: ${feed.type}` };
  }
  return connector.fetch(feed);
}

export async function previewFeed(feed: SourceFeed, limit = 3): Promise<ConnectorResult> {
  const connector = getConnector(feed.type);
  if (!connector) {
    return { records: [], fetchedCount: 0, error: `Unknown feed type: ${feed.type}` };
  }
  return connector.preview(feed, limit);
}

export function mapFeedTypeToSourceType(feedType: string): "ckan_akiya" | "arcgis_akiya" | "socrata_akiya" | "feed_import" | "manual" {
  switch (feedType) {
    case "ckan_instance":
      return "ckan_akiya";
    case "arcgis_layer":
      return "arcgis_akiya";
    case "socrata_dataset":
      return "socrata_akiya";
    case "http_file":
      return "feed_import";
    default:
      return "manual";
  }
}

export * from "./types";
