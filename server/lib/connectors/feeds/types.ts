import type { SourceFeed, CkanInstanceConfig, ArcgisLayerConfig, SocrataDatasetConfig, HttpFileConfig } from "@shared/schema";
import crypto from "crypto";

export interface NormalizedRecord {
  sourceKey: string;
  sourceUrl?: string;
  titleJp?: string;
  titleEn?: string;
  descJp?: string;
  descEn?: string;
  addressJp?: string;
  lat?: number;
  lon?: number;
  priceJpy?: number;
  ldk?: string;
  landAreaM2?: number;
  buildingAreaM2?: number;
  yearBuilt?: number;
  hasLand?: boolean;
  photos?: Array<{ url: string; caption?: string; attribution?: string }>;
}

export function generateStableSourceKey(feedId: string, row: Record<string, unknown>): string {
  const content = JSON.stringify(row);
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `${feedId}:${hash}`;
}

export interface ConnectorResult {
  records: NormalizedRecord[];
  rawPayload?: unknown;
  fetchedCount: number;
  error?: string;
}

export interface FeedConnector {
  fetch(feed: SourceFeed): Promise<ConnectorResult>;
  preview(feed: SourceFeed, limit?: number): Promise<ConnectorResult>;
}

export function isCkanInstanceConfig(config: unknown): config is CkanInstanceConfig {
  return typeof config === "object" && config !== null && "baseUrl" in config;
}

export function isArcgisLayerConfig(config: unknown): config is ArcgisLayerConfig {
  return typeof config === "object" && config !== null && "layerUrl" in config;
}

export function isSocrataDatasetConfig(config: unknown): config is SocrataDatasetConfig {
  return typeof config === "object" && config !== null && "domain" in config && "resourceId" in config;
}

export function isHttpFileConfig(config: unknown): config is HttpFileConfig {
  return typeof config === "object" && config !== null && "url" in config && !("layerUrl" in config) && !("domain" in config) && !("baseUrl" in config);
}
