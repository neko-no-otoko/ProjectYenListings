import { db } from "../server/db";
import { ckanDiscoveryConnector } from "../server/lib/connectors/ckan/searchCkanJp";
import { runCkanResourceIngestJob } from "../server/lib/connectors/ckan/jobs";
import { runTranslateJob } from "../server/lib/translate/jobs";
import { isTranslationConfigured } from "../server/lib/translate/provider";
import { runSyncListingsJob } from "../server/lib/ingestion/syncListings";
import { listings, propertyEntities, listingVariants } from "../shared/schema";
import { sql, eq, and, isNotNull } from "drizzle-orm";

interface PipelineSummary {
  datasetsDiscovered: number;
  resourcesIngested: number;
  variantsUpserted: number;
  propertyEntitiesAffected: number;
  listingsUpserted: number;
  errors: string[];
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                 AkiyaFinder Go-Live Pipeline                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  
  const summary: PipelineSummary = {
    datasetsDiscovered: 0,
    resourcesIngested: 0,
    variantsUpserted: 0,
    propertyEntitiesAffected: 0,
    listingsUpserted: 0,
    errors: [],
  };
  
  const startTime = Date.now();
  
  try {
    console.log("┌──────────────────────────────────────────────────────────────┐");
    console.log("│ STEP 1/4: CKAN Dataset Discovery                            │");
    console.log("└──────────────────────────────────────────────────────────────┘");
    
    const discoveryResult = await ckanDiscoveryConnector.discoverDatasets();
    
    if (discoveryResult.success && discoveryResult.data) {
      summary.datasetsDiscovered = discoveryResult.data.length;
      console.log(`  ✓ Discovered ${summary.datasetsDiscovered} datasets from search.ckan.jp`);
      if (discoveryResult.metadata) {
        console.log(`    - Keywords searched: ${discoveryResult.metadata.keywordsSearched}`);
        console.log(`    - New datasets upserted: ${discoveryResult.metadata.upserted}`);
      }
    } else {
      summary.errors.push(`Discovery: ${discoveryResult.error || "Unknown error"}`);
      console.log(`  ✗ Discovery failed: ${discoveryResult.error}`);
    }
    
    console.log("\n┌──────────────────────────────────────────────────────────────┐");
    console.log("│ STEP 2/4: CKAN Resource Ingest                              │");
    console.log("└──────────────────────────────────────────────────────────────┘");
    
    const ingestResult = await runCkanResourceIngestJob();
    
    if (ingestResult.success) {
      summary.resourcesIngested = ingestResult.itemsFetched;
      summary.variantsUpserted = ingestResult.itemsUpserted;
      console.log(`  ✓ Ingested ${ingestResult.itemsFetched} rows from CKAN resources`);
      console.log(`    - Variants upserted: ${ingestResult.itemsUpserted}`);
      console.log(`    - Skipped (unchanged): ${ingestResult.itemsSkipped}`);
    } else {
      summary.errors.push(`Ingest: ${ingestResult.error || "Unknown error"}`);
      console.log(`  ✗ Ingest failed: ${ingestResult.error}`);
    }
    
    console.log("\n┌──────────────────────────────────────────────────────────────┐");
    console.log("│ STEP 3/4: Translation                                       │");
    console.log("└──────────────────────────────────────────────────────────────┘");
    
    if (isTranslationConfigured()) {
      const translateResult = await runTranslateJob();
      
      if (translateResult.success) {
        console.log(`  ✓ Translated ${translateResult.itemsUpserted} items`);
        console.log(`    - Pending items processed: ${translateResult.itemsFetched}`);
        console.log(`    - Skipped (no content): ${translateResult.itemsSkipped}`);
      } else {
        summary.errors.push(`Translation: ${translateResult.error || "Unknown error"}`);
        console.log(`  ✗ Translation failed: ${translateResult.error}`);
      }
    } else {
      console.log("  ⊘ Translation skipped (no provider configured)");
      console.log("    Set OPENAI_API_KEY or DEEPL_API_KEY to enable translation");
    }
    
    console.log("\n┌──────────────────────────────────────────────────────────────┐");
    console.log("│ STEP 4/4: Sync Listings                                     │");
    console.log("└──────────────────────────────────────────────────────────────┘");
    
    const syncResult = await runSyncListingsJob();
    
    if (syncResult.success) {
      summary.listingsUpserted = syncResult.itemsUpserted;
      summary.propertyEntitiesAffected = syncResult.itemsFetched;
      console.log(`  ✓ Synced ${syncResult.itemsUpserted} listings`);
      console.log(`    - Property entities processed: ${syncResult.itemsFetched}`);
      console.log(`    - Skipped: ${syncResult.itemsSkipped}`);
    } else {
      summary.errors.push(`Sync: ${syncResult.error || "Unknown error"}`);
      console.log(`  ✗ Sync failed: ${syncResult.error}`);
    }
    
    const [liveListingsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          isNotNull(listings.lastSeenAt)
        )
      );
    
    const [totalEntitiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertyEntities);
    
    const [totalVariantsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listingVariants);
    
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                     PIPELINE SUMMARY                         ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Datasets discovered:        ${String(summary.datasetsDiscovered).padStart(8)} datasets          ║`);
    console.log(`║  Resources ingested:         ${String(summary.resourcesIngested).padStart(8)} rows              ║`);
    console.log(`║  Variants upserted:          ${String(summary.variantsUpserted).padStart(8)} variants           ║`);
    console.log(`║  Property entities affected: ${String(summary.propertyEntitiesAffected).padStart(8)} entities           ║`);
    console.log(`║  Listings upserted:          ${String(summary.listingsUpserted).padStart(8)} listings           ║`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Total live listings:        ${String(liveListingsCount.count).padStart(8)} (active+seen)      ║`);
    console.log(`║  Total property entities:    ${String(totalEntitiesCount.count).padStart(8)}                    ║`);
    console.log(`║  Total listing variants:     ${String(totalVariantsCount.count).padStart(8)}                    ║`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Elapsed time:               ${String(elapsedSeconds).padStart(8)}s                   ║`);
    console.log(`║  Errors:                     ${String(summary.errors.length).padStart(8)}                    ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");
    
    if (summary.errors.length > 0) {
      console.log("\n⚠ Errors encountered:");
      summary.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }
    
    console.log("\n════════════════════════════════════════════════════════════════");
    console.log("VALIDATION SQL:");
    console.log("════════════════════════════════════════════════════════════════");
    console.log(`
-- Validate listings are 1:1 with property_entities that have active variants:
SELECT 
  (SELECT count(*) FROM listings WHERE status = 'active' AND last_seen_at IS NOT NULL) AS live_listings,
  (SELECT count(DISTINCT pe.id) 
   FROM property_entities pe 
   JOIN listing_variants lv ON lv.property_entity_id = pe.id 
   WHERE lv.status = 'active' AND lv.source_type != 'reinfolib_txn') AS entities_with_active_variants,
  (SELECT count(*) 
   FROM listings l 
   WHERE l.id IN (
     SELECT DISTINCT pe.id 
     FROM property_entities pe 
     JOIN listing_variants lv ON lv.property_entity_id = pe.id 
     WHERE lv.status = 'active' AND lv.source_type != 'reinfolib_txn'
   )) AS listings_linked_to_entities;
`);
    
    if (liveListingsCount.count > 0) {
      console.log("✓ Pipeline complete! Live listings are now available.");
    } else {
      console.log("⚠ No live listings yet. This may be normal if CKAN sources have no ingestible data.");
    }
    
  } catch (error) {
    console.error("\n✗ Pipeline failed with error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
