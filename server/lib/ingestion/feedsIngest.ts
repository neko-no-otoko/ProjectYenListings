import { db } from "../../db";
import { sourceFeeds, listingVariants, propertyEntities, rawCaptures, ingestionLogs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { fetchFeed, mapFeedTypeToSourceType, type NormalizedRecord } from "../connectors/feeds";
import type { SourceFeed } from "@shared/schema";
import crypto from "crypto";

interface IngestResult {
  feedId: string;
  feedName: string;
  fetchedCount: number;
  upsertedCount: number;
  skippedCount: number;
  error?: string;
}

async function acquireAdvisoryLock(lockName: string): Promise<boolean> {
  const lockKey = hashToInt(lockName);
  const result = await db.execute(sql`SELECT pg_try_advisory_lock(${lockKey}) as acquired`);
  return (result.rows[0] as { acquired: boolean })?.acquired ?? false;
}

async function releaseAdvisoryLock(lockName: string): Promise<void> {
  const lockKey = hashToInt(lockName);
  await db.execute(sql`SELECT pg_advisory_unlock(${lockKey})`);
}

function hashToInt(str: string): number {
  const hash = crypto.createHash("md5").update(str).digest();
  return hash.readInt32BE(0) & 0x7fffffff;
}

async function upsertVariantFromRecord(
  record: NormalizedRecord,
  sourceType: "ckan_akiya" | "arcgis_akiya" | "socrata_akiya" | "feed_import" | "manual",
  rawCaptureId: string | null
): Promise<boolean> {
  const existing = await db
    .select({ id: listingVariants.id })
    .from(listingVariants)
    .where(eq(listingVariants.sourceKey, record.sourceKey))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(listingVariants)
      .set({
        titleJp: record.titleJp,
        titleEn: record.titleEn,
        descJp: record.descJp,
        descEn: record.descEn,
        priceJpy: record.priceJpy,
        landAreaM2: record.landAreaM2,
        buildingAreaM2: record.buildingAreaM2,
        yearBuilt: record.yearBuilt,
        hasLand: record.hasLand,
        sourceUrl: record.sourceUrl,
        lastSeenAt: new Date(),
        status: "active",
      })
      .where(eq(listingVariants.id, existing[0].id));
    return true;
  }

  let propertyEntityId: string | null = null;
  if (record.lat && record.lon) {
    const nearbyEntity = await db.execute(sql`
      SELECT id FROM property_entities
      WHERE canonical_lat IS NOT NULL AND canonical_lon IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(${record.lat})) * cos(radians(canonical_lat)) *
          cos(radians(canonical_lon) - radians(${record.lon})) +
          sin(radians(${record.lat})) * sin(radians(canonical_lat))
        )
      ) < 0.1
      LIMIT 1
    `);

    if (nearbyEntity.rows.length > 0) {
      propertyEntityId = (nearbyEntity.rows[0] as { id: string }).id;
    } else {
      const [newEntity] = await db
        .insert(propertyEntities)
        .values({
          canonicalLat: record.lat,
          canonicalLon: record.lon,
          canonicalAddressJp: record.addressJp,
        })
        .returning({ id: propertyEntities.id });
      propertyEntityId = newEntity.id;
    }
  }

  await db.insert(listingVariants).values({
    propertyEntityId,
    sourceType,
    sourceKey: record.sourceKey,
    sourceUrl: record.sourceUrl,
    titleJp: record.titleJp,
    titleEn: record.titleEn,
    descJp: record.descJp,
    descEn: record.descEn,
    priceJpy: record.priceJpy,
    ldk: record.ldk,
    landAreaM2: record.landAreaM2,
    buildingAreaM2: record.buildingAreaM2,
    yearBuilt: record.yearBuilt,
    hasLand: record.hasLand,
    rawCaptureId,
    status: "active",
    translateStatus: record.titleEn ? "completed" : "pending",
  });

  return true;
}

async function ingestSingleFeed(feed: SourceFeed): Promise<IngestResult> {
  const lockName = `feeds_ingest:${feed.id}`;
  const acquired = await acquireAdvisoryLock(lockName);

  if (!acquired) {
    return {
      feedId: feed.id,
      feedName: feed.name,
      fetchedCount: 0,
      upsertedCount: 0,
      skippedCount: 0,
      error: "Feed is already being processed",
    };
  }

  const [logEntry] = await db
    .insert(ingestionLogs)
    .values({
      connectorName: `feed:${feed.type}`,
      jobType: "feeds_ingest",
      status: "running",
    })
    .returning();

  try {
    const result = await fetchFeed(feed);

    if (result.error) {
      await db
        .update(ingestionLogs)
        .set({
          completedAt: new Date(),
          status: "failed",
          errorMessage: result.error,
        })
        .where(eq(ingestionLogs.id, logEntry.id));

      await db
        .update(sourceFeeds)
        .set({ lastRunAt: new Date(), lastError: result.error })
        .where(eq(sourceFeeds.id, feed.id));

      await releaseAdvisoryLock(lockName);
      return {
        feedId: feed.id,
        feedName: feed.name,
        fetchedCount: 0,
        upsertedCount: 0,
        skippedCount: 0,
        error: result.error,
      };
    }

    let rawCaptureId: string | null = null;
    if (result.rawPayload) {
      const sha256 = crypto
        .createHash("sha256")
        .update(JSON.stringify(result.rawPayload))
        .digest("hex");

      const [capture] = await db
        .insert(rawCaptures)
        .values({
          sourceType: mapFeedTypeToSourceType(feed.type),
          contentType: "json",
          sha256,
          inlineJson: result.rawPayload as object,
          httpStatus: 200,
        })
        .returning();
      rawCaptureId = capture.id;
    }

    const sourceType = mapFeedTypeToSourceType(feed.type);
    let upsertedCount = 0;
    let skippedCount = 0;

    for (const record of result.records) {
      try {
        await upsertVariantFromRecord(record, sourceType, rawCaptureId);
        upsertedCount++;
      } catch {
        skippedCount++;
      }
    }

    await db
      .update(ingestionLogs)
      .set({
        completedAt: new Date(),
        status: "completed",
        itemsFetched: result.fetchedCount,
        itemsUpserted: upsertedCount,
        itemsSkipped: skippedCount,
      })
      .where(eq(ingestionLogs.id, logEntry.id));

    await db
      .update(sourceFeeds)
      .set({
        lastRunAt: new Date(),
        lastError: null,
        itemsFetched: result.fetchedCount,
        itemsUpserted: upsertedCount,
        updatedAt: new Date(),
      })
      .where(eq(sourceFeeds.id, feed.id));

    await releaseAdvisoryLock(lockName);

    return {
      feedId: feed.id,
      feedName: feed.name,
      fetchedCount: result.fetchedCount,
      upsertedCount,
      skippedCount,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(ingestionLogs)
      .set({
        completedAt: new Date(),
        status: "failed",
        errorMessage: errorMsg,
      })
      .where(eq(ingestionLogs.id, logEntry.id));

    await db
      .update(sourceFeeds)
      .set({ lastRunAt: new Date(), lastError: errorMsg })
      .where(eq(sourceFeeds.id, feed.id));

    await releaseAdvisoryLock(lockName);

    return {
      feedId: feed.id,
      feedName: feed.name,
      fetchedCount: 0,
      upsertedCount: 0,
      skippedCount: 0,
      error: errorMsg,
    };
  }
}

export async function runFeedsIngest(): Promise<IngestResult[]> {
  const enabledFeeds = await db
    .select()
    .from(sourceFeeds)
    .where(eq(sourceFeeds.enabled, true));

  const results: IngestResult[] = [];
  for (const feed of enabledFeeds) {
    const result = await ingestSingleFeed(feed);
    results.push(result);
  }

  return results;
}

export async function runSingleFeedIngest(feedId: string): Promise<IngestResult> {
  const [feed] = await db
    .select()
    .from(sourceFeeds)
    .where(eq(sourceFeeds.id, feedId))
    .limit(1);

  if (!feed) {
    return {
      feedId,
      feedName: "Unknown",
      fetchedCount: 0,
      upsertedCount: 0,
      skippedCount: 0,
      error: "Feed not found",
    };
  }

  return ingestSingleFeed(feed);
}
