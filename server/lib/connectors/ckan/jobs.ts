import { db } from "../../../db";
import { ckanDatasets, ckanResources } from "@shared/schema";
import { eq } from "drizzle-orm";
import { CkanClient } from "./ckanClient";
import { parseResource } from "./datasetParsers";
import { mapRowsToVariants } from "./mapper";
import { 
  captureRaw, 
  upsertListingVariant, 
  generateSha256,
  createIngestionLog,
  updateIngestionLog 
} from "../../ingestion/upsert";
import { resolvePropertyEntity } from "../../ingestion/dedupe";
import { withJobLock } from "../../ingestion/jobLock";
import type { JobResult } from "../types";
import { CONNECTOR_NAMES } from "../index";

export async function runCkanResourceIngestJob(): Promise<JobResult> {
  const lockResult = await withJobLock(CONNECTOR_NAMES.CKAN_INGEST, async () => {
    const logId = await createIngestionLog({
      connectorName: CONNECTOR_NAMES.CKAN_INGEST,
      jobType: "resource_ingest",
      status: "running",
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsSkipped = 0;

    try {
      const activeDatasets = await db
        .select()
        .from(ckanDatasets)
        .where(eq(ckanDatasets.status, "active"));

      for (const dataset of activeDatasets) {
        const resources = await db
          .select()
          .from(ckanResources)
          .where(eq(ckanResources.ckanDatasetId, dataset.id));

        const client = new CkanClient(dataset.ckanInstanceBaseUrl);

        for (const resource of resources) {
          if (!resource.downloadUrl) {
            itemsSkipped++;
            continue;
          }

          const downloadResult = await client.downloadResource(resource.downloadUrl);
          if (!downloadResult.success || !downloadResult.data) {
            console.log(`[CKAN Ingest] Failed to download ${resource.resourceId}: ${downloadResult.error}`);
            itemsSkipped++;
            continue;
          }

          const sha256 = generateSha256(downloadResult.data);
          
          if (resource.lastSha256 === sha256) {
            console.log(`[CKAN Ingest] Resource ${resource.resourceId} unchanged, skipping`);
            itemsSkipped++;
            continue;
          }

          const parseResult = parseResource(downloadResult.data, resource.format || "csv");
          
          if (!parseResult.success || !parseResult.rows) {
            console.log(`[CKAN Ingest] Failed to parse ${resource.resourceId}: ${parseResult.error}`);
            itemsSkipped++;
            continue;
          }

          if (!parseResult.schemaRecognized) {
            console.log(`[CKAN Ingest] Schema not recognized for ${resource.resourceId}, skipping`);
            
            await db
              .update(ckanResources)
              .set({
                lastFetchedAt: new Date(),
                lastSha256: sha256,
                schemaHint: parseResult.fieldMapping || null,
              })
              .where(eq(ckanResources.id, resource.id));
            
            itemsSkipped++;
            continue;
          }

          const rawCaptureId = await captureRaw({
            sourceType: "ckan_akiya",
            contentType: resource.format?.toLowerCase() === "json" ? "json" : "csv",
            sha256,
            inlineJson: {
              resourceId: resource.resourceId,
              datasetId: dataset.packageId,
              rowCount: parseResult.rows.length,
            },
          });

          itemsFetched += parseResult.rows.length;

          const mappedVariants = mapRowsToVariants(
            parseResult.rows,
            dataset.ckanInstanceBaseUrl,
            dataset.packageId,
            resource.resourceId,
            rawCaptureId
          );

          for (const { variant, propertyEntity } of mappedVariants) {
            const entityId = await resolvePropertyEntity(propertyEntity);
            
            const result = await upsertListingVariant({
              ...variant,
              propertyEntityId: entityId,
            });

            if (result.isNew) {
              itemsUpserted++;
            }
          }

          await db
            .update(ckanResources)
            .set({
              lastFetchedAt: new Date(),
              lastSha256: sha256,
              rowCount: parseResult.rows.length,
              schemaHint: parseResult.fieldMapping,
            })
            .where(eq(ckanResources.id, resource.id));
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
      connectorName: CONNECTOR_NAMES.CKAN_INGEST,
      jobType: "resource_ingest",
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
