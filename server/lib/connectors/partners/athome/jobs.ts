import { fetchAtHomeFeed, parseAtHomeFeed, getAtHomeConfig, isAtHomeEnabled, isAtHomeConfigured } from "./feed";
import { mapAtHomeRow } from "./mapper";
import { 
  captureRaw, 
  upsertListingVariant,
  generateSha256,
  createIngestionLog,
  updateIngestionLog 
} from "../../../ingestion/upsert";
import { resolvePropertyEntity } from "../../../ingestion/dedupe";
import type { Connector, ConnectorStatus, JobResult } from "../../types";
import { CONNECTOR_NAMES } from "../../index";

export class AtHomeConnector implements Connector {
  readonly name = CONNECTOR_NAMES.ATHOME;
  readonly sourceType = "athome" as const;
  
  private lastRunAt?: Date;
  private lastError?: string;
  private itemsFetched = 0;
  private itemsUpserted = 0;

  isConfigured(): boolean {
    return isAtHomeConfigured();
  }

  isEnabled(): boolean {
    return isAtHomeEnabled();
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

  async syncFeed(): Promise<JobResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        itemsFetched: 0,
        itemsUpserted: 0,
        itemsSkipped: 0,
        error: "AtHome connector is not enabled. Set ATHOME_ENABLED=true and provide ATHOME_FEED_URL.",
      };
    }

    const logId = await createIngestionLog({
      connectorName: this.name,
      jobType: "sync_feed",
      status: "running",
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsSkipped = 0;

    try {
      const config = getAtHomeConfig();
      
      const fetchResult = await fetchAtHomeFeed();
      if (!fetchResult.success || !fetchResult.data) {
        throw new Error(fetchResult.error ?? "Failed to fetch feed");
      }

      const sha256 = generateSha256(fetchResult.data);
      
      const parseResult = parseAtHomeFeed(fetchResult.data, config.format);
      
      if (!parseResult.success || !parseResult.rows) {
        throw new Error(parseResult.error ?? "Failed to parse feed");
      }

      if (!parseResult.schemaRecognized) {
        console.warn(`[AtHome] Schema not recognized, proceeding with best-effort mapping`);
      }

      itemsFetched = parseResult.rows.length;

      const rawCaptureId = await captureRaw({
        sourceType: "athome",
        contentType: config.format === "csv" ? "csv" : "json",
        sha256,
        inlineJson: {
          feedUrl: config.feedUrl,
          rowCount: parseResult.rows.length,
          schemaRecognized: parseResult.schemaRecognized,
        },
      });

      for (let i = 0; i < parseResult.rows.length; i++) {
        const mapped = mapAtHomeRow(parseResult.rows[i], i, rawCaptureId);
        
        if (!mapped) {
          itemsSkipped++;
          continue;
        }

        const entityId = await resolvePropertyEntity(mapped.propertyEntity);
        
        const upsertResult = await upsertListingVariant({
          ...mapped.variant,
          propertyEntityId: entityId,
        });

        if (upsertResult.isNew) {
          itemsUpserted++;
        } else {
          itemsSkipped++;
        }
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

export const atHomeConnector = new AtHomeConnector();
