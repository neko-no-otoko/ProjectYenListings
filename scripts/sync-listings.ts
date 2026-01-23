import { runSyncListings } from "../server/lib/ingestion/syncListings";

async function main() {
  console.log("=== Sync Listings Script ===\n");
  
  try {
    console.log("Running sync_listings job to materialize live listings...\n");
    
    const result = await runSyncListings();
    
    console.log(`\nSync complete:`);
    console.log(`  - Success: ${result.success}`);
    console.log(`  - Items fetched: ${result.itemsFetched}`);
    console.log(`  - Items upserted: ${result.itemsUpserted}`);
    console.log(`  - Items skipped: ${result.itemsSkipped}`);
    
    if (result.error) {
      console.log(`  - Error: ${result.error}`);
    }
    
    console.log("\n=== Sync Complete ===");
    console.log("\nLive listings are now available in the frontend.");
    
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
