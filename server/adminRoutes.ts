import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { 
  ingestionLogs, 
  ckanDatasets, 
  ckanResources, 
  listingVariants, 
  propertyEntities,
  partnerSourcesConfig 
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getConnectorStatuses } from "./lib/connectors/index";
import { runJob, getScheduledJobs, getJobStatus, startScheduler, stopScheduler } from "./lib/ingestion/scheduler";

export const adminRouter = Router();

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "development") {
    return next();
  }
  
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: "Admin API not configured" });
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const token = authHeader.slice(7);
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  
  next();
}

adminRouter.use(requireAdminAuth);

adminRouter.get("/status", async (_req, res) => {
  try {
    const connectorStatuses = await getConnectorStatuses();
    
    const [stats] = await db
      .select({
        totalVariants: sql<number>`count(*)::int`,
        activeVariants: sql<number>`count(*) filter (where status = 'active')::int`,
      })
      .from(listingVariants);
    
    const [entityStats] = await db
      .select({
        totalEntities: sql<number>`count(*)::int`,
      })
      .from(propertyEntities);
    
    const [datasetStats] = await db
      .select({
        totalDatasets: sql<number>`count(*)::int`,
        activeDatasets: sql<number>`count(*) filter (where status = 'active')::int`,
        reviewRequired: sql<number>`count(*) filter (where status = 'review_required')::int`,
      })
      .from(ckanDatasets);
    
    const jobs = getScheduledJobs().map(j => ({
      name: j.name,
      enabled: j.enabled,
      cron: j.cronExpression,
      ...getJobStatus(j.name),
    }));
    
    res.json({
      connectors: connectorStatuses,
      stats: {
        listingVariants: stats,
        propertyEntities: entityStats,
        ckanDatasets: datasetStats,
      },
      scheduledJobs: jobs,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.get("/logs", async (req, res) => {
  try {
    const connector = req.query.connector as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    let query = db
      .select()
      .from(ingestionLogs)
      .orderBy(desc(ingestionLogs.startedAt))
      .limit(limit);
    
    if (connector) {
      const logs = await db
        .select()
        .from(ingestionLogs)
        .where(eq(ingestionLogs.connectorName, connector))
        .orderBy(desc(ingestionLogs.startedAt))
        .limit(limit);
      return res.json({ logs });
    }
    
    const logs = await query;
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.post("/run/:jobName", async (req, res) => {
  try {
    const { jobName } = req.params;
    
    res.json({ message: `Job ${jobName} started`, status: "running" });
    
    runJob(jobName).then(result => {
      console.log(`[Admin] Job ${jobName} result:`, result);
    }).catch(error => {
      console.error(`[Admin] Job ${jobName} error:`, error);
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.get("/datasets", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    
    let baseQuery = db
      .select()
      .from(ckanDatasets)
      .orderBy(desc(ckanDatasets.lastIndexedAt))
      .limit(limit);
    
    if (status) {
      const datasets = await db
        .select()
        .from(ckanDatasets)
        .where(eq(ckanDatasets.status, status as "active" | "review_required" | "denied" | "inactive"))
        .orderBy(desc(ckanDatasets.lastIndexedAt))
        .limit(limit);
      return res.json({ datasets });
    }
    
    const datasets = await baseQuery;
    res.json({ datasets });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.patch("/datasets/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["active", "review_required", "denied", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    await db
      .update(ckanDatasets)
      .set({ status })
      .where(eq(ckanDatasets.id, id));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.get("/resources/:datasetId", async (req, res) => {
  try {
    const { datasetId } = req.params;
    
    const resources = await db
      .select()
      .from(ckanResources)
      .where(eq(ckanResources.ckanDatasetId, datasetId));
    
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.get("/variants", async (req, res) => {
  try {
    const sourceType = req.query.sourceType as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    
    let query = db
      .select()
      .from(listingVariants)
      .orderBy(desc(listingVariants.lastSeenAt))
      .limit(limit);
    
    if (sourceType) {
      const variants = await db
        .select()
        .from(listingVariants)
        .where(eq(listingVariants.sourceType, sourceType as "reinfolib_txn" | "ckan_akiya" | "lifull" | "athome" | "manual"))
        .orderBy(desc(listingVariants.lastSeenAt))
        .limit(limit);
      return res.json({ variants });
    }
    
    const variants = await query;
    res.json({ variants });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.post("/scheduler/start", async (_req, res) => {
  try {
    startScheduler();
    res.json({ success: true, message: "Scheduler started" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.post("/scheduler/stop", async (_req, res) => {
  try {
    stopScheduler();
    res.json({ success: true, message: "Scheduler stopped" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

adminRouter.get("/partner-config", async (_req, res) => {
  try {
    const configs = await db
      .select()
      .from(partnerSourcesConfig);
    
    res.json({ configs });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
