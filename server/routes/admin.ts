/**
 * BODIK Admin Routes
 * 
 * API endpoints for the BODIK data sync dashboard and monitoring.
 * Provides access to sync statistics, history, manual triggers, and health checks.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
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
} from "../lib/services/sync-service";
import { runBodikPipeline, type BodikPipelineConfig } from "../lib/ingestion/bodik-pipeline";

const router = Router();

// Validation schemas
const syncHistoryQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["running", "completed", "completed_with_errors", "failed"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const manualSyncBodySchema = z.object({
  maxDatasets: z.number().min(1).max(100).optional(),
  maxRecordsPerDataset: z.number().min(1).max(5000).optional(),
  organizationId: z.string().optional(),
  onlyAkiyaDatasets: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});

/**
 * GET /api/admin/bodik/dashboard
 * Get complete dashboard data
 */
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const data = await getDashboardData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[BODIK Admin] Dashboard error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/sync/last
 * Get the last sync information
 */
router.get("/sync/last", async (_req: Request, res: Response) => {
  try {
    const lastSync = await getLastSync();
    res.json({
      success: true,
      data: lastSync,
    });
  } catch (error) {
    console.error("[BODIK Admin] Last sync error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/sync/stats
 * Get sync statistics for a time period
 */
router.get("/sync/stats", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const stats = await getSyncStats(since);
    res.json({
      success: true,
      data: {
        period: `${days} days`,
        since: since.toISOString(),
        ...stats,
      },
    });
  } catch (error) {
    console.error("[BODIK Admin] Sync stats error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/sync/history
 * Get sync history with filtering
 */
router.get("/sync/history", async (req: Request, res: Response) => {
  try {
    const query = syncHistoryQuerySchema.parse(req.query);
    
    const filter = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    };

    const history = await getSyncHistory(filter);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("[BODIK Admin] Sync history error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/sync/daily-metrics
 * Get daily sync metrics for the last N days
 */
router.get("/sync/daily-metrics", async (req: Request, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);
    const metrics = await getDailyMetrics(days);
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("[BODIK Admin] Daily metrics error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/admin/bodik/sync/trigger
 * Trigger a manual BODIK sync
 */
router.post("/sync/trigger", async (req: Request, res: Response) => {
  try {
    const config = manualSyncBodySchema.parse(req.body);
    
    // Start the pipeline in the background
    const result = await triggerManualSync(config as BodikPipelineConfig);
    
    res.json({
      success: true,
      data: result,
      message: "Sync triggered successfully",
    });

    // Run the actual pipeline asynchronously after response
    runBodikPipeline(config as BodikPipelineConfig).catch((error) => {
      console.error("[BODIK Admin] Background sync error:", error);
    });
  } catch (error) {
    console.error("[BODIK Admin] Trigger sync error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/sync/status/:jobId
 * Get the status of a specific sync job
 */
router.get("/sync/status/:jobId", async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const status = await getSyncStatus(jobId);
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[BODIK Admin] Sync status error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/coverage
 * Get data source coverage statistics
 */
router.get("/coverage", async (_req: Request, res: Response) => {
  try {
    const coverage = await getDataSourceCoverage();
    res.json({
      success: true,
      data: coverage,
    });
  } catch (error) {
    console.error("[BODIK Admin] Coverage error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/properties/stats
 * Get property import statistics
 */
router.get("/properties/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getPropertyImportStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[BODIK Admin] Property stats error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/health
 * Get system health check
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const health = await getHealthCheck();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error("[BODIK Admin] Health check error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/admin/bodik/datasets/:id
 * Get detailed information about a specific dataset
 */
router.get("/datasets/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dataset = await getDatasetDetails(id);
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset not found",
      });
    }
    
    res.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error("[BODIK Admin] Dataset details error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
