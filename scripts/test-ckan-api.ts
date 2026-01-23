import { getSearchCkanJpClient } from "../server/lib/connectors/ckan/ckanClient";

async function main() {
  console.log("=== CKAN API Connectivity Test ===\n");
  
  const client = getSearchCkanJpClient();
  console.log(`Base URL: ${client.getBaseUrl()}\n`);
  
  console.log("Testing connectivity with /package_list?rows=1...\n");
  
  const result = await client.testConnectivity();
  
  if (result.success) {
    console.log("✓ SUCCESS: CKAN API is accessible");
    console.log("\nResponse preview (first 200 chars):");
    console.log(result.responsePreview);
  } else {
    console.log("✗ FAILED:", result.error);
    if (result.responsePreview) {
      console.log("\nResponse preview (first 200 chars):");
      console.log(result.responsePreview);
    }
  }
  
  console.log("\n--- Testing package_search ---");
  const searchResult = await client.packageSearch("空き家", { rows: 3 });
  
  if (searchResult.success && searchResult.data) {
    console.log(`✓ Found ${searchResult.data.count} packages for "空き家"`);
    console.log(`  First ${Math.min(3, searchResult.data.results.length)} results:`);
    searchResult.data.results.slice(0, 3).forEach((pkg, i) => {
      console.log(`  ${i + 1}. ${pkg.title} (${pkg.name})`);
    });
  } else {
    console.log(`✗ Search failed: ${searchResult.error}`);
  }
  
  process.exit(result.success ? 0 : 1);
}

main();
