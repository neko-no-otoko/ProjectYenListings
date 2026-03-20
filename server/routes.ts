import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchFiltersSchema, listings } from "@shared/schema";
import { db } from "./db";
import { sql, eq, and, desc, isNotNull } from "drizzle-orm";
import { translatePrefecture, translateIsland, getQuickTranslation } from "./lib/translate/translateService";
import propertiesRouter from "./routes/properties";
import bodikAdminRouter from "./routes/admin";

function applyTranslations<T extends { titleEn: string | null; prefecture: string | null; municipality: string | null; island: string | null }>(
  listing: T
): T & { prefectureEn: string | null; islandEn: string | null; titleDisplay: string; locationDisplay: string } {
  const { titleDisplay, locationDisplay } = getQuickTranslation(listing);
  return {
    ...listing,
    prefectureEn: translatePrefecture(listing.prefecture),
    islandEn: translateIsland(listing.island),
    titleDisplay,
    locationDisplay,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register new property API routes
  app.use("/api/properties", propertiesRouter);
  
  // Register BODIK admin routes
  app.use("/api/admin/bodik", bodikAdminRouter);
  app.get("/api/search", async (req, res) => {
    try {
      const rawFilters = {
        query: (req.query.q as string | undefined) || (req.query.query as string | undefined),
        prefecture: req.query.prefecture as string | undefined,
        island: req.query.island as string | undefined,
        municipality: req.query.municipality as string | undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        minLdk: req.query.minLdk ? Number(req.query.minLdk) : undefined,
        maxLdk: req.query.maxLdk ? Number(req.query.maxLdk) : undefined,
        minHouseSqm: req.query.minHouseSqm ? Number(req.query.minHouseSqm) : undefined,
        maxHouseSqm: req.query.maxHouseSqm ? Number(req.query.maxHouseSqm) : undefined,
        minLandSqm: req.query.minLandSqm ? Number(req.query.minLandSqm) : undefined,
        maxLandSqm: req.query.maxLandSqm ? Number(req.query.maxLandSqm) : undefined,
        minYearBuilt: req.query.minYearBuilt ? Number(req.query.minYearBuilt) : undefined,
        minConditionScore: req.query.minConditionScore ? Number(req.query.minConditionScore) : undefined,
        mustHaveLand: req.query.mustHaveLand === "true",
        includeUnknownLand: req.query.includeUnknownLand !== "false",
        sortBy: (req.query.sortBy as any) || "price_asc",
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const filters = searchFiltersSchema.parse(rawFilters);
      const results = await storage.searchListings(filters);

      const translatedListings = results.listings.map(applyTranslations);
      res.json({
        ...results,
        listings: translatedListings,
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(400).json({ error: "Invalid search parameters" });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListingById(req.params.id);

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const translatedListing = applyTranslations(listing);
      res.json(translatedListing);
    } catch (error) {
      console.error("Get listing error:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getAllSources();
      res.json(sources);
    } catch (error) {
      console.error("Get sources error:", error);
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.get("/api/airports", async (req, res) => {
    try {
      const majorOnly = req.query.major === "true";
      const airports = await storage.getAirports(majorOnly);
      res.json(airports);
    } catch (error) {
      console.error("Get airports error:", error);
      res.status(500).json({ error: "Failed to fetch airports" });
    }
  });

  app.get("/api/stats/live-listings", async (req, res) => {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(
          and(
            eq(listings.status, "active"),
            sql`${listings.lastSeenAt} IS NOT NULL`
          )
        );
      const count = result[0]?.count || 0;
      res.json({ liveCount: count, isDev: process.env.NODE_ENV !== "production" });
    } catch (error) {
      console.error("Get live listings count error:", error);
      res.status(500).json({ error: "Failed to get live listings count" });
    }
  });

  app.get("/api/home/newest", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 7, 20);
      
      const newestListings = await db
        .select({
          id: listings.id,
          titleEn: listings.titleEn,
          prefecture: listings.prefecture,
          municipality: listings.municipality,
          locality: listings.locality,
          island: listings.island,
          priceJpy: listings.priceJpy,
          priceType: listings.priceType,
          ldk: listings.ldk,
          houseSqm: listings.houseSqm,
          landSqm: listings.landSqm,
          photos: listings.photos,
          listedAt: listings.listedAt,
          lastSeenAt: listings.lastSeenAt,
          status: listings.status,
        })
        .from(listings)
        .where(
          and(
            eq(listings.status, "active"),
            isNotNull(listings.lastSeenAt)
          )
        )
        .orderBy(
          desc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`)
        )
        .limit(limit);

      const translatedListings = newestListings.map(applyTranslations);
      res.json(translatedListings);
    } catch (error) {
      console.error("Get newest listings error:", error);
      res.status(500).json({ error: "Failed to fetch newest listings" });
    }
  });

  return httpServer;
}
