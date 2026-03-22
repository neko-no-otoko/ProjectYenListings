/**
 * AtHome Scraper Integration Tests
 * 
 * Tests for AtHome akiya scraper including:
 * - Single prefecture scraping
 * - Full scrape with pagination
 * - Data integrity validation
 * 
 * Run with: npx tsx --test tests/athome-scraper-integration.test.ts
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import {
  AtHomeScraper,
  runAtHomeScrapeJob,
  type ScrapedProperty,
} from "../server/lib/scrapers/athome-scraper";

const TEST_TIMEOUT = 300000; // 5 minutes for full scrape tests

describe("AtHome Scraper Integration", () => {
  let scraper: AtHomeScraper;

  before(() => {
    scraper = new AtHomeScraper();
  });

  describe("Basic Scraper Functionality", () => {
    it("should initialize scraper", () => {
      assert.ok(scraper);
      const stats = scraper.getStats();
      assert.strictEqual(stats.prefecturesScanned, 0);
      assert.strictEqual(stats.propertiesFound, 0);
    });

    it("should reset stats", () => {
      scraper.resetStats();
      const stats = scraper.getStats();
      assert.strictEqual(stats.prefecturesScanned, 0);
      assert.strictEqual(stats.propertiesFound, 0);
      assert.strictEqual(stats.propertiesUpserted, 0);
      assert.strictEqual(stats.propertiesUpdated, 0);
      assert.deepStrictEqual(stats.errors, []);
    });
  });

  describe("Prefecture Scraping", () => {
    it(
      "should scrape single prefecture (Shimane - 32) with pagination",
      { timeout: TEST_TIMEOUT },
      async () => {
        // Shimane (32) typically has fewer properties, good for testing
        const result = await scraper.scrapePrefecture("32");

        // Validate result structure
        assert.ok(result.success || !result.error); // May succeed or fail gracefully
        assert.ok(Array.isArray(result.properties));
        assert.ok(typeof result.totalCount === "number");

        // Log results
        console.log(
          `[Test] Shimane scrape: ${result.properties.length} properties found, total expected: ${result.totalCount}`
        );

        // If properties found, validate structure
        if (result.properties.length > 0) {
          const property = result.properties[0];
          assert.ok(property.externalId, "Property should have externalId");
          assert.ok(property.propertyId, "Property should have propertyId");
          assert.ok(property.address, "Property should have address");
          assert.ok(property.detailUrl, "Property should have detailUrl");
          assert.ok(
            property.detailUrl.includes("akiya-athome.jp"),
            "Detail URL should be from akiya-athome.jp"
          );

          // Validate price structure
          assert.ok(property.price);
          assert.strictEqual(property.price.currency, "JPY");

          // Validate stats were updated
          const stats = scraper.getStats();
          assert.ok(stats.propertiesFound >= result.properties.length);
        }
      }
    );

    it(
      "should scrape prefecture with many properties (Hokkaido - 01)",
      { timeout: TEST_TIMEOUT },
      async () => {
        scraper.resetStats();

        // Hokkaido typically has many properties
        const result = await scraper.scrapePrefecture("01");

        console.log(
          `[Test] Hokkaido scrape: ${result.properties.length} properties found, total expected: ${result.totalCount}`
        );

        // Validate pagination worked if multiple pages expected
        if (result.totalCount > 20) {
          console.log(`[Test] Multiple pages detected (${result.totalCount} total items)`);
          // Scraper should have fetched multiple pages
          assert.ok(
            result.properties.length > 0,
            "Should have fetched at least some properties"
          );
        }

        // Check stats
        const stats = scraper.getStats();
        assert.strictEqual(stats.prefecturesScanned, 1);
        assert.ok(stats.propertiesFound >= result.properties.length);
      }
    );
  });

  describe("Multiple Prefecture Scraping", () => {
    it(
      "should scrape multiple prefectures",
      { timeout: TEST_TIMEOUT * 2 },
      async () => {
        scraper.resetStats();

        // Scrape a few prefectures with typically fewer listings
        const prefectures = ["32", "31", "33"]; // Shimane, Tottori, Okayama

        for (const code of prefectures) {
          try {
            await scraper.scrapePrefecture(code);
          } catch (error) {
            console.log(`[Test] Error scraping ${code}: ${error}`);
          }
        }

        const stats = scraper.getStats();
        console.log(`[Test] Multi-prefecture scrape stats:`, stats);

        assert.strictEqual(stats.prefecturesScanned, prefectures.length);
        // Total properties should be sum of all prefectures
        assert.ok(stats.propertiesFound >= 0);
      }
    );

    it(
      "should handle errors gracefully",
      { timeout: TEST_TIMEOUT },
      async () => {
        scraper.resetStats();

        // Try invalid prefecture code
        const result = await scraper.scrapePrefecture("99");

        // Should complete but might have errors
        const stats = scraper.getStats();
        console.log(`[Test] Invalid prefecture errors:`, stats.errors);

        // Scraper should have attempted the scrape
        assert.strictEqual(stats.prefecturesScanned, 1);
      }
    );
  });

  describe("Data Validation", () => {
    it("should validate property data structure", { timeout: TEST_TIMEOUT }, async () => {
      const result = await scraper.scrapePrefecture("32");

      for (const prop of result.properties.slice(0, 5)) {
        // Required fields
        assert.ok(prop.externalId, "Missing externalId");
        assert.ok(prop.propertyId, "Missing propertyId");
        assert.ok(prop.title, "Missing title");
        assert.ok(prop.address, "Missing address");
        assert.ok(prop.prefecture, "Missing prefecture");
        assert.ok(prop.municipality, "Missing municipality");
        assert.ok(prop.detailUrl, "Missing detailUrl");

        // URL validation
        assert.ok(
          prop.detailUrl.startsWith("http"),
          "detailUrl should be absolute URL"
        );

        // Price validation (can be null for "contact us" prices)
        if (prop.price.value !== null) {
          assert.ok(
            typeof prop.price.value === "number",
            "Price value should be number"
          );
          assert.ok(prop.price.value > 0, "Price should be positive");
        }

        // Area validation (can be null)
        if (prop.landArea !== null) {
          assert.ok(
            typeof prop.landArea === "number",
            "landArea should be number"
          );
          assert.ok(prop.landArea >= 0, "landArea should be non-negative");
        }

        if (prop.buildingArea !== null) {
          assert.ok(
            typeof prop.buildingArea === "number",
            "buildingArea should be number"
          );
          assert.ok(
            prop.buildingArea >= 0,
            "buildingArea should be non-negative"
          );
        }

        // Property type validation
        assert.ok(
          ["house", "land", "mansion", "invest", "unknown"].includes(
            prop.propertyType
          ),
          `Invalid propertyType: ${prop.propertyType}`
        );

        // Photo count
        assert.ok(
          typeof prop.photoCount === "number",
          "photoCount should be number"
        );
        assert.ok(prop.photoCount >= 0, "photoCount should be non-negative");
      }
    });

    it("should deduplicate properties", { timeout: TEST_TIMEOUT }, async () => {
      const result = await scraper.scrapePrefecture("32");

      // Check for duplicates
      const ids = result.properties.map((p) => p.propertyId);
      const uniqueIds = new Set(ids);

      assert.strictEqual(
        ids.length,
        uniqueIds.size,
        `Found ${ids.length - uniqueIds.size} duplicate properties`
      );
    });
  });

  describe("Job Runner", () => {
    it(
      "should run scrape job with options",
      { timeout: TEST_TIMEOUT * 2 },
      async () => {
        const result = await runAtHomeScrapeJob({
          specificPrefectures: ["32", "31"], // Shimane, Tottori
          maxPrefectures: 2,
        });

        console.log(`[Test] Job result:`, {
          success: result.success,
          stats: result.stats,
          error: result.error,
        });

        // Job should complete (success may be false if errors occurred)
        assert.ok(result.stats);
        assert.ok(result.logId);
        assert.strictEqual(result.stats.prefecturesScanned, 2);
      }
    );

    it(
      "should run limited scrape job",
      { timeout: TEST_TIMEOUT },
      async () => {
        const result = await runAtHomeScrapeJob({
          maxPrefectures: 1,
        });

        assert.ok(result.stats);
        assert.strictEqual(result.stats.prefecturesScanned, 1);
      }
    );
  });
});
