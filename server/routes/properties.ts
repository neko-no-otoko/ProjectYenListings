import { Router, type Request, type Response } from "express";
import { propertyService } from "../lib/services/property-service";
import { translatePrefecture, translateIsland, getQuickTranslation } from "../lib/translate/translateService";
import { z } from "zod";

const router = Router();

// Validation schemas
const listPropertiesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(["price_asc", "price_desc", "newest", "oldest"]).default("newest"),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  propertyType: z.string().optional(),
  prefecture: z.string().optional(),
  municipality: z.string().optional(),
  locality: z.string().optional(),
  hasLand: z.coerce.boolean().optional(),
  minLandSqm: z.coerce.number().optional(),
  maxLandSqm: z.coerce.number().optional(),
  minHouseSqm: z.coerce.number().optional(),
  maxHouseSqm: z.coerce.number().optional(),
  minYearBuilt: z.coerce.number().optional(),
  maxYearBuilt: z.coerce.number().optional(),
});

const searchPropertiesQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  location: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(["price_asc", "price_desc", "newest", "oldest"]).default("newest"),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  propertyType: z.string().optional(),
  prefecture: z.string().optional(),
  municipality: z.string().optional(),
  locality: z.string().optional(),
});

// Response normalization helper
interface NormalizedProperty {
  id: string;
  title: {
    en: string | null;
    original: string | null;
    display: string;
  };
  description: {
    en: string | null;
    original: string | null;
  };
  location: {
    prefecture: string | null;
    prefectureEn: string | null;
    municipality: string | null;
    locality: string | null;
    island: string | null;
    islandEn: string | null;
    address: {
      original: string | null;
      en: string | null;
    };
    coordinates: {
      lat: number | null;
      lon: number | null;
    } | null;
    display: string;
  };
  pricing: {
    priceJpy: number;
    priceType: string;
    formattedPrice: string;
  };
  features: {
    ldk: string | null;
    bedrooms: number | null;
    houseSqm: number | null;
    landSqm: number | null;
    hasLand: boolean | null;
    yearBuilt: number | null;
    conditionScore: number;
  };
  media: {
    photos: Array<{
      url: string;
      caption?: string;
      attribution?: string;
    }>;
  };
  metadata: {
    sourceId: string | null;
    sourceUrl: string | null;
    listedAt: Date | null;
    lastSeenAt: Date | null;
    status: string;
    tags: string[] | null;
  };
  translations: {
    titleDisplay: string;
    locationDisplay: string;
  };
}

function normalizeProperty(listing: any): NormalizedProperty {
  const { titleDisplay, locationDisplay } = getQuickTranslation(listing);
  
  return {
    id: listing.id,
    title: {
      en: listing.titleEn,
      original: listing.titleOriginal,
      display: titleDisplay,
    },
    description: {
      en: listing.descriptionEn,
      original: listing.descriptionOriginal,
    },
    location: {
      prefecture: listing.prefecture,
      prefectureEn: translatePrefecture(listing.prefecture),
      municipality: listing.municipality,
      locality: listing.locality,
      island: listing.island,
      islandEn: translateIsland(listing.island),
      address: {
        original: listing.addressOriginal,
        en: listing.addressEn,
      },
      coordinates: listing.lat && listing.lon
        ? { lat: listing.lat, lon: listing.lon }
        : null,
      display: locationDisplay,
    },
    pricing: {
      priceJpy: listing.priceJpy || 0,
      priceType: listing.priceType || "unknown",
      formattedPrice: formatPrice(listing.priceJpy),
    },
    features: {
      ldk: listing.ldk,
      bedrooms: listing.bedrooms,
      houseSqm: listing.houseSqm,
      landSqm: listing.landSqm,
      hasLand: listing.hasLand,
      yearBuilt: listing.yearBuilt,
      conditionScore: listing.conditionScore || 3,
    },
    media: {
      photos: listing.photos || [],
    },
    metadata: {
      sourceId: listing.sourceId,
      sourceUrl: listing.sourceUrl,
      listedAt: listing.listedAt,
      lastSeenAt: listing.lastSeenAt,
      status: listing.status,
      tags: listing.tags,
    },
    translations: {
      titleDisplay,
      locationDisplay,
    },
  };
}

function formatPrice(priceJpy: number | null): string {
  if (!priceJpy || priceJpy === 0) return "Price on request";
  if (priceJpy >= 100000000) {
    return `¥${(priceJpy / 100000000).toFixed(2)}B`;
  }
  if (priceJpy >= 10000) {
    return `¥${(priceJpy / 10000).toFixed(0)}万`;
  }
  return `¥${priceJpy.toLocaleString()}`;
}

// GET /api/properties - List all properties with pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const validatedQuery = listPropertiesQuerySchema.parse(req.query);
    
    const result = await propertyService.listProperties({
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      sortBy: validatedQuery.sort,
      minPrice: validatedQuery.minPrice,
      maxPrice: validatedQuery.maxPrice,
      propertyType: validatedQuery.propertyType,
      prefecture: validatedQuery.prefecture,
      municipality: validatedQuery.municipality,
      locality: validatedQuery.locality,
      hasLand: validatedQuery.hasLand,
      minLandSqm: validatedQuery.minLandSqm,
      maxLandSqm: validatedQuery.maxLandSqm,
      minHouseSqm: validatedQuery.minHouseSqm,
      maxHouseSqm: validatedQuery.maxHouseSqm,
      minYearBuilt: validatedQuery.minYearBuilt,
      maxYearBuilt: validatedQuery.maxYearBuilt,
    });

    const normalizedListings = result.listings.map(normalizeProperty);

    res.json({
      success: true,
      data: {
        properties: normalizedListings,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
    });
  } catch (error) {
    console.error("Error listing properties:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to fetch properties",
      });
    }
  }
});

// GET /api/properties/search - Search properties
router.get("/search", async (req: Request, res: Response) => {
  try {
    const validatedQuery = searchPropertiesQuerySchema.parse(req.query);
    
    const result = await propertyService.searchProperties({
      query: validatedQuery.q || validatedQuery.query,
      location: validatedQuery.location,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      sortBy: validatedQuery.sort,
      minPrice: validatedQuery.minPrice,
      maxPrice: validatedQuery.maxPrice,
      propertyType: validatedQuery.propertyType,
      prefecture: validatedQuery.prefecture,
      municipality: validatedQuery.municipality,
      locality: validatedQuery.locality,
    });

    const normalizedListings = result.listings.map(normalizeProperty);

    res.json({
      success: true,
      data: {
        properties: normalizedListings,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
      meta: {
        query: validatedQuery.q || validatedQuery.query,
        location: validatedQuery.location,
      },
    });
  } catch (error) {
    console.error("Error searching properties:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid search parameters",
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to search properties",
      });
    }
  }
});

// GET /api/properties/by-prefecture/:code - Filter by prefecture
router.get("/by-prefecture/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const validatedQuery = listPropertiesQuerySchema.omit({ prefecture: true }).parse(req.query);
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Prefecture code is required",
      });
    }

    const result = await propertyService.getPropertiesByPrefecture(code, {
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      sortBy: validatedQuery.sort,
      minPrice: validatedQuery.minPrice,
      maxPrice: validatedQuery.maxPrice,
      propertyType: validatedQuery.propertyType,
      municipality: validatedQuery.municipality,
      locality: validatedQuery.locality,
      hasLand: validatedQuery.hasLand,
      minLandSqm: validatedQuery.minLandSqm,
      maxLandSqm: validatedQuery.maxLandSqm,
      minHouseSqm: validatedQuery.minHouseSqm,
      maxHouseSqm: validatedQuery.maxHouseSqm,
      minYearBuilt: validatedQuery.minYearBuilt,
      maxYearBuilt: validatedQuery.maxYearBuilt,
    });

    const normalizedListings = result.listings.map(normalizeProperty);

    res.json({
      success: true,
      data: {
        properties: normalizedListings,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
        prefecture: code,
      },
    });
  } catch (error) {
    console.error("Error fetching properties by prefecture:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to fetch properties by prefecture",
      });
    }
  }
});

// GET /api/properties/:id - Get single property details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    const property = await propertyService.getPropertyById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    const normalizedProperty = normalizeProperty(property);

    // Get related properties
    const relatedProperties = await propertyService.getRelatedProperties(id, 4);
    const normalizedRelated = relatedProperties.map(normalizeProperty);

    res.json({
      success: true,
      data: {
        property: normalizedProperty,
        related: normalizedRelated,
      },
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch property",
    });
  }
});

export default router;
