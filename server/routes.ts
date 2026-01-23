import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchFiltersSchema, listings } from "@shared/schema";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/search", async (req, res) => {
    try {
      const rawFilters = {
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

      res.json(results);
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

      res.json(listing);
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

  return httpServer;
}
