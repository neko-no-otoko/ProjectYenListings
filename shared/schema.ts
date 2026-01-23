import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb, pgEnum, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const priceTypeEnum = pgEnum("price_type", ["transfer_fee", "purchase_price", "unknown"]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "inactive", "delisted", "unknown"]);
export const sourceTypeEnum = pgEnum("source_type", ["reinfolib_txn", "ckan_akiya", "lifull", "athome", "manual"]);
export const translateStatusEnum = pgEnum("translate_status", ["pending", "completed", "failed", "skipped"]);
export const contentTypeEnum = pgEnum("content_type", ["json", "csv", "xlsx", "xml", "unknown"]);
export const datasetStatusEnum = pgEnum("dataset_status", ["active", "review_required", "denied", "inactive"]);

export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  crawlPolicyJson: jsonb("crawl_policy_json"),
  rateLimitPerMin: integer("rate_limit_per_min").default(10),
  notes: text("notes"),
});

export const airports = pgTable("airports", {
  iata: varchar("iata", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  country: varchar("country", { length: 2 }).default("JP"),
  isMajor: boolean("is_major").default(false),
});

export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  primaryVariantId: varchar("primary_variant_id"),
  sourceId: varchar("source_id").references(() => sources.id),
  sourceUrl: text("source_url"),
  sourceListingId: text("source_listing_id"),
  titleEn: text("title_en").notNull(),
  titleOriginal: text("title_original"),
  descriptionEn: text("description_en"),
  descriptionOriginal: text("description_original"),
  prefecture: text("prefecture"),
  municipality: text("municipality"),
  locality: text("locality"),
  island: text("island"),
  addressOriginal: text("address_original"),
  addressEn: text("address_en"),
  lat: real("lat"),
  lon: real("lon"),
  nearestAirportIata: varchar("nearest_airport_iata", { length: 3 }),
  nearestAirportName: text("nearest_airport_name"),
  nearestAirportKm: real("nearest_airport_km"),
  priceJpy: integer("price_jpy").default(0),
  priceType: priceTypeEnum("price_type").default("unknown"),
  otherFeesJson: jsonb("other_fees_json"),
  ldk: text("ldk"),
  bedrooms: integer("bedrooms"),
  houseSqm: real("house_sqm"),
  landSqm: real("land_sqm"),
  hasLand: boolean("has_land"),
  yearBuilt: integer("year_built"),
  conditionScore: integer("condition_score").default(3),
  conditionReasonsEn: text("condition_reasons_en").array(),
  photos: jsonb("photos").$type<Array<{ url: string; caption?: string; attribution?: string }>>(),
  tags: text("tags").array(),
  listedAt: timestamp("listed_at"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  status: listingStatusEnum("status").default("active"),
});

export const propertyEntities = pgTable("property_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  canonicalLat: real("canonical_lat"),
  canonicalLon: real("canonical_lon"),
  canonicalAddressJp: text("canonical_address_jp"),
  canonicalAddressEn: text("canonical_address_en"),
  prefecture: text("prefecture"),
  municipality: text("municipality"),
  locality: text("locality"),
  confidenceScore: real("confidence_score").default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rawCaptures = pgTable("raw_captures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: sourceTypeEnum("source_type").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  contentType: contentTypeEnum("content_type").default("json"),
  sha256: varchar("sha256", { length: 64 }),
  storageRef: text("storage_ref"),
  inlineJson: jsonb("inline_json"),
  httpStatus: integer("http_status"),
  error: text("error"),
});

export const listingVariants = pgTable("listing_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyEntityId: varchar("property_entity_id").references(() => propertyEntities.id),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceKey: text("source_key").notNull().unique(),
  sourceUrl: text("source_url"),
  titleJp: text("title_jp"),
  titleEn: text("title_en"),
  descJp: text("desc_jp"),
  descEn: text("desc_en"),
  priceJpy: integer("price_jpy"),
  ldk: text("ldk"),
  landAreaM2: real("land_area_m2"),
  buildingAreaM2: real("building_area_m2"),
  yearBuilt: integer("year_built"),
  hasLand: boolean("has_land"),
  rawCaptureId: varchar("raw_capture_id").references(() => rawCaptures.id),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  status: listingStatusEnum("status").default("active"),
  translateStatus: translateStatusEnum("translate_status").default("pending"),
}, (table) => ({
  propertyEntityLastSeenIdx: index("listing_variants_property_entity_last_seen_idx")
    .on(table.propertyEntityId, table.lastSeenAt),
  statusLastSeenIdx: index("listing_variants_status_last_seen_idx")
    .on(table.status, table.lastSeenAt),
}));

export const ckanDatasets = pgTable("ckan_datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ckanInstanceBaseUrl: text("ckan_instance_base_url").notNull(),
  packageId: text("package_id").notNull(),
  packageName: text("package_name"),
  title: text("title"),
  organization: text("organization"),
  licenseId: text("license_id"),
  licenseTitle: text("license_title"),
  lastIndexedAt: timestamp("last_indexed_at").defaultNow(),
  tags: text("tags").array(),
  notes: text("notes"),
  status: datasetStatusEnum("status").default("active"),
}, (table) => ({
  uniquePackage: uniqueIndex("ckan_datasets_package_idx").on(table.ckanInstanceBaseUrl, table.packageId),
}));

export const ckanResources = pgTable("ckan_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ckanDatasetId: varchar("ckan_dataset_id").references(() => ckanDatasets.id).notNull(),
  resourceId: text("resource_id").notNull(),
  format: text("format"),
  downloadUrl: text("download_url"),
  schemaHint: jsonb("schema_hint"),
  lastFetchedAt: timestamp("last_fetched_at"),
  lastSha256: varchar("last_sha256", { length: 64 }),
  rowCount: integer("row_count"),
});

export const reinfolibTransactions = pgTable("reinfolib_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prefecture: text("prefecture"),
  municipality: text("municipality"),
  district: text("district"),
  lat: real("lat"),
  lon: real("lon"),
  transactionDate: date("transaction_date"),
  priceTotalJpy: integer("price_total_jpy"),
  unitPriceJpy: integer("unit_price_jpy"),
  landAreaM2: real("land_area_m2"),
  buildingAreaM2: real("building_area_m2"),
  buildingYear: integer("building_year"),
  propertyType: text("property_type"),
  sourceKey: text("source_key").notNull().unique(),
  rawCaptureId: varchar("raw_capture_id").references(() => rawCaptures.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partnerSourcesConfig = pgTable("partner_sources_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  configJson: jsonb("config_json"),
  lastRunAt: timestamp("last_run_at"),
  lastError: text("last_error"),
  itemsFetched: integer("items_fetched").default(0),
  itemsUpserted: integer("items_upserted").default(0),
});

export const translationCache = pgTable("translation_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: varchar("cache_key", { length: 64 }).notNull().unique(),
  provider: text("provider").notNull(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text"),
  sourceLang: varchar("source_lang", { length: 5 }).default("ja"),
  targetLang: varchar("target_lang", { length: 5 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
});

export const ingestionLogs = pgTable("ingestion_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectorName: text("connector_name").notNull(),
  jobType: text("job_type").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("running"),
  itemsFetched: integer("items_fetched").default(0),
  itemsUpserted: integer("items_upserted").default(0),
  itemsSkipped: integer("items_skipped").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
});

export const syncCursors = pgTable("sync_cursors", {
  name: text("name").primaryKey(),
  cursorTs: timestamp("cursor_ts", { withTimezone: true }).notNull(),
});

export const insertSyncCursorSchema = createInsertSchema(syncCursors);
export type SyncCursor = typeof syncCursors.$inferSelect;
export type InsertSyncCursor = z.infer<typeof insertSyncCursorSchema>;

export const listingsRelations = relations(listings, ({ one }) => ({
  source: one(sources, {
    fields: [listings.sourceId],
    references: [sources.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  listings: many(listings),
}));

export const propertyEntitiesRelations = relations(propertyEntities, ({ many }) => ({
  variants: many(listingVariants),
}));

export const listingVariantsRelations = relations(listingVariants, ({ one }) => ({
  propertyEntity: one(propertyEntities, {
    fields: [listingVariants.propertyEntityId],
    references: [propertyEntities.id],
  }),
  rawCapture: one(rawCaptures, {
    fields: [listingVariants.rawCaptureId],
    references: [rawCaptures.id],
  }),
}));

export const ckanDatasetsRelations = relations(ckanDatasets, ({ many }) => ({
  resources: many(ckanResources),
}));

export const ckanResourcesRelations = relations(ckanResources, ({ one }) => ({
  dataset: one(ckanDatasets, {
    fields: [ckanResources.ckanDatasetId],
    references: [ckanDatasets.id],
  }),
}));

export const insertSourceSchema = createInsertSchema(sources).omit({ id: true });
export const insertAirportSchema = createInsertSchema(airports);
export const insertListingSchema = createInsertSchema(listings).omit({ id: true, lastSeenAt: true });
export const insertPropertyEntitySchema = createInsertSchema(propertyEntities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRawCaptureSchema = createInsertSchema(rawCaptures).omit({ id: true, fetchedAt: true });
export const insertListingVariantSchema = createInsertSchema(listingVariants).omit({ id: true, firstSeenAt: true, lastSeenAt: true });
export const insertCkanDatasetSchema = createInsertSchema(ckanDatasets).omit({ id: true, lastIndexedAt: true });
export const insertCkanResourceSchema = createInsertSchema(ckanResources).omit({ id: true });
export const insertReinfolibTransactionSchema = createInsertSchema(reinfolibTransactions).omit({ id: true, createdAt: true });
export const insertPartnerSourcesConfigSchema = createInsertSchema(partnerSourcesConfig).omit({ id: true });
export const insertTranslationCacheSchema = createInsertSchema(translationCache).omit({ id: true, createdAt: true });
export const insertIngestionLogSchema = createInsertSchema(ingestionLogs).omit({ id: true, startedAt: true });

export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Airport = typeof airports.$inferSelect;
export type InsertAirport = z.infer<typeof insertAirportSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type PropertyEntity = typeof propertyEntities.$inferSelect;
export type InsertPropertyEntity = z.infer<typeof insertPropertyEntitySchema>;
export type RawCapture = typeof rawCaptures.$inferSelect;
export type InsertRawCapture = z.infer<typeof insertRawCaptureSchema>;
export type ListingVariant = typeof listingVariants.$inferSelect;
export type InsertListingVariant = z.infer<typeof insertListingVariantSchema>;
export type CkanDataset = typeof ckanDatasets.$inferSelect;
export type InsertCkanDataset = z.infer<typeof insertCkanDatasetSchema>;
export type CkanResource = typeof ckanResources.$inferSelect;
export type InsertCkanResource = z.infer<typeof insertCkanResourceSchema>;
export type ReinfolibTransaction = typeof reinfolibTransactions.$inferSelect;
export type InsertReinfolibTransaction = z.infer<typeof insertReinfolibTransactionSchema>;
export type PartnerSourcesConfig = typeof partnerSourcesConfig.$inferSelect;
export type InsertPartnerSourcesConfig = z.infer<typeof insertPartnerSourcesConfigSchema>;
export type TranslationCache = typeof translationCache.$inferSelect;
export type InsertTranslationCache = z.infer<typeof insertTranslationCacheSchema>;
export type IngestionLog = typeof ingestionLogs.$inferSelect;
export type InsertIngestionLog = z.infer<typeof insertIngestionLogSchema>;

export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  prefecture: z.string().optional(),
  island: z.string().optional(),
  municipality: z.string().optional(),
  maxPrice: z.number().optional(),
  minLdk: z.number().optional(),
  maxLdk: z.number().optional(),
  minHouseSqm: z.number().optional(),
  maxHouseSqm: z.number().optional(),
  minLandSqm: z.number().optional(),
  maxLandSqm: z.number().optional(),
  minYearBuilt: z.number().optional(),
  minConditionScore: z.number().optional(),
  mustHaveLand: z.boolean().default(false),
  includeUnknownLand: z.boolean().default(true),
  sources: z.array(z.string()).optional(),
  sortBy: z.enum(["price_asc", "newest", "land_desc", "house_desc", "condition_desc"]).default("price_asc"),
  page: z.number().default(1),
  limit: z.number().default(20),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
