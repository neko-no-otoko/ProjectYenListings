import { db } from "../../db";
import { propertyEntities, type InsertPropertyEntity } from "@shared/schema";
import { sql, and, eq, gte, lte } from "drizzle-orm";

const EARTH_RADIUS_KM = 6371;
const PROXIMITY_THRESHOLD_KM = 0.1;

export function normalizeAddressJP(address: string): string {
  if (!address) return "";
  
  return address
    .replace(/\s+/g, "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/[ー−–—]/g, "-")
    .replace(/[・]/g, "")
    .replace(/[～〜]/g, "~")
    .replace(/(番地|番|号|丁目|−|-)/g, "-")
    .replace(/--+/g, "-")
    .replace(/-$/, "")
    .trim();
}

export function normalizeLatLon(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return Math.round(value * 100000) / 100000;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_KM * c;
}

export interface DedupeMatch {
  entityId: string;
  confidence: number;
  matchType: "proximity" | "address" | "fuzzy";
}

export async function findMatchingEntity(
  candidate: InsertPropertyEntity
): Promise<DedupeMatch | null> {
  const normalizedLat = normalizeLatLon(candidate.canonicalLat);
  const normalizedLon = normalizeLatLon(candidate.canonicalLon);
  const normalizedAddress = normalizeAddressJP(candidate.canonicalAddressJp || "");
  
  if (normalizedLat !== null && normalizedLon !== null) {
    const latRange = PROXIMITY_THRESHOLD_KM / 111;
    const lonRange = PROXIMITY_THRESHOLD_KM / (111 * Math.cos((normalizedLat * Math.PI) / 180));
    
    const nearbyEntities = await db
      .select()
      .from(propertyEntities)
      .where(
        and(
          gte(propertyEntities.canonicalLat, normalizedLat - latRange),
          lte(propertyEntities.canonicalLat, normalizedLat + latRange),
          gte(propertyEntities.canonicalLon, normalizedLon - lonRange),
          lte(propertyEntities.canonicalLon, normalizedLon + lonRange)
        )
      )
      .limit(10);
    
    for (const entity of nearbyEntities) {
      if (entity.canonicalLat === null || entity.canonicalLon === null) continue;
      
      const distance = haversineDistance(
        normalizedLat,
        normalizedLon,
        entity.canonicalLat,
        entity.canonicalLon
      );
      
      if (distance <= PROXIMITY_THRESHOLD_KM) {
        const sameLocation =
          (candidate.prefecture && entity.prefecture === candidate.prefecture) ||
          (candidate.municipality && entity.municipality === candidate.municipality);
        
        if (sameLocation) {
          const existingNormalizedAddress = normalizeAddressJP(entity.canonicalAddressJp || "");
          const addressMatch = existingNormalizedAddress && normalizedAddress && 
            existingNormalizedAddress === normalizedAddress;
          
          return {
            entityId: entity.id,
            confidence: addressMatch ? 0.9 : 0.7,
            matchType: addressMatch ? "address" : "proximity",
          };
        }
        
        return {
          entityId: entity.id,
          confidence: 0.5,
          matchType: "proximity",
        };
      }
    }
  }
  
  if (normalizedAddress && (candidate.prefecture || candidate.municipality)) {
    const exactMatches = await db
      .select()
      .from(propertyEntities)
      .where(
        and(
          candidate.prefecture ? eq(propertyEntities.prefecture, candidate.prefecture) : sql`TRUE`,
          candidate.municipality ? eq(propertyEntities.municipality, candidate.municipality) : sql`TRUE`
        )
      )
      .limit(100);
    
    for (const entity of exactMatches) {
      const existingNormalizedAddress = normalizeAddressJP(entity.canonicalAddressJp || "");
      
      if (existingNormalizedAddress === normalizedAddress) {
        return {
          entityId: entity.id,
          confidence: 0.9,
          matchType: "address",
        };
      }
    }
  }
  
  return null;
}

export async function resolvePropertyEntity(
  candidate: InsertPropertyEntity
): Promise<string> {
  const match = await findMatchingEntity(candidate);
  
  if (match && match.confidence >= 0.65) {
    if (match.confidence > 0.7) {
      const updates: Partial<InsertPropertyEntity> & { updatedAt?: Date } = {};
      
      if (!candidate.canonicalLat && candidate.canonicalLat !== null) {
        updates.canonicalLat = candidate.canonicalLat;
      }
      if (!candidate.canonicalLon && candidate.canonicalLon !== null) {
        updates.canonicalLon = candidate.canonicalLon;
      }
      if (candidate.confidenceScore && candidate.confidenceScore > (match.confidence || 0)) {
        updates.confidenceScore = candidate.confidenceScore;
      }
      
      await db
        .update(propertyEntities)
        .set(updates)
        .where(eq(propertyEntities.id, match.entityId));
    }
    
    return match.entityId;
  }
  
  const [result] = await db
    .insert(propertyEntities)
    .values({
      ...candidate,
      canonicalLat: normalizeLatLon(candidate.canonicalLat),
      canonicalLon: normalizeLatLon(candidate.canonicalLon),
      canonicalAddressJp: candidate.canonicalAddressJp,
      confidenceScore: candidate.confidenceScore || 0.5,
    })
    .returning({ id: propertyEntities.id });
  
  return result.id;
}

export async function mergeEntities(
  primaryId: string,
  duplicateId: string
): Promise<void> {
  const [primary] = await db
    .select()
    .from(propertyEntities)
    .where(eq(propertyEntities.id, primaryId))
    .limit(1);
  
  const [duplicate] = await db
    .select()
    .from(propertyEntities)
    .where(eq(propertyEntities.id, duplicateId))
    .limit(1);
  
  if (!primary || !duplicate) {
    throw new Error("Entity not found");
  }
  
  const updates: Record<string, unknown> = {};
  
  if (!primary.canonicalLat && duplicate.canonicalLat) {
    updates.canonicalLat = duplicate.canonicalLat;
  }
  if (!primary.canonicalLon && duplicate.canonicalLon) {
    updates.canonicalLon = duplicate.canonicalLon;
  }
  if (!primary.canonicalAddressJp && duplicate.canonicalAddressJp) {
    updates.canonicalAddressJp = duplicate.canonicalAddressJp;
  }
  if (!primary.canonicalAddressEn && duplicate.canonicalAddressEn) {
    updates.canonicalAddressEn = duplicate.canonicalAddressEn;
  }
  
  if ((duplicate.confidenceScore || 0) > (primary.confidenceScore || 0)) {
    updates.confidenceScore = duplicate.confidenceScore;
  }
  
  await db
    .update(propertyEntities)
    .set(updates)
    .where(eq(propertyEntities.id, primaryId));
}
