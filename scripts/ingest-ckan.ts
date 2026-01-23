import { db } from "../server/db";
import { discoverCkanDatasets } from "../server/lib/connectors/ckan/searchCkanJp";

async function main() {
  console.log("=== CKAN Ingest Script ===\n");
  
  try {
    console.log("1. Discovering akiya bank datasets from search.ckan.jp...");
    const result = await discoverCkanDatasets();
    
    console.log(`\nDiscovery complete:`);
    console.log(`  - Datasets found: ${result.datasetsFound}`);
    console.log(`  - Resources found: ${result.resourcesFound}`);
    console.log(`  - New datasets: ${result.newDatasets}`);
    console.log(`  - New resources: ${result.newResources}`);
    
    if (result.errors.length > 0) {
      console.log(`  - Errors: ${result.errors.length}`);
      result.errors.forEach(e => console.log(`    - ${e}`));
    }
    
    console.log("\n=== CKAN Ingest Complete ===");
    console.log("\nNext step: Run 'npm run sync:listings' to materialize listings");
    
  } catch (error) {
    console.error("CKAN ingest failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
