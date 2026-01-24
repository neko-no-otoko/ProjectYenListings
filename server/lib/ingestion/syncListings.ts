import { db } from "../../db";
import { 
  listings, 
  propertyEntities, 
  listingVariants, 
  syncCursors, 
  airports,
  type ListingVariant,
  type PropertyEntity,
  type Airport
} from "@shared/schema";
import { eq, gt, or, and, ne, isNotNull, sql, desc } from "drizzle-orm";
import { withJobLock } from "./jobLock";
import { createIngestionLog, updateIngestionLog } from "./upsert";
import type { JobResult } from "../connectors/types";
import { getPrefectureCoords } from "../prefectureCoords";

const JOB_NAME = "sync_listings";
const CURSOR_NAME = "sync_listings";

const SOURCE_TYPE_PRIORITY: Record<string, number> = {
  lifull: 1,
  athome: 2,
  ckan_akiya: 3,
  manual: 4,
};

const TRANSLATE_STATUS_PRIORITY: Record<string, number> = {
  completed: 1,
  pending: 2,
  failed: 3,
  skipped: 4,
};

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

async function findNearestAirport(lat: number, lon: number): Promise<{ iata: string; name: string; distanceKm: number } | null> {
  const allAirports = await db.select().from(airports);
  
  let nearest: { iata: string; name: string; distanceKm: number } | null = null;
  
  for (const airport of allAirports) {
    const distance = haversineDistance(lat, lon, airport.lat, airport.lon);
    if (!nearest || distance < nearest.distanceKm) {
      nearest = {
        iata: airport.iata,
        name: airport.nameEn || airport.name,
        distanceKm: Math.round(distance * 10) / 10,
      };
    }
  }
  
  return nearest;
}

async function getCursor(): Promise<Date> {
  const cursor = await db
    .select()
    .from(syncCursors)
    .where(eq(syncCursors.name, CURSOR_NAME))
    .limit(1);
  
  if (cursor.length === 0) {
    return new Date(0);
  }
  
  return cursor[0].cursorTs;
}

async function updateCursor(timestamp: Date): Promise<void> {
  await db
    .insert(syncCursors)
    .values({ name: CURSOR_NAME, cursorTs: timestamp })
    .onConflictDoUpdate({
      target: syncCursors.name,
      set: { cursorTs: timestamp },
    });
}

async function getChangedEntityIds(since: Date): Promise<string[]> {
  const changedEntities = await db
    .selectDistinct({ id: propertyEntities.id })
    .from(propertyEntities)
    .where(gt(propertyEntities.updatedAt, since));
  
  const changedFromVariants = await db
    .selectDistinct({ id: listingVariants.propertyEntityId })
    .from(listingVariants)
    .where(
      and(
        gt(listingVariants.lastSeenAt, since),
        isNotNull(listingVariants.propertyEntityId)
      )
    );
  
  const ids = new Set<string>();
  for (const row of changedEntities) {
    ids.add(row.id);
  }
  for (const row of changedFromVariants) {
    if (row.id) ids.add(row.id);
  }
  
  return Array.from(ids);
}

function selectPrimaryVariant(variants: ListingVariant[]): ListingVariant | null {
  if (variants.length === 0) return null;
  
  return variants.sort((a, b) => {
    const translateA = TRANSLATE_STATUS_PRIORITY[a.translateStatus || "pending"] || 4;
    const translateB = TRANSLATE_STATUS_PRIORITY[b.translateStatus || "pending"] || 4;
    if (translateA !== translateB) return translateA - translateB;
    
    const hasLandScore = (val: boolean | null) => val === true ? 1 : val === null ? 2 : 3;
    const landA = hasLandScore(a.hasLand);
    const landB = hasLandScore(b.hasLand);
    if (landA !== landB) return landA - landB;
    
    const lastSeenA = a.lastSeenAt?.getTime() || 0;
    const lastSeenB = b.lastSeenAt?.getTime() || 0;
    if (lastSeenA !== lastSeenB) return lastSeenB - lastSeenA;
    
    const sourceA = SOURCE_TYPE_PRIORITY[a.sourceType] || 5;
    const sourceB = SOURCE_TYPE_PRIORITY[b.sourceType] || 5;
    return sourceA - sourceB;
  })[0];
}

export interface SyncPreview {
  entityId: string;
  chosenPrimaryVariantId: string | null;
  mergedPrice: number;
  titleEn: string;
  status: string;
}

export async function previewSyncListings(limit: number = 5): Promise<SyncPreview[]> {
  const cursor = await getCursor();
  const changedIds = await getChangedEntityIds(cursor);
  
  const previews: SyncPreview[] = [];
  const idsToProcess = changedIds.slice(0, limit);
  
  for (const entityId of idsToProcess) {
    const variants = await db
      .select()
      .from(listingVariants)
      .where(
        and(
          eq(listingVariants.propertyEntityId, entityId),
          eq(listingVariants.status, "active"),
          ne(listingVariants.sourceType, "reinfolib_txn")
        )
      );
    
    const entity = await db
      .select()
      .from(propertyEntities)
      .where(eq(propertyEntities.id, entityId))
      .limit(1);
    
    if (entity.length === 0) continue;
    
    const primary = selectPrimaryVariant(variants);
    
    const prices = variants
      .map(v => v.priceJpy)
      .filter((p): p is number => p !== null && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    const titleEn = primary?.titleEn || primary?.titleJp || "Untitled";
    const status = variants.length === 0 ? "delisted" : (primary?.status || "active");
    
    previews.push({
      entityId,
      chosenPrimaryVariantId: primary?.id || null,
      mergedPrice: minPrice,
      titleEn,
      status,
    });
  }
  
  return previews;
}

export async function runSyncListingsJob(): Promise<JobResult> {
  const lockResult = await withJobLock(JOB_NAME, async () => {
    const logId = await createIngestionLog({
      connectorName: JOB_NAME,
      jobType: "materialize_listings",
      status: "running",
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsSkipped = 0;
    const jobStartTime = new Date();

    try {
      const cursor = await getCursor();
      const changedIds = await getChangedEntityIds(cursor);
      itemsFetched = changedIds.length;
      
      console.log(`[SyncListings] Processing ${changedIds.length} changed entities since ${cursor.toISOString()}`);

      for (const entityId of changedIds) {
        const variants = await db
          .select()
          .from(listingVariants)
          .where(
            and(
              eq(listingVariants.propertyEntityId, entityId),
              eq(listingVariants.status, "active"),
              ne(listingVariants.sourceType, "reinfolib_txn")
            )
          );
        
        const entityRows = await db
          .select()
          .from(propertyEntities)
          .where(eq(propertyEntities.id, entityId))
          .limit(1);
        
        if (entityRows.length === 0) {
          itemsSkipped++;
          continue;
        }
        
        const entity = entityRows[0];
        
        if (variants.length === 0) {
          const existingListing = await db
            .select({ id: listings.id })
            .from(listings)
            .where(eq(listings.id, entityId))
            .limit(1);
          
          if (existingListing.length > 0) {
            await db
              .update(listings)
              .set({ status: "delisted", lastSeenAt: new Date() })
              .where(eq(listings.id, entityId));
            itemsUpserted++;
          } else {
            itemsSkipped++;
          }
          continue;
        }
        
        const primary = selectPrimaryVariant(variants)!;
        
        const prices = variants
          .map(v => v.priceJpy)
          .filter((p): p is number => p !== null && p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        
        let lat = entity.canonicalLat;
        let lon = entity.canonicalLon;
        
        if (!lat || !lon) {
          const prefectureCoords = getPrefectureCoords(entity.prefecture);
          if (prefectureCoords) {
            lat = prefectureCoords.lat;
            lon = prefectureCoords.lon;
          }
        }
        
        let nearestAirport: { iata: string; name: string; distanceKm: number } | null = null;
        if (lat && lon) {
          nearestAirport = await findNearestAirport(lat, lon);
        }
        
        const listingData = {
          id: entityId,
          primaryVariantId: primary.id,
          sourceUrl: primary.sourceUrl,
          titleEn: primary.titleEn || primary.titleJp || "Untitled",
          titleOriginal: primary.titleJp,
          descriptionEn: primary.descEn,
          descriptionOriginal: primary.descJp,
          prefecture: entity.prefecture,
          municipality: entity.municipality,
          locality: entity.locality,
          addressOriginal: entity.canonicalAddressJp,
          addressEn: entity.canonicalAddressEn,
          lat,
          lon,
          nearestAirportIata: nearestAirport?.iata || null,
          nearestAirportName: nearestAirport?.name || null,
          nearestAirportKm: nearestAirport?.distanceKm || null,
          priceJpy: minPrice,
          ldk: primary.ldk,
          houseSqm: primary.buildingAreaM2,
          landSqm: primary.landAreaM2,
          yearBuilt: primary.yearBuilt,
          hasLand: primary.hasLand,
          status: primary.status,
          lastSeenAt: primary.lastSeenAt || new Date(),
        };
        
        await db
          .insert(listings)
          .values(listingData)
          .onConflictDoUpdate({
            target: listings.id,
            set: {
              primaryVariantId: listingData.primaryVariantId,
              sourceUrl: listingData.sourceUrl,
              titleEn: listingData.titleEn,
              titleOriginal: listingData.titleOriginal,
              descriptionEn: listingData.descriptionEn,
              descriptionOriginal: listingData.descriptionOriginal,
              prefecture: listingData.prefecture,
              municipality: listingData.municipality,
              locality: listingData.locality,
              addressOriginal: listingData.addressOriginal,
              addressEn: listingData.addressEn,
              lat: listingData.lat,
              lon: listingData.lon,
              nearestAirportIata: listingData.nearestAirportIata,
              nearestAirportName: listingData.nearestAirportName,
              nearestAirportKm: listingData.nearestAirportKm,
              priceJpy: listingData.priceJpy,
              ldk: listingData.ldk,
              houseSqm: listingData.houseSqm,
              landSqm: listingData.landSqm,
              yearBuilt: listingData.yearBuilt,
              hasLand: listingData.hasLand,
              status: listingData.status,
              lastSeenAt: listingData.lastSeenAt,
            },
          });
        
        itemsUpserted++;
      }
      
      await updateCursor(jobStartTime);

      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: "completed",
        itemsFetched,
        itemsUpserted,
        itemsSkipped,
      });

      return {
        success: true,
        itemsFetched,
        itemsUpserted,
        itemsSkipped,
      } as JobResult;
    } catch (error) {
      const errorMessage = (error as Error).message;

      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: "failed",
        errorMessage,
        itemsFetched,
        itemsUpserted,
        itemsSkipped,
      });

      return {
        success: false,
        itemsFetched,
        itemsUpserted,
        itemsSkipped,
        error: errorMessage,
      } as JobResult;
    }
  });

  if (lockResult.skipped) {
    await createIngestionLog({
      connectorName: JOB_NAME,
      jobType: "materialize_listings",
      status: "skipped_locked",
    });
    
    return {
      success: false,
      itemsFetched: 0,
      itemsUpserted: 0,
      itemsSkipped: 0,
      error: "Job already running (lock not acquired)",
    };
  }

  return lockResult.result!;
}
