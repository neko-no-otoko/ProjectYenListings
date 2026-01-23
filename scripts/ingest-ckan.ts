import { ckanDiscoveryConnector } from "../server/lib/connectors/ckan/searchCkanJp";
import { runCkanResourceIngestJob } from "../server/lib/connectors/ckan/jobs";

async function main() {
  console.log("=== CKAN Ingest Script ===\n");
  
  try {
    console.log("1. Discovering akiya bank datasets from search.ckan.jp...");
    const discoveryResult = await ckanDiscoveryConnector.discoverDatasets();
    
    if (discoveryResult.success && discoveryResult.data) {
      console.log(`\nDiscovery complete:`);
      console.log(`  - Datasets found: ${discoveryResult.data.length}`);
      if (discoveryResult.metadata) {
        console.log(`  - New datasets: ${discoveryResult.metadata.upserted}`);
      }
    } else {
      console.log(`\nDiscovery failed: ${discoveryResult.error}`);
    }
    
    console.log("\n2. Ingesting resources from discovered datasets...");
    const ingestResult = await runCkanResourceIngestJob();
    
    if (ingestResult.success) {
      console.log(`\nIngest complete:`);
      console.log(`  - Rows fetched: ${ingestResult.itemsFetched}`);
      console.log(`  - Variants upserted: ${ingestResult.itemsUpserted}`);
      console.log(`  - Skipped: ${ingestResult.itemsSkipped}`);
    } else {
      console.log(`\nIngest failed: ${ingestResult.error}`);
    }
    
    console.log("\n=== CKAN Ingest Complete ===");
    console.log("\nNext step: Run 'tsx scripts/sync-listings.ts' to materialize listings");
    
  } catch (error) {
    console.error("CKAN ingest failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
