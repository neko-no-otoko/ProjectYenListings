import type { Listing } from "@shared/schema";

// Property type matching the normalized API response
export interface Property {
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
      lat: number;
      lon: number;
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
  // Legacy fields for compatibility with Listing type
  titleEn?: string;
  titleOriginal?: string;
  descriptionEn?: string;
  descriptionOriginal?: string;
  prefecture?: string;
  municipality?: string;
  locality?: string;
  island?: string;
  addressOriginal?: string;
  addressEn?: string;
  lat?: number | null;
  lon?: number | null;
  nearestAirportIata?: string | null;
  nearestAirportName?: string | null;
  nearestAirportKm?: number | null;
  priceJpy?: number;
  priceType?: string;
  ldk?: string | null;
  bedrooms?: number | null;
  houseSqm?: number | null;
  landSqm?: number | null;
  hasLand?: boolean | null;
  yearBuilt?: number | null;
  conditionScore?: number | null;
  photos?: Array<{ url: string; caption?: string; attribution?: string }> | null;
  tags?: string[] | null;
  listedAt?: Date | null;
  lastSeenAt?: Date | null;
  status?: string;
}

export interface PropertyFilters {
  query?: string;
  q?: string;
  location?: string;
  prefecture?: string;
  island?: string;
  municipality?: string;
  locality?: string;
  maxPrice?: number;
  minPrice?: number;
  minLdk?: number;
  maxLdk?: number;
  minHouseSqm?: number;
  maxHouseSqm?: number;
  minLandSqm?: number;
  maxLandSqm?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  minConditionScore?: number;
  mustHaveLand?: boolean;
  hasLand?: boolean;
  includeUnknownLand?: boolean;
  propertyType?: string;
  sources?: string[];
  sortBy?: "price_asc" | "price_desc" | "newest" | "oldest" | "land_desc" | "house_desc" | "condition_desc";
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  page?: number;
  totalPages?: number;
}

export interface PropertyListResponse {
  success: boolean;
  data: {
    properties: Property[];
    pagination: PaginationInfo;
  };
}

export interface PropertySearchResponse extends PropertyListResponse {
  meta?: {
    query?: string;
    location?: string;
  };
}

export interface PropertyDetailResponse {
  success: boolean;
  data: {
    property: Property;
    related: Property[];
  };
}

// View mode for PropertyList
export type ViewMode = "grid" | "list" | "map";
