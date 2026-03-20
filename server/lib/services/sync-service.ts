/**
 * BODIK Sync Service
 * 
 * Provides monitoring, metrics, and sync management for the BODIK ingestion pipeline.
 * Tracks sync history, error rates, data source coverage, and property import statistics.
 */

import { db } from "../../db";
import {
  ingestionLogs,
  ckanDatasets,
  ckanResources,
  listingVariants,
  listings,
  type IngestionLog,
  type CkanDataset,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, count, isNotNull } from "drizzle-orm";
import { runBodikPipeline, type BodikPipelineConfig, type BodikPipelineResult } from "../../lib/ingestion/bodik-pipeline";

const CONNECTOR_NAME = "bodik";

/**
 * Sync statistics for a time period
 */
export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalRecordsFetched: number;
  totalRecordsUpserted: number;
  totalRecordsSkipped: number;
  averageRecordsPerSync: number;
  errorRate: number;
}

/**
 * Daily sync metrics
 */
export interface DailyMetrics {
  date: string;
  syncs: number;
  recordsFetched: number;
  recordsUpserted: number;
  recordsSkipped: number;
  errors: number;
}

/**
 * Data source coverage information
 */
export interface DataSourceCoverage {
  totalDatasets: number;
  activeDatasets: number;
  reviewRequired: number;
  denied: number;
  inactive: number;
  datasetsWithResources: number;
  lastIndexedAt: Date | null;
}

/**
 * Property import statistics
 */
export interface PropertyImportStats {
  totalVariants: number;
  activeVariants: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byPrefecture: Record<string, number>;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  lastSync: IngestionLog | null;
  last24Hours: SyncStats;
  last7Days: SyncStats;
  last30Days: SyncStats;
  dailyMetrics: DailyMetrics[];
  dataSourceCoverage: DataSourceCoverage;
  propertyImportStats: PropertyImportStats;
  recentSyncs: IngestionLog[];
  systemHealth: {
    status: "healthy" | "degraded" | "error";
    message: string;
    lastSuccessfulSync: Date | null;
  };
}

/**
 * Sync history filter options
 */
export interface SyncHistoryFilter {
  startDate?: Date;
  endDate?: Date;
  status?: "running" | "completed" | "completed_with_errors" | "failed";
  limit?: number;
  offset?: number;
}

/**
 * Get the last sync log for BODIK
 */
export async function getLastSync(): Promise<IngestionLog | null> {
  const [log] = await db
    .select()
    .from(ingestionLogs)
    .where(eq(ingestionLogs.connectorName, CONNECTOR_NAME))
    .orderBy(desc(ingestionLogs.startedAt))
    .limit(1);

  return log || null;
}

/**
 * Get sync statistics for a time period
 */
export async function getSyncStats(since: Date): Promise<SyncStats> {
  const logs = await db
    .select()
    .from(ingestionLogs)
    .where(
      and(
        eq(ingestionLogs.connectorName, CONNECTOR_NAME),
        gte(ingestionLogs.startedAt, since)
      )
    );

  const totalSyncs = logs.length;
  const successfulSyncs = logs.filter(
    (log) => log.status === "completed"
  ).length;
  const failedSyncs = logs.filter(
    (log) => log.status === "failed"
  ).length;

  const totalRecordsFetched = logs.reduce(
    (sum, log) => sum + (log.itemsFetched || 0),
    0
  );
  const totalRecordsUpserted = logs.reduce(
    (sum, log) => sum + (log.itemsUpserted || 0),
    0
  );
  const totalRecordsSkipped = logs.reduce(
    (sum, log) => sum + (log.itemsSkipped || 0),
    0
  );

  const averageRecordsPerSync =
    totalSyncs > 0 ? Math.round(totalRecordsFetched / totalSyncs) : 0;
  const errorRate = totalSyncs > 0 ? (failedSyncs / totalSyncs) * 100 : 0;

  return {
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    totalRecordsFetched,
    totalRecordsUpserted,
    totalRecordsSkipped,
    averageRecordsPerSync,
    errorRate,
  };
}

/**
 * Get daily metrics for the last N days
 */
export async function getDailyMetrics(days: number): Promise<DailyMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const logs = await db
    .select()
    .from(ingestionLogs)
    .where(
      and(
        eq(ingestionLogs.connectorName, CONNECTOR_NAME),
        gte(ingestionLogs.startedAt, startDate)
      )
    )
    .orderBy(ingestionLogs.startedAt);

  // Group by date
  const grouped = new Map<string, DailyMetrics>();

  for (const log of logs) {
    if (!log.startedAt) continue;
    const date = log.startedAt.toISOString().split("T")[0];
    const existing = grouped.get(date);

    if (existing) {
      existing.syncs++;
      existing.recordsFetched += log.itemsFetched || 0;
      existing.recordsUpserted += log.itemsUpserted || 0;
      existing.recordsSkipped += log.itemsSkipped || 0;
      if (log.status === "failed") {
        existing.errors++;
      }
    } else {
      grouped.set(date, {
        date,
        syncs: 1,
        recordsFetched: log.itemsFetched || 0,
        recordsUpserted: log.itemsUpserted || 0,
        recordsSkipped: log.itemsSkipped || 0,
        errors: log.status === "failed" ? 1 : 0,
      });
    }
  }

  // Fill in missing dates with zeros
  const result: DailyMetrics[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    result.push(
      grouped.get(dateStr) || {
        date: dateStr,
        syncs: 0,
        recordsFetched: 0,
        recordsUpserted: 0,
        recordsSkipped: 0,
        errors: 0,
      }
    );
  }

  return result;
}

/**
 * Get data source coverage statistics
 */
export async function getDataSourceCoverage(): Promise<DataSourceCoverage> {
  const [stats] = await db
    .select({
      totalDatasets: count(),
      activeDatasets: sql<number>`count(*) filter (where ${ckanDatasets.status} = 'active')`,
      reviewRequired: sql<number>`count(*) filter (where ${ckanDatasets.status} = 'review_required')`,
      denied: sql<number>`count(*) filter (where ${ckanDatasets.status} = 'denied')`,
      inactive: sql<number>`count(*) filter (where ${ckanDatasets.status} = 'inactive')`,
    })
    .from(ckanDatasets);

  const datasetsWithResources = await db
    .select({ count: sql<number>`count(distinct ${ckanResources.ckanDatasetId})` })
    .from(ckanResources);

  const [lastIndexed] = await db
    .select({ lastIndexedAt: ckanDatasets.lastIndexedAt })
    .from(ckanDatasets)
    .orderBy(desc(ckanDatasets.lastIndexedAt))
    .limit(1);

  return {
    totalDatasets: stats?.totalDatasets || 0,
    activeDatasets: stats?.activeDatasets || 0,
    reviewRequired: stats?.reviewRequired || 0,
    denied: stats?.denied || 0,
    inactive: stats?.inactive || 0,
    datasetsWithResources: datasetsWithResources[0]?.count || 0,
    lastIndexedAt: lastIndexed?.lastIndexedAt || null,
  };
}

/**
 * Get property import statistics
 */
export async function getPropertyImportStats(): Promise<PropertyImportStats> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // Get total and active variants
  const [variantStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${listingVariants.status} = 'active')`,
    })
    .from(listingVariants)
    .where(eq(listingVariants.sourceType, "bodik"));

  // Get counts by time period (from ingestion logs)
  const periodStats = await db
    .select({
      startedAt: ingestionLogs.startedAt,
      itemsUpserted: ingestionLogs.itemsUpserted,
    })
    .from(ingestionLogs)
    .where(
      and(
        eq(ingestionLogs.connectorName, CONNECTOR_NAME),
        gte(ingestionLogs.startedAt, monthAgo)
      )
    );

  const todayCount = periodStats
    .filter((log) => log.startedAt && log.startedAt >= today)
    .reduce((sum, log) => sum + (log.itemsUpserted || 0), 0);

  const weekCount = periodStats
    .filter((log) => log.startedAt && log.startedAt >= weekAgo)
    .reduce((sum, log) => sum + (log.itemsUpserted || 0), 0);

  const monthCount = periodStats.reduce(
    (sum, log) => sum + (log.itemsUpserted || 0),
    0
  );

  // Get by prefecture from listings table
  const prefectureStats = await db
    .select({
      prefecture: listings.prefecture,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(
      and(
        isNotNull(listings.prefecture),
        gte(listings.lastSeenAt, monthAgo)
      )
    )
    .groupBy(listings.prefecture);

  const byPrefecture: Record<string, number> = {};
  for (const stat of prefectureStats) {
    if (stat.prefecture) {
      byPrefecture[stat.prefecture] = stat.count;
    }
  }

  return {
    totalVariants: variantStats?.total || 0,
    activeVariants: variantStats?.active || 0,
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    byPrefecture,
  };
}

/**
 * Get recent sync history
 */
export async function getSyncHistory(
  filter: SyncHistoryFilter = {}
): Promise<{ logs: IngestionLog[]; total: number }> {
  const {
    startDate,
    endDate,
    status,
    limit = 50,
    offset = 0,
  } = filter;

  const conditions: any[] = [eq(ingestionLogs.connectorName, CONNECTOR_NAME)];

  if (startDate) {
    conditions.push(gte(ingestionLogs.startedAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(ingestionLogs.startedAt, endDate));
  }
  if (status) {
    conditions.push(eq(ingestionLogs.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(ingestionLogs)
      .where(whereClause)
      .orderBy(desc(ingestionLogs.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(ingestionLogs)
      .where(whereClause),
  ]);

  return {
    logs,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Get complete dashboard data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    lastSync,
    last24Hours,
    last7Days,
    last30Days,
    dailyMetrics,
    dataSourceCoverage,
    propertyImportStats,
    recentSyncs,
  ] = await Promise.all([
    getLastSync(),
    getSyncStats(last24h),
    getSyncStats(last7d),
    getSyncStats(last30d),
    getDailyMetrics(7),
    getDataSourceCoverage(),
    getPropertyImportStats(),
    getSyncHistory({ limit: 10 }),
  ]);

  // Determine system health
  let systemHealth: DashboardData["systemHealth"];
  const lastSuccessful = recentSyncs.logs.find(
    (log) => log.status === "completed"
  );

  if (!lastSync) {
    systemHealth = {
      status: "error",
      message: "No sync history found",
      lastSuccessfulSync: null,
    };
  } else if (lastSync.status === "failed") {
    const hoursSinceLastSuccess = lastSuccessful?.startedAt
      ? (now.getTime() - lastSuccessful.startedAt.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceLastSuccess > 24) {
      systemHealth = {
        status: "error",
        message: "Last successful sync was over 24 hours ago",
        lastSuccessfulSync: lastSuccessful?.startedAt || null,
      };
    } else {
      systemHealth = {
        status: "degraded",
        message: "Recent sync failed, but syncs are succeeding",
        lastSuccessfulSync: lastSuccessful?.startedAt || null,
      };
    }
  } else {
    systemHealth = {
      status: "healthy",
      message: "System is operating normally",
      lastSuccessfulSync: lastSync.startedAt,
    };
  }

  return {
    lastSync,
    last24Hours,
    last7Days,
    last30Days,
    dailyMetrics,
    dataSourceCoverage,
    propertyImportStats,
    recentSyncs: recentSyncs.logs,
    systemHealth,
  };
}

/**
 * Trigger a manual BODIK sync
 */
export async function triggerManualSync(
  config: BodikPipelineConfig = {}
): Promise<{ jobId: string; status: string }> {
  // Start the pipeline in the background
  const pipelinePromise = runBodikPipeline(config);

  // Return immediately with job info
  // The actual result will be available via the logs
  return {
    jobId: `bodik-${Date.now()}`,
    status: "started",
  };
}

/**
 * Get sync status for a running or recent job
 */
export async function getSyncStatus(jobId: string): Promise<{
  jobId: string;
  status: string;
  log?: IngestionLog;
}> {
  // Extract timestamp from jobId (format: bodik-{timestamp})
  const timestamp = parseInt(jobId.replace("bodik-", ""), 10);
  const jobStartTime = new Date(timestamp);

  // Find the most recent log after the job start time
  const [log] = await db
    .select()
    .from(ingestionLogs)
    .where(
      and(
        eq(ingestionLogs.connectorName, CONNECTOR_NAME),
        gte(ingestionLogs.startedAt, jobStartTime)
      )
    )
    .orderBy(desc(ingestionLogs.startedAt))
    .limit(1);

  if (!log) {
    return {
      jobId,
      status: "pending",
    };
  }

  return {
    jobId,
    status: log.status || "unknown",
    log,
  };
}

/**
 * Get dataset details with resources
 */
export async function getDatasetDetails(
  datasetId: string
): Promise<(CkanDataset & { resources: any[] }) | null> {
  const [dataset] = await db
    .select()
    .from(ckanDatasets)
    .where(eq(ckanDatasets.id, datasetId))
    .limit(1);

  if (!dataset) {
    return null;
  }

  const resources = await db
    .select()
    .from(ckanResources)
    .where(eq(ckanResources.ckanDatasetId, datasetId));

  return {
    ...dataset,
    resources,
  };
}

/**
 * Get sync health check
 */
export async function getHealthCheck(): Promise<{
  healthy: boolean;
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }[];
}> {
  const checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }[] = [];

  // Check last sync
  const lastSync = await getLastSync();
  if (!lastSync) {
    checks.push({
      name: "Last Sync",
      status: "fail",
      message: "No sync history found",
    });
  } else {
    const hoursSinceLastSync = lastSync.startedAt
      ? (Date.now() - lastSync.startedAt.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (lastSync.status === "failed") {
      checks.push({
        name: "Last Sync",
        status: "fail",
        message: `Last sync failed: ${lastSync.errorMessage || "Unknown error"}`,
      });
    } else if (hoursSinceLastSync > 24) {
      checks.push({
        name: "Last Sync",
        status: "warn",
        message: `Last sync was ${Math.round(hoursSinceLastSync)} hours ago`,
      });
    } else {
      checks.push({
        name: "Last Sync",
        status: "pass",
        message: `Last sync ${Math.round(hoursSinceLastSync)} hours ago`,
      });
    }
  }

  // Check dataset coverage
  const coverage = await getDataSourceCoverage();
  if (coverage.totalDatasets === 0) {
    checks.push({
      name: "Dataset Coverage",
      status: "fail",
      message: "No datasets indexed",
    });
  } else if (coverage.activeDatasets === 0) {
    checks.push({
      name: "Dataset Coverage",
      status: "warn",
      message: `${coverage.totalDatasets} datasets indexed but none are active`,
    });
  } else {
    checks.push({
      name: "Dataset Coverage",
      status: "pass",
      message: `${coverage.activeDatasets} active datasets out of ${coverage.totalDatasets} total`,
    });
  }

  // Check error rate
  const last7Days = await getSyncStats(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  if (last7Days.errorRate > 50) {
    checks.push({
      name: "Error Rate",
      status: "fail",
      message: `${last7Days.errorRate.toFixed(1)}% error rate in last 7 days`,
    });
  } else if (last7Days.errorRate > 20) {
    checks.push({
      name: "Error Rate",
      status: "warn",
      message: `${last7Days.errorRate.toFixed(1)}% error rate in last 7 days`,
    });
  } else {
    checks.push({
      name: "Error Rate",
      status: "pass",
      message: `${last7Days.errorRate.toFixed(1)}% error rate in last 7 days`,
    });
  }

  const healthy = checks.every((c) => c.status !== "fail");

  return {
    healthy,
    checks,
  };
}

export default {
  getDashboardData,
  getSyncHistory,
  getLastSync,
  getSyncStats,
  getDailyMetrics,
  getDataSourceCoverage,
  getPropertyImportStats,
  triggerManualSync,
  getSyncStatus,
  getDatasetDetails,
  getHealthCheck,
};
