import {
  listings,
  sources,
  airports,
  type Listing,
  type InsertListing,
  type Source,
  type InsertSource,
  type Airport,
  type InsertAirport,
  type SearchFilters,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, sql, desc, asc, ilike } from "drizzle-orm";

export interface IStorage {
  searchListings(filters: SearchFilters): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getListingById(id: string): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing | undefined>;
  getAllSources(): Promise<Source[]>;
  createSource(source: InsertSource): Promise<Source>;
  getAirports(majorOnly?: boolean): Promise<Airport[]>;
  createAirport(airport: InsertAirport): Promise<Airport>;
  getNearestAirport(lat: number, lon: number): Promise<{ airport: Airport; distanceKm: number } | null>;
}

export class DatabaseStorage implements IStorage {
  async searchListings(filters: SearchFilters): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const conditions: any[] = [];

    if (filters.query) {
      const q = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(listings.titleEn, q),
          ilike(listings.addressEn, q),
          ilike(listings.prefecture, q),
          ilike(listings.municipality, q),
          ilike(listings.locality, q),
          ilike(listings.island, q)
        )
      );
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(lte(listings.priceJpy, filters.maxPrice));
    }

    if (filters.prefecture) {
      conditions.push(ilike(listings.prefecture, `%${filters.prefecture}%`));
    }

    if (filters.island) {
      conditions.push(eq(listings.island, filters.island));
    }

    if (filters.municipality) {
      conditions.push(ilike(listings.municipality, `%${filters.municipality}%`));
    }

    if (filters.minHouseSqm) {
      conditions.push(gte(listings.houseSqm, filters.minHouseSqm));
    }

    if (filters.maxHouseSqm) {
      conditions.push(lte(listings.houseSqm, filters.maxHouseSqm));
    }

    if (filters.minLandSqm) {
      conditions.push(gte(listings.landSqm, filters.minLandSqm));
    }

    if (filters.maxLandSqm) {
      conditions.push(lte(listings.landSqm, filters.maxLandSqm));
    }

    if (filters.minYearBuilt) {
      conditions.push(gte(listings.yearBuilt, filters.minYearBuilt));
    }

    if (filters.minLdk) {
      conditions.push(sql`CAST(NULLIF(REGEXP_REPLACE(${listings.ldk}, '[^0-9]', '', 'g'), '') AS INTEGER) >= ${filters.minLdk}`);
    }

    if (filters.maxLdk) {
      conditions.push(sql`CAST(NULLIF(REGEXP_REPLACE(${listings.ldk}, '[^0-9]', '', 'g'), '') AS INTEGER) <= ${filters.maxLdk}`);
    }

    if (filters.minConditionScore) {
      conditions.push(gte(listings.conditionScore, filters.minConditionScore));
    }

    if (filters.mustHaveLand && !filters.includeUnknownLand) {
      conditions.push(eq(listings.hasLand, true));
    } else if (filters.mustHaveLand && filters.includeUnknownLand) {
      conditions.push(or(eq(listings.hasLand, true), sql`${listings.hasLand} IS NULL`));
    }

    conditions.push(eq(listings.status, "active"));
    conditions.push(sql`${listings.lastSeenAt} IS NOT NULL`);

    let orderBy;
    switch (filters.sortBy) {
      case "price_asc":
        orderBy = asc(listings.priceJpy);
        break;
      case "newest":
        orderBy = desc(listings.lastSeenAt);
        break;
      case "land_desc":
        orderBy = desc(listings.landSqm);
        break;
      case "house_desc":
        orderBy = desc(listings.houseSqm);
        break;
      case "condition_desc":
        orderBy = desc(listings.conditionScore);
        break;
      default:
        orderBy = asc(listings.priceJpy);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      db
        .select()
        .from(listings)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;

    return {
      listings: results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getListingById(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    const [created] = await db.insert(listings).values(listing).returning();
    return created;
  }

  async updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing | undefined> {
    const [updated] = await db
      .update(listings)
      .set(listing)
      .where(eq(listings.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllSources(): Promise<Source[]> {
    return db.select().from(sources);
  }

  async createSource(source: InsertSource): Promise<Source> {
    const [created] = await db.insert(sources).values(source).returning();
    return created;
  }

  async getAirports(majorOnly = false): Promise<Airport[]> {
    if (majorOnly) {
      return db.select().from(airports).where(eq(airports.isMajor, true));
    }
    return db.select().from(airports);
  }

  async createAirport(airport: InsertAirport): Promise<Airport> {
    const [created] = await db.insert(airports).values(airport).returning();
    return created;
  }

  async getNearestAirport(
    lat: number,
    lon: number
  ): Promise<{ airport: Airport; distanceKm: number } | null> {
    const majorAirports = await this.getAirports(true);

    if (majorAirports.length === 0) return null;

    let nearest: { airport: Airport; distanceKm: number } | null = null;

    for (const airport of majorAirports) {
      const distance = haversineDistance(lat, lon, airport.lat, airport.lon);
      if (!nearest || distance < nearest.distanceKm) {
        nearest = { airport, distanceKm: distance };
      }
    }

    return nearest;
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const storage = new DatabaseStorage();
