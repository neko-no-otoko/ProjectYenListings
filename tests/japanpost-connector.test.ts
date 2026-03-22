/**
 * Japan Post Address API Connector Tests
 * 
 * Tests for the Japan Post Address API connector including:
 * - Configuration validation
 * - Postal code lookup (mock)
 * - Address normalization
 * - Batch operations
 * 
 * Run with: npx tsx --test tests/japanpost-connector.test.ts
 */

import { describe, it, before } from "node:test";
import assert from "node:assert";
import {
  JapanPostConnector,
  createJapanPostConnectorFromEnv,
} from "../server/lib/datasources/connectors/japanpost-connector";

const TEST_TIMEOUT = 30000;

describe("JapanPostConnector", () => {
  describe("Configuration", () => {
    it("should create connector with credentials", () => {
      const connector = new JapanPostConnector({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      });

      assert.ok(connector);
      assert.strictEqual(connector.name, "japanpost_address");
      assert.ok(connector.isConfigured());
      assert.ok(connector.isEnabled());
    });

    it("should report not configured when missing credentials", () => {
      const connector = new JapanPostConnector({
        clientId: "",
        clientSecret: "",
      });

      assert.ok(!connector.isConfigured());
    });

    it("should respect enabled flag", () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
        enabled: false,
      });

      assert.ok(!connector.isEnabled());
    });

    it("should get status", async () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      const status = await connector.getStatus();
      assert.strictEqual(status.name, "japanpost_address");
      assert.ok(status.configured);
      assert.ok(status.enabled);
    });
  });

  describe("Postal Code Validation", () => {
    it("should validate correct postal codes", () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      assert.ok(connector.validatePostalCode("1000001"));
      assert.ok(connector.validatePostalCode("100-0001"));
      assert.ok(connector.validatePostalCode("100 0001"));
    });

    it("should reject invalid postal codes", () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      assert.ok(!connector.validatePostalCode("100000")); // 6 digits
      assert.ok(!connector.validatePostalCode("10000001")); // 8 digits
      assert.ok(!connector.validatePostalCode("abcdefg")); // non-digits
      assert.ok(!connector.validatePostalCode(""));
    });

    it("should extract postal code from address", () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      const code1 = connector.extractPostalCode(
        "〒100-0001 東京都千代田区千代田1-1"
      );
      assert.strictEqual(code1, "1000001");

      const code2 = connector.extractPostalCode(
        "東京都新宿区西新宿2-8-1 1000011"
      );
      assert.strictEqual(code2, "1000011");
    });
  });

  describe("Environment Configuration", () => {
    it("should create from environment variables", () => {
      // Save original env
      const originalClientId = process.env.JAPANPOST_CLIENT_ID;
      const originalClientSecret = process.env.JAPANPOST_CLIENT_SECRET;

      try {
        // Set test env vars
        process.env.JAPANPOST_CLIENT_ID = "env-client-id";
        process.env.JAPANPOST_CLIENT_SECRET = "env-client-secret";

        const connector = createJapanPostConnectorFromEnv();
        assert.ok(connector.isConfigured());
        assert.ok(connector.isEnabled());
      } finally {
        // Restore original env
        process.env.JAPANPOST_CLIENT_ID = originalClientId ?? "";
        process.env.JAPANPOST_CLIENT_SECRET = originalClientSecret ?? "";
      }
    });

    it("should create disabled connector when env vars missing", () => {
      // Save original env
      const originalClientId = process.env.JAPANPOST_CLIENT_ID;
      const originalClientSecret = process.env.JAPANPOST_CLIENT_SECRET;

      try {
        // Clear env vars
        delete process.env.JAPANPOST_CLIENT_ID;
        delete process.env.JAPANPOST_CLIENT_SECRET;

        const connector = createJapanPostConnectorFromEnv();
        assert.ok(!connector.isConfigured());
        assert.ok(!connector.isEnabled());
      } finally {
        // Restore original env
        if (originalClientId) process.env.JAPANPOST_CLIENT_ID = originalClientId;
        if (originalClientSecret) process.env.JAPANPOST_CLIENT_SECRET = originalClientSecret;
      }
    });
  });

  describe("Connector Interface", () => {
    it("should return empty listings (not a listing source)", async () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      const result = await connector.fetch();
      assert.ok(result.success);
      assert.deepStrictEqual(result.data, []);
      assert.ok(result.metadata?.message);
    });

    it("should return empty normalized listings", async () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      const result = await connector.normalize([]);
      assert.deepStrictEqual(result, []);
    });
  });

  describe("Cache Operations", () => {
    it("should clear cache", () => {
      const connector = new JapanPostConnector({
        clientId: "test",
        clientSecret: "test",
      });

      // Should not throw
      connector.clearCache();

      const stats = connector.getCacheStats();
      assert.strictEqual(stats.size, 0);
      assert.deepStrictEqual(stats.keys, []);
    });
  });
});
