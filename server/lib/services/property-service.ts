import { db } from "../../db";
import {
  listings,
  type Listing,
  type SearchFilters,
} from "@shared/schema";
import {
  eq,
  and,
  gte,
  lte,
  or,
  sql,
  desc,
  asc,
  ilike,
  between,
  inArray,
} from "drizzle-orm";

export interface PropertyListOptions {
  limit?: number;
  offset?: number;
  sortBy?: "price_asc" | "price_desc" | "newest" | "oldest";
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  prefecture?: string;
  municipality?: string;
  locality?: string;
  hasLand?: boolean;
  minLandSqm?: number;
  maxLandSqm?: number;
  minHouseSqm?: number;
  maxHouseSqm?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  status?: string;
}

export interface PropertyListResult {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PropertySearchOptions extends PropertyListOptions {
  query?: string;
  location?: string;
}

export class PropertyService {
  /**
   * List all properties with pagination, sorting, and filtering
   */
  async listProperties(options: PropertyListOptions = {}): Promise<PropertyListResult> {
    const {
      limit = 20,
      offset = 0,
      sortBy = "newest",
      minPrice,
      maxPrice,
      propertyType,
      prefecture,
      municipality,
      locality,
      hasLand,
      minLandSqm,
      maxLandSqm,
      minHouseSqm,
      maxHouseSqm,
      minYearBuilt,
      maxYearBuilt,
      status = "active",
    } = options;

    const conditions: any[] = [];

    // Status filter (default to active)
    if (status) {
      conditions.push(eq(listings.status, status as any));
    }

    // Ensure listing has been seen
    conditions.push(sql`${listings.lastSeenAt} IS NOT NULL`);

    // Price range filter
    if (minPrice !== undefined) {
      conditions.push(gte(listings.priceJpy, minPrice));
    }
    if (maxPrice !== undefined) {
      conditions.push(lte(listings.priceJpy, maxPrice));
    }

    // Property type filter (using tags or LDK pattern)
    if (propertyType) {
      conditions.push(
        or(
          sql`${listings.tags} @> ARRAY[${propertyType}]::text[]`,
          ilike(listings.ldk, `%${propertyType}%`)
        )
      );
    }

    // Location filters
    if (prefecture) {
      conditions.push(ilike(listings.prefecture, `%${prefecture}%`));
    }
    if (municipality) {
      conditions.push(ilike(listings.municipality, `%${municipality}%`));
    }
    if (locality) {
      conditions.push(ilike(listings.locality, `%${locality}%`));
    }

    // Land filters
    if (hasLand !== undefined) {
      conditions.push(eq(listings.hasLand, hasLand));
    }
    if (minLandSqm !== undefined) {
      conditions.push(gte(listings.landSqm, minLandSqm));
    }
    if (maxLandSqm !== undefined) {
      conditions.push(lte(listings.landSqm, maxLandSqm));
    }

    // House size filters
    if (minHouseSqm !== undefined) {
      conditions.push(gte(listings.houseSqm, minHouseSqm));
    }
    if (maxHouseSqm !== undefined) {
      conditions.push(lte(listings.houseSqm, maxHouseSqm));
    }

    // Year built filters
    if (minYearBuilt !== undefined) {
      conditions.push(gte(listings.yearBuilt, minYearBuilt));
    }
    if (maxYearBuilt !== undefined) {
      conditions.push(lte(listings.yearBuilt, maxYearBuilt));
    }

    // Build sort order
    let orderBy;
    switch (sortBy) {
      case "price_asc":
        orderBy = asc(listings.priceJpy);
        break;
      case "price_desc":
        orderBy = desc(listings.priceJpy);
        break;
      case "newest":
        orderBy = desc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`);
        break;
      case "oldest":
        orderBy = asc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`);
        break;
      default:
        orderBy = desc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute query with count
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
      limit,
      offset,
      hasMore: offset + results.length < total,
    };
  }

  /**
   * Get a single property by ID
   */
  async getPropertyById(id: string): Promise<Listing | null> {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id));
    
    return listing || null;
  }

  /**
   * Search properties with text query and filters
   */
  async searchProperties(options: PropertySearchOptions = {}): Promise<PropertyListResult> {
    const {
      query,
      location,
      limit = 20,
      offset = 0,
      sortBy = "newest",
      minPrice,
      maxPrice,
      propertyType,
      prefecture,
      municipality,
      locality,
    } = options;

    const conditions: any[] = [];

    // Always filter for active listings with data
    conditions.push(eq(listings.status, "active" as any));
    conditions.push(sql`${listings.lastSeenAt} IS NOT NULL`);

    // Text search across multiple fields
    if (query) {
      const searchTerm = `%${query}%`;
      conditions.push(
        or(
          ilike(listings.titleEn, searchTerm),
          ilike(listings.titleOriginal, searchTerm),
          ilike(listings.descriptionEn, searchTerm),
          ilike(listings.descriptionOriginal, searchTerm),
          ilike(listings.addressEn, searchTerm),
          ilike(listings.addressOriginal, searchTerm),
          ilike(listings.municipality, searchTerm),
          ilike(listings.locality, searchTerm)
        )
      );
    }

    // Location search (broader than specific fields)
    if (location) {
      const locationTerm = `%${location}%`;
      conditions.push(
        or(
          ilike(listings.prefecture, locationTerm),
          ilike(listings.municipality, locationTerm),
          ilike(listings.locality, locationTerm),
          ilike(listings.island, locationTerm),
          ilike(listings.addressEn, locationTerm)
        )
      );
    }

    // Price range
    if (minPrice !== undefined) {
      conditions.push(gte(listings.priceJpy, minPrice));
    }
    if (maxPrice !== undefined) {
      conditions.push(lte(listings.priceJpy, maxPrice));
    }

    // Property type
    if (propertyType) {
      conditions.push(
        or(
          sql`${listings.tags} @> ARRAY[${propertyType}]::text[]`,
          ilike(listings.ldk, `%${propertyType}%`)
        )
      );
    }

    // Specific location filters
    if (prefecture) {
      conditions.push(ilike(listings.prefecture, `%${prefecture}%`));
    }
    if (municipality) {
      conditions.push(ilike(listings.municipality, `%${municipality}%`));
    }
    if (locality) {
      conditions.push(ilike(listings.locality, `%${locality}%`));
    }

    // Build sort order
    let orderBy;
    switch (sortBy) {
      case "price_asc":
        orderBy = asc(listings.priceJpy);
        break;
      case "price_desc":
        orderBy = desc(listings.priceJpy);
        break;
      case "newest":
        orderBy = desc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`);
        break;
      case "oldest":
        orderBy = asc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`);
        break;
      default:
        orderBy = desc(sql`COALESCE(${listings.listedAt}, ${listings.lastSeenAt})`);
    }

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
      limit,
      offset,
      hasMore: offset + results.length < total,
    };
  }

  /**
   * Get properties by prefecture code/name
   */
  async getPropertiesByPrefecture(
    prefectureCode: string,
    options: Omit<PropertyListOptions, "prefecture"> = {}
  ): Promise<PropertyListResult> {
    return this.listProperties({
      ...options,
      prefecture: prefectureCode,
    });
  }

  /**
   * Get related properties based on location and price
   */
  async getRelatedProperties(
    propertyId: string,
    limit: number = 4
  ): Promise<Listing[]> {
    const property = await this.getPropertyById(propertyId);
    
    if (!property) {
      return [];
    }

    const conditions: any[] = [
      eq(listings.status, "active" as any),
      sql`${listings.lastSeenAt} IS NOT NULL`,
      sql`${listings.id} != ${propertyId}`,
    ];

    // Match by prefecture or municipality
    if (property.municipality) {
      conditions.push(ilike(listings.municipality, `%${property.municipality}%`));
    } else if (property.prefecture) {
      conditions.push(ilike(listings.prefecture, `%${property.prefecture}%`));
    }

    // Similar price range (±30%)
    if (property.priceJpy && property.priceJpy > 0) {
      const minPrice = Math.floor(property.priceJpy * 0.7);
      const maxPrice = Math.floor(property.priceJpy * 1.3);
      conditions.push(between(listings.priceJpy, minPrice, maxPrice));
    }

    const whereClause = and(...conditions);

    const results = await db
      .select()
      .from(listings)
      .where(whereClause)
      .orderBy(desc(listings.lastSeenAt))
      .limit(limit);

    return results;
  }
}

// Export singleton instance
export const propertyService = new PropertyService();
