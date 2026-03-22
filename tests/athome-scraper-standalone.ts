/**
 * AtHome Scraper Standalone Test
 * 
 * This script tests the AtHome scraper without database requirements.
 * It performs a full scrape with pagination to validate the scraper works.
 * 
 * Run with: npx tsx tests/athome-scraper-standalone.ts
 */

import { AtHomeScraperCore, PREFECTURES } from "./athome-scraper-core";

interface TestResult {
  prefectureCode: string;
  prefectureName: string;
  success: boolean;
  propertiesFound: number;
  totalExpected: number;
  pagesScraped: number;
  error?: string;
  sampleProperties: Array<{
    externalId: string;
    propertyId: string;
    address: string;
    price: string;
    detailUrl: string;
  }>;
}

async function testScrapePrefecture(
  prefectureCode: string,
  maxPages: number = 10
): Promise<TestResult> {
  const scraper = new AtHomeScraperCore();
  const prefecture = PREFECTURES.find((p) => p.code === prefectureCode);

  console.log(`\n========================================`);
  console.log(`Testing Prefecture: ${prefecture?.name || prefectureCode} (${prefectureCode})`);
  console.log(`========================================`);

  const startTime = Date.now();
  const result = await scraper.scrapePrefecture(prefectureCode, maxPages);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.success) {
    console.log(`\n✅ Scrape complete in ${duration}s: ${result.properties.length} properties found`);

    // Show sample properties
    const sampleProperties = result.properties.slice(0, 3).map((p) => ({
      externalId: p.externalId,
      propertyId: p.propertyId,
      address: p.address.substring(0, 50) + (p.address.length > 50 ? "..." : ""),
      price: p.price.raw || "Contact",
      detailUrl: p.detailUrl,
    }));

    console.log("\n📋 Sample Properties:");
    sampleProperties.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.externalId} - ${p.price}`);
      console.log(`     Address: ${p.address}`);
    });

    return {
      prefectureCode,
      prefectureName: prefecture?.name || "Unknown",
      success: true,
      propertiesFound: result.propertiesFound,
      totalExpected: result.totalCount,
      pagesScraped: result.pagesScraped,
      sampleProperties,
    };
  } else {
    console.error(`\n❌ Scrape failed: ${result.error}`);

    return {
      prefectureCode,
      prefectureName: prefecture?.name || "Unknown",
      success: false,
      propertiesFound: result.properties.length,
      totalExpected: result.totalCount,
      pagesScraped: result.pagesScraped,
      error: result.error,
      sampleProperties: [],
    };
  }
}

async function runFullTest() {
  console.log("🚀 Starting AtHome Scraper Standalone Test");
  console.log("===========================================");
  console.log("This test performs real HTTP requests to akiya-athome.jp");
  console.log("Rate limit: 1 request per second\n");

  // Test prefectures with varying amounts of data
  const testPrefectures = [
    { code: "32", name: "Shimane", reason: "Rural, typically fewer listings" },
    { code: "01", name: "Hokkaido", reason: "Large prefecture, many listings" },
    { code: "40", name: "Fukuoka", reason: "Urban area, moderate listings" },
  ];

  const results: TestResult[] = [];

  for (const { code, name, reason } of testPrefectures) {
    console.log(`\n📝 Testing ${name} (${code}) - ${reason}`);
    const result = await testScrapePrefecture(code, 5); // Max 5 pages per prefecture
    results.push(result);

    // Delay between prefectures
    if (code !== testPrefectures[testPrefectures.length - 1].code) {
      console.log("\n⏳ Waiting 3 seconds before next prefecture...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Print summary
  console.log("\n\n========================================");
  console.log("📊 TEST SUMMARY");
  console.log("========================================");

  let totalProperties = 0;
  let totalExpected = 0;
  let totalPages = 0;

  for (const result of results) {
    console.log(`\n${result.prefectureName} (${result.prefectureCode}):`);
    console.log(`  Status: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Properties: ${result.propertiesFound}/${result.totalExpected}`);
    console.log(`  Pages scraped: ${result.pagesScraped}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    totalProperties += result.properties.length;
    totalExpected += result.totalExpected;
    totalPages += result.pagesScraped;
  }

  console.log("\n----------------------------------------");
  console.log(`Total properties scraped: ${totalProperties}`);
  console.log(`Total expected: ${totalExpected}`);
  console.log(`Total pages scraped: ${totalPages}`);
  if (totalExpected > 0) {
    console.log(`Success rate: ${Math.round((totalProperties / totalExpected) * 100)}%`);
  }
  console.log("----------------------------------------");

  const allPassed = results.every((r) => r.success);
  console.log(`\nOverall: ${allPassed ? "✅ ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED"}`);

  process.exit(allPassed ? 0 : 1);
}

// Run the test
runFullTest().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
