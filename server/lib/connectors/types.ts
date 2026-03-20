import type { InsertListingVariant, InsertPropertyEntity, InsertRawCapture, InsertReinfolibTransaction, InsertCkanDataset, InsertCkanResource } from "@shared/schema";

export type SourceType = "reinfolib_txn" | "ckan_akiya" | "lifull" | "athome" | "manual" | "suumo" | "yahoo_realestate" | "homes";

export interface ConnectorConfig {
  name: string;
  enabled: boolean;
  rateLimitPerMin: number;
  lastRunAt?: Date;
  lastError?: string;
}

export interface ConnectorStatus {
  name: string;
  configured: boolean;
  enabled: boolean;
  lastRunAt?: Date;
  lastError?: string;
  itemsFetched: number;
  itemsUpserted: number;
}

export interface FetchResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
  rawCapture?: InsertRawCapture;
  metadata?: Record<string, unknown>;
}

export interface NormalizedListing {
  variant: InsertListingVariant;
  propertyEntity?: InsertPropertyEntity;
  rawData: unknown;
}

export interface NormalizedTransaction {
  transaction: InsertReinfolibTransaction;
  rawData: unknown;
}

export interface Connector {
  readonly name: string;
  readonly sourceType: SourceType;
  
  getStatus(): Promise<ConnectorStatus>;
  isConfigured(): boolean;
  isEnabled(): boolean;
  
  fetch?(params?: Record<string, unknown>): Promise<FetchResult<unknown>>;
  normalize?(data: unknown[]): Promise<NormalizedListing[] | NormalizedTransaction[]>;
}

export interface ListingConnector extends Connector {
  fetch(params?: Record<string, unknown>): Promise<FetchResult<unknown>>;
  normalize(data: unknown[]): Promise<NormalizedListing[]>;
}

export interface TransactionConnector extends Connector {
  fetch(params?: Record<string, unknown>): Promise<FetchResult<unknown>>;
  normalize(data: unknown[]): Promise<NormalizedTransaction[]>;
}

export interface CkanDiscoveryConnector extends Connector {
  discoverDatasets(keywords: string[]): Promise<FetchResult<InsertCkanDataset>>;
  discoverResources(datasetId: string): Promise<FetchResult<InsertCkanResource>>;
}

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  rateLimitPerMin: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeout: number;
}

export interface RateLimiter {
  acquire(): Promise<void>;
  release(): void;
}

export interface JobContext {
  connectorName: string;
  jobType: string;
  logId: string;
  startedAt: Date;
}

export interface JobResult {
  success: boolean;
  itemsFetched: number;
  itemsUpserted: number;
  itemsSkipped: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduledJob {
  name: string;
  cronExpression: string;
  handler: () => Promise<JobResult>;
  enabled: boolean;
}

export interface CkanPackageSearchResult {
  count: number;
  results: CkanPackage[];
}

export interface CkanPackage {
  id: string;
  name: string;
  title: string;
  organization?: { name: string; title: string };
  license_id?: string;
  license_title?: string;
  tags?: Array<{ name: string }>;
  notes?: string;
  resources?: CkanResourceMeta[];
  metadata_created?: string;
  metadata_modified?: string;
  extras?: Array<{ key: string; value: string }>;
}

export interface CkanResourceMeta {
  id: string;
  name: string;
  format: string;
  url: string;
  description?: string;
  created?: string;
  last_modified?: string;
  size?: number;
}

export interface AkiyaFieldMapping {
  address?: string[];
  price?: string[];
  ldk?: string[];
  landArea?: string[];
  buildingArea?: string[];
  yearBuilt?: string[];
  url?: string[];
  title?: string[];
  description?: string[];
  lat?: string[];
  lon?: string[];
  prefecture?: string[];
  municipality?: string[];
}

export const AKIYA_FIELD_PATTERNS: AkiyaFieldMapping = {
  address: ["住所", "所在地", "物件所在地", "address", "location"],
  price: ["価格", "売価", "販売価格", "希望価格", "price"],
  ldk: ["間取り", "間取", "ldk", "layout"],
  landArea: ["土地面積", "敷地面積", "land_area", "土地"],
  buildingArea: ["延床面積", "建物面積", "延べ面積", "床面積", "building_area"],
  yearBuilt: ["建築年", "築年", "築年数", "year_built", "建築年月"],
  url: ["url", "URL", "リンク", "詳細URL", "物件URL"],
  title: ["物件名", "名称", "title", "name"],
  description: ["備考", "説明", "概要", "description", "notes"],
  lat: ["緯度", "lat", "latitude"],
  lon: ["経度", "lon", "lng", "longitude"],
  prefecture: ["都道府県", "prefecture"],
  municipality: ["市区町村", "市町村", "municipality", "city"],
};
