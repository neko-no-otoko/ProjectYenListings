import type { InsertListingVariant, InsertPropertyEntity } from "@shared/schema";
import type { LifullListing } from "./client";
import { generateSourceKey } from "../../../ingestion/upsert";

export function mapLifullListing(listing: LifullListing, rawCaptureId?: string): {
  variant: InsertListingVariant;
  propertyEntity: InsertPropertyEntity;
} {
  const sourceKey = generateSourceKey("lifull", listing.id);
  
  const variant: InsertListingVariant = {
    sourceType: "lifull",
    sourceKey,
    sourceUrl: listing.url,
    titleJp: listing.title,
    descJp: listing.description,
    priceJpy: listing.price,
    ldk: listing.ldk,
    landAreaM2: listing.landAreaM2,
    buildingAreaM2: listing.buildingAreaM2,
    yearBuilt: listing.yearBuilt,
    hasLand: listing.landAreaM2 !== undefined && listing.landAreaM2 > 0,
    rawCaptureId,
    status: "active",
    translateStatus: "pending",
  };
  
  const propertyEntity: InsertPropertyEntity = {
    canonicalLat: listing.lat,
    canonicalLon: listing.lon,
    canonicalAddressJp: listing.address,
    confidenceScore: 0.8,
  };
  
  return { variant, propertyEntity };
}
