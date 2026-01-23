import { getLifullClient } from "./client";
import { mapLifullListing } from "./mapper";
import { 
  captureRaw, 
  upsertListingVariant,
  createIngestionLog,
  updateIngestionLog 
} from "../../../ingestion/upsert";
import { resolvePropertyEntity } from "../../../ingestion/dedupe";
import type { Connector, ConnectorStatus, JobResult } from "../../types";
import { CONNECTOR_NAMES } from "../../index";

export class LifullConnector implements Connector {
  readonly name = CONNECTOR_NAMES.LIFULL;
  readonly sourceType = "lifull" as const;
  
  private lastRunAt?: Date;
  private lastError?: string;
  private itemsFetched = 0;
  private itemsUpserted = 0;

  isConfigured(): boolean {
    return getLifullClient().isConfigured();
  }

  isEnabled(): boolean {
    return getLifullClient().isEnabled();
  }

  async getStatus(): Promise<ConnectorStatus> {
    return {
      name: this.name,
      configured: this.isConfigured(),
      enabled: this.isEnabled(),
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      itemsFetched: this.itemsFetched,
      itemsUpserted: this.itemsUpserted,
    };
  }

  async syncListings(params?: {
    prefecture?: string;
    priceMax?: number;
  }): Promise<JobResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        itemsFetched: 0,
        itemsUpserted: 0,
        itemsSkipped: 0,
        error: "LIFULL connector is not enabled. Set LIFULL_ENABLED=true and provide credentials.",
      };
    }

    const logId = await createIngestionLog({
      connectorName: this.name,
      jobType: "sync_listings",
      status: "running",
      metadata: params,
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsSkipped = 0;

    try {
      const client = getLifullClient();
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const result = await client.searchListings({
          ...params,
          page,
          perPage,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error ?? "Failed to fetch listings");
        }

        itemsFetched += result.data.results.length;

        const rawCaptureId = await captureRaw({
          sourceType: "lifull",
          contentType: "json",
          inlineJson: {
            page,
            totalResults: result.data.total,
            fetchedCount: result.data.results.length,
          },
        });

        for (const listing of result.data.results) {
          const { variant, propertyEntity } = mapLifullListing(listing, rawCaptureId);
          
          const entityId = await resolvePropertyEntity(propertyEntity);
          
          const upsertResult = await upsertListingVariant({
            ...variant,
            propertyEntityId: entityId,
          });

          if (upsertResult.isNew) {
            itemsUpserted++;
          } else {
            itemsSkipped++;
          }
        }

        hasMore = result.data.results.length === perPage && page * perPage < result.data.total;
        page++;
      }

      this.itemsFetched = itemsFetched;
      this.itemsUpserted = itemsUpserted;
      this.lastRunAt = new Date();

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
      };
    } catch (error) {
      this.lastError = (error as Error).message;

      await updateIngestionLog(logId, {
        completedAt: new Date(),
        status: "failed",
        errorMessage: this.lastError,
        itemsFetched,
        itemsUpserted,
        itemsSkipped,
      });

      return {
        success: false,
        itemsFetched,
        itemsUpserted,
        itemsSkipped,
        error: this.lastError,
      };
    }
  }
}

export const lifullConnector = new LifullConnector();
