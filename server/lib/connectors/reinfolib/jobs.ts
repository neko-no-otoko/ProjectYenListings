import { getReinfolibClient } from "./client";
import { mapTransactionRecords } from "./mapper";
import { 
  captureRaw, 
  upsertReinfolibTransaction,
  createIngestionLog,
  updateIngestionLog 
} from "../../ingestion/upsert";
import type { Connector, ConnectorStatus, JobResult } from "../types";
import { CONNECTOR_NAMES } from "../index";

export class ReinfolibConnector implements Connector {
  readonly name = CONNECTOR_NAMES.REINFOLIB;
  readonly sourceType = "reinfolib_txn" as const;
  
  private lastRunAt?: Date;
  private lastError?: string;
  private itemsFetched = 0;
  private itemsUpserted = 0;

  isConfigured(): boolean {
    return getReinfolibClient().isConfigured();
  }

  isEnabled(): boolean {
    return this.isConfigured();
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

  async syncTransactions(params: {
    year: number;
    quarter: number;
    area?: string;
    city?: string;
  }): Promise<JobResult> {
    const logId = await createIngestionLog({
      connectorName: this.name,
      jobType: "sync_transactions",
      status: "running",
      metadata: params,
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsSkipped = 0;

    try {
      const client = getReinfolibClient();
      
      if (!client.isConfigured()) {
        throw new Error("Reinfolib API key not configured");
      }

      const result = await client.getTransactions(params);

      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch transactions");
      }

      itemsFetched = result.data.length;
      this.itemsFetched = itemsFetched;

      const rawCaptureId = await captureRaw({
        sourceType: "reinfolib_txn",
        contentType: "json",
        inlineJson: {
          params,
          recordCount: result.data.length,
        },
      });

      const transactions = mapTransactionRecords(result.data, rawCaptureId);

      for (const txn of transactions) {
        const upsertResult = await upsertReinfolibTransaction(txn);
        if (upsertResult.isNew) {
          itemsUpserted++;
        } else {
          itemsSkipped++;
        }
      }

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

  async incrementalSync(): Promise<JobResult> {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    
    return this.syncTransactions({ year, quarter });
  }
}

export const reinfolibConnector = new ReinfolibConnector();
