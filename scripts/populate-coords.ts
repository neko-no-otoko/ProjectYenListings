#!/usr/bin/env tsx
/**
 * Populate coordinates for listings that have prefecture but no lat/lon
 * Uses prefecture center coordinates as approximate location
 */

import { db } from "../server/db";
import { listings } from "../shared/schema";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";
import { getPrefectureCoords } from "../server/lib/prefectureCoords";

async function populateCoords() {
  console.log("=".repeat(60));
  console.log("POPULATE COORDINATES FROM PREFECTURE DATA");
  console.log("=".repeat(60));

  const listingsWithoutCoords = await db
    .select({
      id: listings.id,
      prefecture: listings.prefecture,
      lat: listings.lat,
      lon: listings.lon,
    })
    .from(listings)
    .where(
      and(
        isNotNull(listings.prefecture),
        isNull(listings.lat)
      )
    );

  console.log(`Found ${listingsWithoutCoords.length} listings with prefecture but no coordinates`);

  let updated = 0;
  let skipped = 0;

  for (const listing of listingsWithoutCoords) {
    const coords = getPrefectureCoords(listing.prefecture);
    
    if (coords) {
      await db
        .update(listings)
        .set({
          lat: coords.lat,
          lon: coords.lon,
        })
        .where(eq(listings.id, listing.id));
      updated++;
    } else {
      skipped++;
      console.log(`  No coords found for prefecture: ${listing.prefecture}`);
    }
  }

  const afterCount = await db
    .select({ count: sql`count(*)` })
    .from(listings)
    .where(and(isNotNull(listings.lat), isNotNull(listings.lon)));

  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no coords): ${skipped}`);
  console.log(`Total listings with coordinates now: ${afterCount[0].count}`);

  process.exit(0);
}

populateCoords().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
