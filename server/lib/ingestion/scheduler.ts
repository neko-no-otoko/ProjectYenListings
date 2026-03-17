import cronParser from "cron-parser";
import { ckanDiscoveryConnector } from "../connectors/ckan/searchCkanJp";
import { runCkanResourceIngestJob } from "../connectors/ckan/jobs";
import { reinfolibConnector } from "../connectors/reinfolib/jobs";
import { lifullConnector } from "../connectors/partners/lifull/jobs";
import { atHomeConnector } from "../connectors/partners/athome/jobs";
import { runTranslateJob } from "../translate/jobs";
import { runSyncListingsJob } from "./syncListings";
import type { JobResult, ScheduledJob } from "../connectors/types";
import { getEnvString } from "../connectors/index";

const jobLastRun: Map<string, Date> = new Map();
const jobNextRun: Map<string, Date> = new Map();

function calculateNextRun(cronExpression: string): Date | undefined {
  try {
    const interval = cronParser.parse(cronExpression);
    return interval.next().toDate();
  } catch {
    console.error(`[Scheduler] Invalid cron expression: ${cronExpression}`);
    return undefined;
  }
}

function shouldRunNow(jobName: string, cronExpression: string): boolean {
  const now = new Date();
  
  let nextRun = jobNextRun.get(jobName);
  
  if (!nextRun) {
    nextRun = calculateNextRun(cronExpression);
    if (nextRun) {
      jobNextRun.set(jobName, nextRun);
    }
    return false;
  }
  
  if (now >= nextRun) {
    const newNextRun = calculateNextRun(cronExpression);
    if (newNextRun) {
      jobNextRun.set(jobName, newNextRun);
    }
    return true;
  }
  
  return false;
}

const scheduledJobs: ScheduledJob[] = [
  {
    name: "ckan-discovery",
    cronExpression: getEnvString("INGESTION_CRON_CKAN_DISCOVERY", "0 */24 * * *"),
    handler: async () => {
      const result = await ckanDiscoveryConnector.discoverDatasets();
      return {
        success: result.success,
        itemsFetched: result.data?.length ?? 0,
        itemsUpserted: (result.metadata?.upserted as number) ?? 0,
        itemsSkipped: 0,
        error: result.error,
      };
    },
    enabled: true,
  },
  {
    name: "ckan-resource-ingest",
    cronExpression: getEnvString("INGESTION_CRON_CKAN_RESOURCES", "0 */6 * * *"),
    handler: runCkanResourceIngestJob,
    enabled: true,
  },
  {
    name: "reinfolib-sync",
    cronExpression: getEnvString("INGESTION_CRON_REINFOLIB", "0 */12 * * *"),
    handler: () => reinfolibConnector.incrementalSync(),
    enabled: reinfolibConnector.isConfigured(),
  },
  {
    name: "lifull-sync",
    cronExpression: getEnvString("INGESTION_CRON_PARTNERS", "0 */6 * * *"),
    handler: () => lifullConnector.syncListings(),
    enabled: lifullConnector.isEnabled(),
  },
  {
    name: "athome-sync",
    cronExpression: getEnvString("INGESTION_CRON_PARTNERS", "0 */6 * * *"),
    handler: () => atHomeConnector.syncFeed(),
    enabled: atHomeConnector.isEnabled(),
  },
  {
    name: "translate",
    cronExpression: "*/30 * * * *",
    handler: runTranslateJob,
    enabled: true,
  },
  {
    name: "sync-listings",
    cronExpression: getEnvString("INGESTION_CRON_SYNC_LISTINGS", "*/30 * * * *"),
    handler: runSyncListingsJob,
    enabled: true,
  },
];

export function getScheduledJobs(): ScheduledJob[] {
  return scheduledJobs;
}

export async function runJob(jobName: string): Promise<JobResult> {
  const job = scheduledJobs.find(j => j.name === jobName);
  
  if (!job) {
    return {
      success: false,
      itemsFetched: 0,
      itemsUpserted: 0,
      itemsSkipped: 0,
      error: `Job not found: ${jobName}`,
    };
  }
  
  console.log(`[Scheduler] Running job: ${jobName}`);
  const startTime = Date.now();
  
  try {
    const result = await job.handler();
    jobLastRun.set(jobName, new Date());
    
    console.log(`[Scheduler] Job ${jobName} completed in ${Date.now() - startTime}ms:`, {
      success: result.success,
      fetched: result.itemsFetched,
      upserted: result.itemsUpserted,
      skipped: result.itemsSkipped,
    });
    
    return result;
  } catch (error) {
    console.error(`[Scheduler] Job ${jobName} failed:`, error);
    return {
      success: false,
      itemsFetched: 0,
      itemsUpserted: 0,
      itemsSkipped: 0,
      error: (error as Error).message,
    };
  }
}

export async function runDueJobs(): Promise<Map<string, JobResult>> {
  const results = new Map<string, JobResult>();
  
  for (const job of scheduledJobs) {
    if (!job.enabled) continue;
    
    if (shouldRunNow(job.name, job.cronExpression)) {
      const result = await runJob(job.name);
      results.set(job.name, result);
    }
  }
  
  return results;
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(intervalMinutes = 1): void {
  if (schedulerInterval) {
    console.log("[Scheduler] Already running");
    return;
  }
  
  console.log(`[Scheduler] Starting with ${intervalMinutes} minute check interval`);
  
  for (const job of scheduledJobs) {
    if (job.enabled) {
      const nextRun = calculateNextRun(job.cronExpression);
      if (nextRun) {
        jobNextRun.set(job.name, nextRun);
        console.log(`[Scheduler] Job ${job.name} next run: ${nextRun.toISOString()}`);
      }
    }
  }
  
  schedulerInterval = setInterval(async () => {
    try {
      await runDueJobs();
    } catch (error) {
      console.error("[Scheduler] Error running due jobs:", error);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Scheduler] Stopped");
  }
}

export function getJobStatus(jobName: string): { 
  lastRun?: Date; 
  nextRun?: Date;
  enabled: boolean; 
  cron: string;
} | null {
  const job = scheduledJobs.find(j => j.name === jobName);
  if (!job) return null;
  
  return {
    lastRun: jobLastRun.get(jobName),
    nextRun: jobNextRun.get(jobName),
    enabled: job.enabled,
    cron: job.cronExpression,
  };
}
