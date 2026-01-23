import { db } from "../../db";
import { createHash } from "crypto";
import {
  rawCaptures,
  listingVariants,
  propertyEntities,
  reinfolibTransactions,
  ckanDatasets,
  ckanResources,
  ingestionLogs,
  type InsertRawCapture,
  type InsertListingVariant,
  type InsertPropertyEntity,
  type InsertReinfolibTransaction,
  type InsertCkanDataset,
  type InsertCkanResource,
  type InsertIngestionLog,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export function generateSha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function generateSourceKey(...parts: (string | number | undefined | null)[]): string {
  const combined = parts.filter(p => p !== undefined && p !== null).join("|");
  return generateSha256(combined);
}

export async function captureRaw(capture: InsertRawCapture): Promise<string> {
  const [result] = await db
    .insert(rawCaptures)
    .values(capture)
    .returning({ id: rawCaptures.id });
  return result.id;
}

export async function upsertListingVariant(
  variant: InsertListingVariant
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .select({ id: listingVariants.id })
    .from(listingVariants)
    .where(eq(listingVariants.sourceKey, variant.sourceKey))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(listingVariants)
      .set({
        ...variant,
        lastSeenAt: new Date(),
      })
      .where(eq(listingVariants.id, existing[0].id));
    return { id: existing[0].id, isNew: false };
  }

  const [result] = await db
    .insert(listingVariants)
    .values(variant)
    .returning({ id: listingVariants.id });
  return { id: result.id, isNew: true };
}

export async function upsertPropertyEntity(
  entity: InsertPropertyEntity
): Promise<string> {
  const [result] = await db
    .insert(propertyEntities)
    .values(entity)
    .returning({ id: propertyEntities.id });
  return result.id;
}

export async function upsertReinfolibTransaction(
  txn: InsertReinfolibTransaction
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .select({ id: reinfolibTransactions.id })
    .from(reinfolibTransactions)
    .where(eq(reinfolibTransactions.sourceKey, txn.sourceKey))
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, isNew: false };
  }

  const [result] = await db
    .insert(reinfolibTransactions)
    .values(txn)
    .returning({ id: reinfolibTransactions.id });
  return { id: result.id, isNew: true };
}

export async function upsertCkanDataset(
  dataset: InsertCkanDataset
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .select({ id: ckanDatasets.id })
    .from(ckanDatasets)
    .where(
      and(
        eq(ckanDatasets.ckanInstanceBaseUrl, dataset.ckanInstanceBaseUrl),
        eq(ckanDatasets.packageId, dataset.packageId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ckanDatasets)
      .set({
        ...dataset,
        lastIndexedAt: new Date(),
      })
      .where(eq(ckanDatasets.id, existing[0].id));
    return { id: existing[0].id, isNew: false };
  }

  const [result] = await db
    .insert(ckanDatasets)
    .values(dataset)
    .returning({ id: ckanDatasets.id });
  return { id: result.id, isNew: true };
}

export async function upsertCkanResource(
  resource: InsertCkanResource
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .select({ id: ckanResources.id })
    .from(ckanResources)
    .where(
      and(
        eq(ckanResources.ckanDatasetId, resource.ckanDatasetId),
        eq(ckanResources.resourceId, resource.resourceId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ckanResources)
      .set(resource)
      .where(eq(ckanResources.id, existing[0].id));
    return { id: existing[0].id, isNew: false };
  }

  const [result] = await db
    .insert(ckanResources)
    .values(resource)
    .returning({ id: ckanResources.id });
  return { id: result.id, isNew: true };
}

export async function createIngestionLog(log: InsertIngestionLog): Promise<string> {
  const [result] = await db
    .insert(ingestionLogs)
    .values(log)
    .returning({ id: ingestionLogs.id });
  return result.id;
}

export async function updateIngestionLog(
  id: string,
  updates: Partial<{
    completedAt: Date;
    status: string;
    itemsFetched: number;
    itemsUpserted: number;
    itemsSkipped: number;
    errorMessage: string;
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  await db
    .update(ingestionLogs)
    .set(updates)
    .where(eq(ingestionLogs.id, id));
}

export async function getRecentIngestionLogs(
  connectorName?: string,
  limit = 50
): Promise<typeof ingestionLogs.$inferSelect[]> {
  let query = db
    .select()
    .from(ingestionLogs)
    .orderBy(sql`${ingestionLogs.startedAt} DESC`)
    .limit(limit);

  if (connectorName) {
    return db
      .select()
      .from(ingestionLogs)
      .where(eq(ingestionLogs.connectorName, connectorName))
      .orderBy(sql`${ingestionLogs.startedAt} DESC`)
      .limit(limit);
  }

  return query;
}
