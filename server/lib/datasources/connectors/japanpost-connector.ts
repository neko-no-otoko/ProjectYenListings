/**
 * Japan Post Address API Connector
 * 
 * Implements the Connector interface for Japan Post Address API.
 * Provides address normalization, postal code lookup, and validation.
 * 
 * API Registration: https://www.post.japanpost.jp/digital_address_api/
 */

import type {
  Connector,
  ConnectorStatus,
  FetchResult,
  NormalizedListing,
  SourceType,
} from "../../connectors/types";
import type { InsertRawCapture } from "@shared/schema";
import { JapanPostAddressNormalizer, type AddressData, type AuthCredentials } from "./address-normalizer";

export interface JapanPostConfig {
  clientId: string;
  clientSecret: string;
  enabled?: boolean;
  rateLimitPerMin?: number;
}

/**
 * Japan Post Address API Connector
 * 
 * This connector provides:
 * - Address normalization from raw strings
 * - Postal code lookup
 * - Digital address lookup
 * - Address validation
 */
export class JapanPostConnector implements Connector {
  readonly name = "japanpost_address";
  readonly sourceType: SourceType = "manual"; // Used for address enrichment, not listings
  
  private normalizer: JapanPostAddressNormalizer | null = null;
  private config: JapanPostConfig;
  private lastRunAt?: Date;
  private lastError?: string;
  private itemsFetched = 0;
  private itemsUpserted = 0;

  constructor(config: JapanPostConfig) {
    this.config = {
      enabled: true,
      rateLimitPerMin: 60,
      ...config,
    };

    if (this.isConfigured()) {
      this.normalizer = new JapanPostAddressNormalizer({
        credentials: {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
        },
        debug: process.env.NODE_ENV === "development",
      });
    }
  }

  /**
   * Check if the connector is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Check if the connector is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  /**
   * Get current connector status
   */
  async getStatus(): Promise<ConnectorStatus> {
    return {
      name: this.name,
      configured: this.isConfigured(),
      enabled: this.isEnabled(),
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      itemsFetched: this.itemsFetched,
      itemsUpserted: this.itemsUpserted,
    };
  }

  /**
   * Look up address by postal code
   */
  async lookupPostalCode(postalCode: string): Promise<AddressData> {
    if (!this.normalizer) {
      throw new Error("Japan Post normalizer not initialized. Check credentials.");
    }

    try {
      this.itemsFetched++;
      return await this.normalizer.lookupPostalCode(postalCode);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  /**
   * Normalize a raw address string
   */
  async normalizeAddress(address: string): Promise<AddressData> {
    if (!this.normalizer) {
      throw new Error("Japan Post normalizer not initialized. Check credentials.");
    }

    try {
      this.itemsFetched++;
      return await this.normalizer.normalizeAddress(address);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  /**
   * Search postal codes by address query
   */
  async searchByAddress(query: string): Promise<AddressData[]> {
    if (!this.normalizer) {
      throw new Error("Japan Post normalizer not initialized. Check credentials.");
    }

    try {
      this.itemsFetched++;
      return await this.normalizer.searchPostalCodeByAddress(query);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  /**
   * Batch normalize multiple addresses
   */
  async batchNormalize(addresses: string[]): Promise<Map<string, AddressData | Error>> {
    const results = new Map<string, AddressData | Error>();

    for (const address of addresses) {
      try {
        const normalized = await this.normalizeAddress(address);
        results.set(address, normalized);
      } catch (error) {
        results.set(address, error instanceof Error ? error : new Error(String(error)));
      }
    }

    return results;
  }

  /**
   * Validate a postal code format
   */
  validatePostalCode(postalCode: string): boolean {
    // Japanese postal codes are 7 digits (e.g., 100-0004 or 1000004)
    const digits = postalCode.replace(/\D/g, "");
    return /^\d{7}$/.test(digits);
  }

  /**
   * Extract postal code from address string
   */
  extractPostalCode(address: string): string | null {
    const match = address.match(/(\d{3})[-\s]?(\d{4})/);
    return match ? match[1] + match[2] : null;
  }

  /**
   * Format address in different formats
   */
  formatAddress(address: AddressData, format: "kanji" | "kana" | "roman" = "kanji"): string {
    if (!this.normalizer) {
      throw new Error("Japan Post normalizer not initialized.");
    }

    return this.normalizer.formatAddress(address, format);
  }

  /**
   * Required by Connector interface - not used for address API
   */
  async fetch(): Promise<FetchResult<unknown>> {
    // This connector doesn't fetch listings, it enriches addresses
    return {
      success: true,
      data: [],
      metadata: {
        message: "Japan Post connector is for address enrichment, not listing fetching",
      },
    };
  }

  /**
   * Required by Connector interface - not used for address API
   */
  async normalize(): Promise<NormalizedListing[]> {
    // This connector doesn't normalize listings, it normalizes addresses
    return [];
  }

  /**
   * Clear the address cache
   */
  clearCache(): void {
    this.normalizer?.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.normalizer?.getCacheStats() ?? { size: 0, keys: [] };
  }
}

/**
 * Create connector from environment variables
 */
export function createJapanPostConnectorFromEnv(): JapanPostConnector {
  const clientId = process.env.JAPANPOST_CLIENT_ID;
  const clientSecret = process.env.JAPANPOST_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[JapanPostConnector] Missing JAPANPOST_CLIENT_ID or JAPANPOST_CLIENT_SECRET");
  }

  return new JapanPostConnector({
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
    enabled: !!(clientId && clientSecret),
  });
}

export default JapanPostConnector;
