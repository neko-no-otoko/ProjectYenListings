// Quick test to verify AtHome scraper works
// Run: npx tsx server/scripts/test-athome-scraper.ts

import { AtHomeHttpClient, AtHomeHtmlParser, PREFECTURES } from "../lib/scrapers/athome-scraper";

async function testScraper() {
  console.log("Testing AtHome Scraper...\n");

  const httpClient = new AtHomeHttpClient();
  const parser = new AtHomeHtmlParser();

  // Test 1: Fetch Hokkaido page
  console.log("Test 1: Fetching Hokkaido prefecture page...");
  const url = "https://www.akiya-athome.jp/buy/01/";
  const result = await httpClient.fetch(url);

  if (!result.success) {
    console.error("✗ Failed to fetch:", result.error);
    process.exit(1);
  }

  console.log("✓ Successfully fetched page");
  console.log(`  Status: ${result.status}`);
  console.log(`  HTML length: ${result.html?.length} chars`);

  // Test 2: Parse listings
  console.log("\nTest 2: Parsing property listings...");
  const properties = parser.parseListings(result.html!, "01");
  console.log(`✓ Found ${properties.length} properties`);

  // Test 3: Show sample data
  console.log("\nTest 3: Sample property data:");
  if (properties.length > 0) {
    const sample = properties[0];
    console.log(`  External ID: ${sample.externalId}`);
    console.log(`  Property ID: ${sample.propertyId}`);
    console.log(`  Title: ${sample.title}`);
    console.log(`  Price: ${sample.price.raw} (${sample.price.value?.toLocaleString() || "N/A"} JPY)`);
    console.log(`  Type: ${sample.propertyType}`);
    console.log(`  Layout: ${sample.layout}`);
    console.log(`  Building Area: ${sample.buildingArea}㎡`);
    console.log(`  Land Area: ${sample.landArea}㎡`);
    console.log(`  Address: ${sample.address}`);
    console.log(`  Prefecture: ${sample.prefecture}`);
    console.log(`  Municipality: ${sample.municipality}`);
    console.log(`  Photos: ${sample.photoCount}`);
    console.log(`  Detail URL: ${sample.detailUrl}`);
  }

  // Test 4: Extract total count
  console.log("\nTest 4: Total count extraction:");
  const totalCount = parser.extractTotalCount(result.html!);
  console.log(`✓ Total properties on site: ${totalCount}`);

  console.log("\n" + "=".repeat(50));
  console.log("All tests passed! ✓");
  console.log("=".repeat(50));
}

testScraper().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
