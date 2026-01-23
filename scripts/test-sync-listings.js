const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

async function testSyncListings() {
  console.log("=== Testing sync_listings job ===\n");
  console.log(`Base URL: ${BASE_URL}\n`);

  // Step 1: Call dry-run
  console.log("1. Testing dry-run endpoint...");
  try {
    const dryRunRes = await fetch(`${BASE_URL}/api/admin/sync/dry-run?limit=5`);
    const dryRunData = await dryRunRes.json();
    console.log("Dry-run response:", JSON.stringify(dryRunData, null, 2));
    console.log(`\nFound ${dryRunData.count || 0} entities to sync\n`);
  } catch (error) {
    console.error("Dry-run failed:", error.message);
  }

  // Step 2: Get listings count before sync
  console.log("2. Checking listings count before sync...");
  try {
    const beforeRes = await fetch(`${BASE_URL}/api/listings?limit=1`);
    const beforeData = await beforeRes.json();
    console.log(`Listings before sync: ${beforeData.total || beforeData.listings?.length || 0}\n`);
  } catch (error) {
    console.error("Failed to get listings:", error.message);
  }

  // Step 3: Run actual sync (GET for synchronous result)
  console.log("3. Running sync_listings job...");
  try {
    const syncRes = await fetch(`${BASE_URL}/api/admin/sync/listings`);
    const syncData = await syncRes.json();
    console.log("Sync result:", JSON.stringify(syncData, null, 2));
  } catch (error) {
    console.error("Sync failed:", error.message);
  }

  // Step 4: Get listings count after sync
  console.log("\n4. Checking listings count after sync...");
  try {
    const afterRes = await fetch(`${BASE_URL}/api/listings?limit=5`);
    const afterData = await afterRes.json();
    console.log(`Listings after sync: ${afterData.total || afterData.listings?.length || 0}`);
    
    if (afterData.listings && afterData.listings.length > 0) {
      console.log("\nFirst 5 listings:");
      for (const listing of afterData.listings.slice(0, 5)) {
        console.log(`  - ID: ${listing.id}`);
        console.log(`    Title: ${listing.titleEn}`);
        console.log(`    Price: ¥${listing.priceJpy?.toLocaleString() || 0}`);
        console.log(`    Prefecture: ${listing.prefecture || 'N/A'}`);
        console.log(`    Status: ${listing.status}`);
        console.log(`    PrimaryVariantId: ${listing.primaryVariantId || 'N/A'}`);
        console.log();
      }
    }
  } catch (error) {
    console.error("Failed to get listings:", error.message);
  }

  // Step 5: Show SQL check instructions
  console.log("\n=== SQL Verification Checks ===");
  console.log("Run these queries to verify sync worked:\n");
  console.log("-- Count listings linked to property entities:");
  console.log("SELECT count(*) FROM listings WHERE id IN (SELECT id FROM property_entities);\n");
  console.log("-- Count all listings with primaryVariantId set:");
  console.log("SELECT count(*) FROM listings WHERE primary_variant_id IS NOT NULL;\n");
  console.log("-- Show sync cursor:");
  console.log("SELECT * FROM sync_cursors WHERE name = 'sync_listings';\n");
}

testSyncListings().catch(console.error);
