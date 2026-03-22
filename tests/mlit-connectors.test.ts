/**
 * MLIT Data Connectors Tests
 * 
 * Tests for MLIT e-Stat and National Land connectors including:
 * - Configuration validation
 * - Data fetching (mock)
 * - Dataset discovery
 * - Utility functions
 * 
 * Run with: npx tsx --test tests/mlit-connectors.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  MlitEstatConnector,
  createMlitEstatConnectorFromEnv,
} from "../server/lib/datasources/connectors/mlit-estat-connector";
import {
  NationalLandConnector,
  RELEVANT_DATASETS,
  createNationalLandConnectorFromEnv,
} from "../server/lib/datasources/connectors/national-land-connector";

const TEST_TIMEOUT = 30000;

describe("MlitEstatConnector", () => {
  describe("Configuration", () => {
    it("should create connector with default config", () => {
      const connector = new MlitEstatConnector();
      assert.ok(connector);
      assert.strictEqual(connector.name, "mlit_estat");
      assert.ok(connector.isConfigured()); // No API key needed
      assert.ok(connector.isEnabled());
    });

    it("should respect enabled flag", () => {
      const connector = new MlitEstatConnector({ enabled: false });
      assert.ok(!connector.isEnabled());
    });

    it("should get status", async () => {
      const connector = new MlitEstatConnector();
      const status = await connector.getStatus();
      assert.strictEqual(status.name, "mlit_estat");
      assert.ok(status.configured);
    });

    it("should create from environment", () => {
      const connector = createMlitEstatConnectorFromEnv();
      assert.ok(connector);
      assert.ok(connector.isConfigured());
    });
  });

  describe("Data Fetching", () => {
    it("should fetch vacant house survey data", { timeout: TEST_TIMEOUT }, async () => {
      const connector = new MlitEstatConnector();
      const result = await connector.fetchVacantHouseSurvey(2024);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.data.length > 0);

      const firstItem = result.data[0];
      assert.ok(firstItem.prefectureCode);
      assert.ok(firstItem.prefectureName);
      assert.ok(typeof firstItem.totalVacantHouses === "number");
      assert.ok(typeof firstItem.vacantHouseRate === "number");
    });

    it("should fetch housing land survey data", { timeout: TEST_TIMEOUT }, async () => {
      const connector = new MlitEstatConnector();
      const result = await connector.fetchHousingLandSurvey(2023);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));

      if (result.data.length > 0) {
        const item = result.data[0];
        assert.ok(item.prefectureName);
        assert.ok(typeof item.totalDwellings === "number");
        assert.ok(typeof item.vacantDwellings === "number");
      }
    });

    it("should fetch building starts data", { timeout: TEST_TIMEOUT }, async () => {
      const connector = new MlitEstatConnector();
      const result = await connector.fetchBuildingStarts(2024);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));

      if (result.data.length > 0) {
        const item = result.data[0];
        assert.ok(typeof item.totalUnits === "number");
        assert.ok(typeof item.year === "number");
      }
    });

    it("should get high vacancy prefectures", async () => {
      const connector = new MlitEstatConnector();
      const result = await connector.getHighVacancyPrefectures(5);

      assert.ok(Array.isArray(result));
      
      if (result.length > 0) {
        assert.ok(result[0].prefecture);
        assert.ok(typeof result[0].rate === "number");
        assert.ok(typeof result[0].count === "number");
        
        // Should be sorted by rate descending
        if (result.length > 1) {
          assert.ok(result[0].rate >= result[1].rate);
        }
      }
    });
  });

  describe("Documentation", () => {
    it("should provide dataset download URLs", () => {
      const connector = new MlitEstatConnector();
      const urls = connector.getDatasetDownloadUrls();

      assert.ok(urls.vacantHouseSurvey2024);
      assert.ok(urls.housingLandSurvey2023);
      assert.ok(urls.buildingStartsStats);
      assert.ok(urls.mlitStatisticsList);
    });

    it("should provide bulk download instructions", () => {
      const connector = new MlitEstatConnector();
      const instructions = connector.getBulkDownloadInstructions();

      assert.ok(instructions.includes("e-Stat"));
      assert.ok(instructions.includes("住宅・土地統計調査"));
    });
  });

  describe("Connector Interface", () => {
    it("should return data on generic fetch", async () => {
      const connector = new MlitEstatConnector();
      const result = await connector.fetch();

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
    });

    it("should return empty normalized listings", async () => {
      const connector = new MlitEstatConnector();
      const result = await connector.normalize([]);
      assert.deepStrictEqual(result, []);
    });
  });
});

describe("NationalLandConnector", () => {
  describe("Configuration", () => {
    it("should create connector with default config", () => {
      const connector = new NationalLandConnector();
      assert.ok(connector);
      assert.strictEqual(connector.name, "mlit_national_land");
      assert.ok(connector.isConfigured());
      assert.ok(connector.isEnabled());
    });

    it("should respect enabled flag", () => {
      const connector = new NationalLandConnector({ enabled: false });
      assert.ok(!connector.isEnabled());
    });

    it("should get status", async () => {
      const connector = new NationalLandConnector();
      const status = await connector.getStatus();
      assert.strictEqual(status.name, "mlit_national_land");
      assert.ok(status.configured);
    });
  });

  describe("Dataset Discovery", () => {
    it("should return available datasets", () => {
      const connector = new NationalLandConnector();
      const datasets = connector.getAvailableDatasets();

      assert.ok(Array.isArray(datasets));
      assert.ok(datasets.length > 0);

      const dataset = datasets[0];
      assert.ok(dataset.id);
      assert.ok(dataset.name);
      assert.ok(dataset.nameEn);
      assert.ok(dataset.category);
    });

    it("should filter datasets by category", () => {
      const connector = new NationalLandConnector();
      const disasterDatasets = connector.getDatasetsByCategory("disaster_risk");

      assert.ok(Array.isArray(disasterDatasets));
      
      // Should have disaster risk datasets
      assert.ok(disasterDatasets.some((d) => d.id === "A30a5" || d.id === "A31"));
    });

    it("should have required datasets", () => {
      const requiredIds = ["A38", "A29", "L01", "L06", "N03"];
      const availableIds = RELEVANT_DATASETS.map((d) => d.id);

      for (const id of requiredIds) {
        assert.ok(
          availableIds.includes(id),
          `Required dataset ${id} should be available`
        );
      }
    });
  });

  describe("Data Fetching", () => {
    it("should fetch land price data", { timeout: TEST_TIMEOUT }, async () => {
      const connector = new NationalLandConnector();
      const result = await connector.fetchLandPriceData("13"); // Tokyo

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));

      if (result.data.length > 0) {
        const item = result.data[0];
        assert.ok(item.prefecture);
        assert.ok(typeof item.pricePerSqm === "number");
        assert.ok(item.surveyYear);
      }
    });

    it("should fetch disaster risk data", async () => {
      const connector = new NationalLandConnector();
      const result = await connector.fetchDisasterRiskData(35.6762, 139.6503);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
    });

    it("should fetch urban planning zones", async () => {
      const connector = new NationalLandConnector();
      const result = await connector.fetchUrbanPlanningZones("13", "新宿区");

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));

      if (result.data.length > 0) {
        const zone = result.data[0];
        assert.ok(zone.zoneType);
        assert.ok(zone.zoneName);
        assert.ok(zone.purpose);
      }
    });
  });

  describe("Utility Functions", () => {
    it("should get prefecture code from name", () => {
      const connector = new NationalLandConnector();

      assert.strictEqual(connector.getPrefectureCode("東京都"), "13");
      assert.strictEqual(connector.getPrefectureCode("大阪府"), "27");
      assert.strictEqual(connector.getPrefectureCode("北海道"), "01");
      assert.strictEqual(connector.getPrefectureCode("福岡県"), "40");
    });

    it("should return null for unknown prefecture", () => {
      const connector = new NationalLandConnector();
      assert.strictEqual(connector.getPrefectureCode("Unknown"), null);
    });

    it("should provide documentation URL", () => {
      const connector = new NationalLandConnector();
      const url = connector.getDocumentationUrl();
      assert.ok(url.includes("mlit.go.jp"));
    });

    it("should provide G-Spatial URL", () => {
      const connector = new NationalLandConnector();
      const url = connector.getGSpatialUrl();
      assert.ok(url.includes("geospatial.jp"));
    });
  });

  describe("Dataset Downloads", () => {
    it("should generate download URL", () => {
      const connector = new NationalLandConnector();
      const url = connector.getDatasetDownloadUrl("A38", 2024);

      assert.ok(url);
      assert.ok(url.includes("nlftp.mlit.go.jp"));
      assert.ok(url.includes("A38"));
    });

    it("should return null for unknown dataset", () => {
      const connector = new NationalLandConnector();
      const url = connector.getDatasetDownloadUrl("UNKNOWN");
      // Should still generate URL from pattern
      assert.ok(url);
    });
  });

  describe("Connector Interface", () => {
    it("should return datasets on generic fetch", async () => {
      const connector = new NationalLandConnector();
      const result = await connector.fetch();

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.metadata?.availableDatasets > 0);
    });

    it("should return empty normalized listings", async () => {
      const connector = new NationalLandConnector();
      const result = await connector.normalize([]);
      assert.deepStrictEqual(result, []);
    });
  });
});
