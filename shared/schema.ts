import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const priceTypeEnum = pgEnum("price_type", ["transfer_fee", "purchase_price", "unknown"]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "inactive", "unknown"]);

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

export const listingsRelations = relations(listings, ({ one }) => ({
  source: one(sources, {
    fields: [listings.sourceId],
    references: [sources.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  listings: many(listings),
}));

export const insertSourceSchema = createInsertSchema(sources).omit({ id: true });
export const insertAirportSchema = createInsertSchema(airports);
export const insertListingSchema = createInsertSchema(listings).omit({ id: true, lastSeenAt: true });

export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Airport = typeof airports.$inferSelect;
export type InsertAirport = z.infer<typeof insertAirportSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export const searchFiltersSchema = z.object({
  prefecture: z.string().optional(),
  island: z.string().optional(),
  municipality: z.string().optional(),
  maxPrice: z.number().default(150000),
  minLdk: z.number().optional(),
  maxLdk: z.number().optional(),
  minHouseSqm: z.number().optional(),
  maxHouseSqm: z.number().optional(),
  minLandSqm: z.number().optional(),
  maxLandSqm: z.number().optional(),
  minYearBuilt: z.number().optional(),
  minConditionScore: z.number().optional(),
  mustHaveLand: z.boolean().default(true),
  includeUnknownLand: z.boolean().default(false),
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
