import { db } from "../../db";
import { listingVariants, propertyEntities } from "@shared/schema";
import { eq, isNull, and, or, sql } from "drizzle-orm";
import { translate, isTranslationConfigured } from "./provider";
import { createIngestionLog, updateIngestionLog } from "../ingestion/upsert";
import { withJobLock } from "../ingestion/jobLock";
import type { JobResult } from "../connectors/types";

const JOB_NAME = "translator";
const BATCH_SIZE = 50;

export async function runTranslateJob(): Promise<JobResult> {
  if (!isTranslationConfigured()) {
    return {
      success: false,
      itemsFetched: 0,
      itemsUpserted: 0,
      itemsSkipped: 0,
      error: "Translation provider not configured",
    };
  }

  const lockResult = await withJobLock(JOB_NAME, async () => {
    const logId = await createIngestionLog({
      connectorName: JOB_NAME,
      jobType: "translate_variants",
      status: "running",
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsSkipped = 0;

    try {
      const pendingVariants = await db
        .select()
        .from(listingVariants)
        .where(
          and(
            eq(listingVariants.translateStatus, "pending"),
            or(
              isNull(listingVariants.titleEn),
              isNull(listingVariants.descEn)
            )
          )
        )
        .limit(BATCH_SIZE);

      itemsFetched = pendingVariants.length;

      for (const variant of pendingVariants) {
        let hasUpdates = false;
        const updates: Partial<typeof listingVariants.$inferInsert> = {};

        if (variant.titleJp && !variant.titleEn) {
          const result = await translate(variant.titleJp);
          if (result.success && result.translation) {
            updates.titleEn = result.translation;
            hasUpdates = true;
          }
        }

        if (variant.descJp && !variant.descEn) {
          const result = await translate(variant.descJp);
          if (result.success && result.translation) {
            updates.descEn = result.translation;
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          updates.translateStatus = "completed";
          await db
            .update(listingVariants)
            .set(updates)
            .where(eq(listingVariants.id, variant.id));
          itemsUpserted++;
        } else {
          await db
            .update(listingVariants)
            .set({ translateStatus: "skipped" })
            .where(eq(listingVariants.id, variant.id));
          itemsSkipped++;
        }
      }

      const pendingEntities = await db
        .select()
        .from(propertyEntities)
        .where(
          and(
            isNull(propertyEntities.canonicalAddressEn),
            sql`${propertyEntities.canonicalAddressJp} IS NOT NULL AND ${propertyEntities.canonicalAddressJp} != ''`
          )
        )
        .limit(BATCH_SIZE);

      for (const entity of pendingEntities) {
        if (entity.canonicalAddressJp) {
          const result = await translate(entity.canonicalAddressJp);
          if (result.success && result.translation) {
            await db
              .update(propertyEntities)
              .set({
                canonicalAddressEn: result.translation,
                updatedAt: new Date(),
              })
              .where(eq(propertyEntities.id, entity.id));
            itemsUpserted++;
          }
        }
      }

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
      jobType: "translate_variants",
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
