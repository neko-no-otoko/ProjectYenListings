#!/usr/bin/env tsx
/**
 * BODIK CKAN Ingestion Script
 * 
 * Usage:
 *   npx tsx server/scripts/run-bodik-ingestion.ts [options]
 * 
 * Options:
 *   --max-datasets=N        Maximum datasets to process (default: 50)
 *   --max-records=N         Maximum records per dataset (default: 1000)
 *   --organization=ID       Filter by municipality organization ID
 *   --all-datasets          Include non-akiya datasets
 *   --dry-run               Don't actually save to database
 *   --help                  Show this help message
 * 
 * Examples:
 *   npx tsx server/scripts/run-bodik-ingestion.ts
 *   npx tsx server/scripts/run-bodik-ingestion.ts --max-datasets=10 --dry-run
 *   npx tsx server/scripts/run-bodik-ingestion.ts --organization=401307
 */

import { runBodikPipeline, type BodikPipelineConfig } from "../lib/ingestion/bodik-pipeline";

function parseArgs(): BodikPipelineConfig {
  const args = process.argv.slice(2);
  const config: BodikPipelineConfig = {};

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      showHelp();
      process.exit(0);
    }
    
    if (arg === "--dry-run") {
      config.dryRun = true;
      continue;
    }
    
    if (arg === "--all-datasets") {
      config.onlyAkiyaDatasets = false;
      continue;
    }
    
    if (arg.startsWith("--max-datasets=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value)) {
        config.maxDatasets = value;
      }
      continue;
    }
    
    if (arg.startsWith("--max-records=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value)) {
        config.maxRecordsPerDataset = value;
      }
      continue;
    }
    
    if (arg.startsWith("--organization=")) {
      config.organizationId = arg.split("=")[1];
      continue;
    }
  }

  return config;
}

function showHelp(): void {
  console.log(`
BODIK CKAN Ingestion Script

Fetches vacant house (akiya) datasets from the BODIK CKAN API,
normalizes the data, and stores it in the database.

Usage:
  npx tsx server/scripts/run-bodik-ingestion.ts [options]

Options:
  --max-datasets=N        Maximum datasets to process (default: 50)
  --max-records=N         Maximum records per dataset (default: 1000)
  --organization=ID       Filter by municipality organization ID
  --all-datasets          Include non-akiya datasets
  --dry-run               Don't actually save to database
  --help, -h              Show this help message

Examples:
  # Run full ingestion
  npx tsx server/scripts/run-bodik-ingestion.ts

  # Dry run with limited datasets
  npx tsx server/scripts/run-bodik-ingestion.ts --max-datasets=10 --dry-run

  # Process specific municipality only
  npx tsx server/scripts/run-bodik-ingestion.ts --organization=401307

Environment Variables:
  DATABASE_URL            PostgreSQL connection string (required)
`);
}

async function main(): Promise<void> {
  const config = parseArgs();

  console.log("[BODIK Script] Starting BODIK CKAN ingestion...");
  console.log("[BODIK Script] Config:", JSON.stringify(config, null, 2));

  const startTime = Date.now();

  try {
    const result = await runBodikPipeline(config);

    const duration = (Date.now() - startTime) / 1000;

    console.log("\n[BODIK Script] Ingestion complete!");
    console.log("========================================");
    console.log(`Success:              ${result.success ? "✓" : "✗"}`);
    console.log(`Duration:             ${duration.toFixed(2)}s`);
    console.log(`Datasets Processed:   ${result.datasetsProcessed}`);
    console.log(`Datasets Failed:      ${result.datasetsFailed}`);
    console.log(`Records Fetched:      ${result.recordsFetched}`);
    console.log(`Records Upserted:     ${result.recordsUpserted}`);
    console.log(`Records Skipped:      ${result.recordsSkipped}`);
    console.log(`Log ID:               ${result.logId || "N/A"}`);
    
    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }
    console.log("========================================");

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("[BODIK Script] Fatal error:", error);
    process.exit(1);
  }
}

// Run main if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]);
if (isMainModule) {
  main();
}

export { main };
