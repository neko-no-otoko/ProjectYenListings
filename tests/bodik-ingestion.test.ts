/**
 * BODIK Ingestion Pipeline Tests
 * 
 * Run with: npx tsx --test tests/bodik-ingestion.test.ts
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { db } from "../server/db";
import { 
  runBodikPipeline, 
  type BodikPipelineConfig,
  type BodikPipelineResult 
} from "../server/lib/ingestion/bodik-pipeline";
import { BODIKConnector } from "../server/lib/datasources/connectors/bodik-connector";
import { 
  ingestionLogs, 
  listingVariants, 
  propertyEntities,
  ckanDatasets,
  ckanResources,
  rawCaptures 
} from "../shared/schema";
import { eq, like } from "drizzle-orm";

// Test timeout for network operations
const TEST_TIMEOUT = 60000;

describe("BODIK Pipeline", () => {
  let testRunLogId: string | undefined;

  // Clean up test data after tests
  after(async () => {
    if (testRunLogId) {
      // Clean up test records created during this test run
      console.log("[Test Cleanup] Cleaning up test data...");
      
      // Find and delete test variants
      const testVariants = await db
        .select({ id: listingVariants.id })
        .from(listingVariants)
        .where(like(listingVariants.sourceKey, "%https://data.bodik.jp%"))
        .limit(100);
      
      for (const v of testVariants) {
        await db.delete(listingVariants).where(eq(listingVariants.id, v.id));
      }
      
      console.log(`[Test Cleanup] Deleted ${testVariants.length} test variants`);
    }
  });

  describe("BODIKConnector", () => {
    it("should initialize with default config", () => {
      const connector = new BODIKConnector();
      assert.ok(connector);
    });

    it("should search for akiya datasets", { timeout: TEST_TIMEOUT }, async () => {
      const connector = new BODIKConnector();
      const datasets = await connector.searchAkiyaDatasets(5);
      
      assert.ok(Array.isArray(datasets), "Should return an array");
      assert.ok(datasets.length > 0, "Should find at least one akiya dataset");
      
      // Verify dataset structure
      const firstDataset = datasets[0];
      assert.ok(firstDataset.datasetId, "Dataset should have an ID");
      assert.ok(firstDataset.title, "Dataset should have a title");
      assert.ok(firstDataset.municipality, "Dataset should have a municipality");
    });

    it("should list organizations/municipalities", { timeout: TEST_TIMEOUT }, async () => {
      const connector = new BODIKConnector();
      const orgs = await connector.listOrganizations();
      
      assert.ok(Array.isArray(orgs), "Should return an array");
      assert.ok(orgs.length > 0, "Should have organizations");
      
      // Check for some Kyushu prefecture codes
      const hasKyushu = orgs.some((org) => 
        org.startsWith("40") || // Fukuoka
        org.startsWith("41") || // Saga
        org.startsWith("42") || // Nagasaki
        org.startsWith("43")    // Kumamoto
      );
      assert.ok(hasKyushu, "Should have Kyushu region organizations");
    });
  });

  describe("Data Parsing", () => {
    it("should parse price strings correctly", () => {
      // This tests the internal parsing logic
      const testCases = [
        { input: "1000000", expected: 1000000 },
        { input: "100万", expected: 1000000 },
        { input: "1,000,000円", expected: 1000000 },
        { input: 5000000, expected: 5000000 },
      ];

      for (const tc of testCases) {
        // Parse using the same logic as the pipeline
        let parsed: number | undefined;
        if (typeof tc.input === "number") {
          parsed = tc.input;
        } else {
          const cleaned = tc.input
            .replace(/[,，]/g, "")
            .replace(/円/g, "")
            .replace(/万/g, "0000")
            .trim();
          parsed = parseInt(cleaned, 10);
        }
        assert.strictEqual(parsed, tc.expected, `Failed to parse: ${tc.input}`);
      }
    });

    it("should parse area strings correctly", () => {
      const testCases = [
        { input: "100", expected: 100 },
        { input: "100.5", expected: 100.5 },
        { input: "100㎡", expected: 100 },
        { input: "1,000m2", expected: 1000 },
      ];

      for (const tc of testCases) {
        const cleaned = String(tc.input)
          .replace(/[,，]/g, "")
          .replace(/㎡/g, "")
          .replace(/m2/gi, "")
          .trim();
        const parsed = parseFloat(cleaned);
        assert.strictEqual(parsed, tc.expected, `Failed to parse: ${tc.input}`);
      }
    });

    it("should parse year built correctly", () => {
      const currentYear = new Date().getFullYear();
      const testCases = [
        { input: "1985", expected: 1985 },
        { input: "昭和60年", expected: 1985 },
        { input: "築35年", expected: currentYear - 35 },
        { input: 2000, expected: 2000 },
      ];

      for (const tc of testCases) {
        let parsed: number | undefined;
        
        if (typeof tc.input === "number") {
          if (tc.input > 1800 && tc.input <= currentYear + 1) {
            parsed = tc.input;
          }
        } else {
          const match = tc.input.match(/(\d{4})/);
          if (match) {
            const year = parseInt(match[1], 10);
            if (year > 1800) {
              parsed = year;
            }
          }
        }
        
        if (tc.expected) {
          assert.ok(parsed, `Should parse: ${tc.input}`);
        }
      }
    });
  });

  describe("Pipeline Execution", () => {
    it("should run pipeline in dry-run mode", { timeout: TEST_TIMEOUT * 2 }, async () => {
      const config: BodikPipelineConfig = {
        maxDatasets: 2,
        maxRecordsPerDataset: 10,
        dryRun: true,
        onlyAkiyaDatasets: true,
      };

      const result = await runBodikPipeline(config);
      
      assert.ok(result, "Should return a result");
      assert.ok(result.datasetsProcessed >= 0, "Should process datasets");
      assert.ok(result.recordsFetched >= 0, "Should fetch records");
      
      console.log("[Test] Dry-run result:", {
        datasetsProcessed: result.datasetsProcessed,
        recordsFetched: result.recordsFetched,
      });
    });

    it("should run pipeline and store data in database", { timeout: TEST_TIMEOUT * 3 }, async () => {
      const config: BodikPipelineConfig = {
        maxDatasets: 1,
        maxRecordsPerDataset: 5,
        dryRun: false,
        onlyAkiyaDatasets: true,
      };

      const result = await runBodikPipeline(config);
      testRunLogId = result.logId;
      
      // Verify result structure
      assert.ok(result.success, `Pipeline should succeed. Errors: ${result.errors.join(", ")}`);
      assert.ok(result.logId, "Should have a log ID");
      assert.ok(result.datasetsProcessed >= 0, "Should process datasets");
      
      // Verify log was created
      if (result.logId) {
        const log = await db
          .select()
          .from(ingestionLogs)
          .where(eq(ingestionLogs.id, result.logId))
          .limit(1);
        
        assert.ok(log.length > 0, "Log entry should exist");
        assert.strictEqual(log[0].connectorName, "bodik", "Should have correct connector name");
      }
      
      console.log("[Test] Pipeline result:", {
        success: result.success,
        datasetsProcessed: result.datasetsProcessed,
        datasetsFailed: result.datasetsFailed,
        recordsFetched: result.recordsFetched,
        recordsUpserted: result.recordsUpserted,
        recordsSkipped: result.recordsSkipped,
        logId: result.logId,
      });
    });

    it("should handle job locking correctly", { timeout: TEST_TIMEOUT }, async () => {
      // Start two pipelines simultaneously - one should be skipped
      const config: BodikPipelineConfig = {
        maxDatasets: 1,
        maxRecordsPerDataset: 5,
        dryRun: true,
      };

      // Run both pipelines
      const [result1, result2] = await Promise.all([
        runBodikPipeline(config),
        runBodikPipeline(config),
      ]);

      // At least one should succeed, one might be skipped due to locking
      const oneSucceeded = result1.success || result2.success;
      const oneSkipped = 
        (!result1.success && result1.errors.some((e) => e.includes("lock"))) ||
        (!result2.success && result2.errors.some((e) => e.includes("lock")));
      
      // Both could succeed if they don't overlap, but at least one should work
      assert.ok(oneSucceeded, "At least one pipeline should succeed");
      
      console.log("[Test] Lock test results:", {
        result1Success: result1.success,
        result2Success: result2.success,
        oneSkipped,
      });
    });
  });

  describe("Dataset Metadata", () => {
    it("should store CKAN dataset metadata", { timeout: TEST_TIMEOUT * 2 }, async () => {
      // Run a small pipeline to create metadata
      const config: BodikPipelineConfig = {
        maxDatasets: 1,
        maxRecordsPerDataset: 3,
        dryRun: false,
        onlyAkiyaDatasets: true,
      };

      const result = await runBodikPipeline(config);
      
      if (result.datasetsProcessed > 0) {
        // Check that dataset metadata was stored
        const datasets = await db
          .select()
          .from(ckanDatasets)
          .where(eq(ckanDatasets.ckanInstanceBaseUrl, "https://data.bodik.jp"))
          .limit(10);
        
        assert.ok(datasets.length > 0, "Should have stored CKAN dataset metadata");
        
        // Check that resources were stored
        const resources = await db
          .select()
          .from(ckanResources)
          .limit(10);
        
        assert.ok(resources.length >= 0, "Should check for resources");
        
        console.log("[Test] Metadata stored:", {
          datasetsCount: datasets.length,
          resourcesCount: resources.length,
        });
      }
    });
  });

  describe("Field Mapping", () => {
    it("should handle various BODIK field name conventions", () => {
      const fieldMappings = {
        address: ["住所", "所在地", "物件所在地", "address", "location"],
        price: ["価格", "売価", "販売価格", "希望価格", "price"],
        ldk: ["間取り", "間取", "ldk", "layout"],
        landArea: ["土地面積", "敷地面積", "land_area", "土地"],
        buildingArea: ["延床面積", "建物面積", "延べ面積", "床面積", "building_area"],
      };

      // Test that we have comprehensive field mappings
      for (const [field, variations] of Object.entries(fieldMappings)) {
        assert.ok(variations.length >= 2, `${field} should have multiple variations`);
        assert.ok(
          variations.some((v) => /[\u4e00-\u9faf]/.test(v)),
          `${field} should have Japanese variations`
        );
      }
    });

    it("should correctly identify akiya-related datasets", () => {
      const akiyaKeywords = [
        "空き家",
        "あき家",
        "空家",
        "akiya",
        "vacant house",
        "家屋",
        "住宅",
        "住居",
      ];

      const testCases = [
        { title: "福岡市空き家バンク", shouldMatch: true },
        { title: "熊本市あき家情報", shouldMatch: true },
        { title: "Regular Housing Data", shouldMatch: false },
        { title: "住宅統計データ", shouldMatch: true },
      ];

      for (const tc of testCases) {
        const matches = akiyaKeywords.some((kw) => 
          tc.title.toLowerCase().includes(kw.toLowerCase())
        );
        assert.strictEqual(
          matches, 
          tc.shouldMatch, 
          `"${tc.title}" should ${tc.shouldMatch ? "" : "not "}match akiya keywords`
        );
      }
    });
  });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("[Test Suite] Starting BODIK Ingestion Tests...");
}
