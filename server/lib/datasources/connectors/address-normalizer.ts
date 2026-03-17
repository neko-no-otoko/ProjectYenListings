/**
 * Japan Post Address API Normalizer
 * 
 * A TypeScript class for normalizing Japanese addresses using the
 * Japan Post Postal Code & Digital Address API.
 * 
 * For the Akiya Japan application
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Address format types supported by the API
 */
export type AddressFormat = 'kanji' | 'kana' | 'roman';

/**
 * API Scope permissions
 */
export type ApiScope = 'searchcode' | 'addresszip' | 'token';

/**
 * Authentication credentials for the API
 */
export interface AuthCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * OAuth token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Address data returned by the API
 */
export interface AddressData {
  /** Postal code (7 digits) */
  postalCode: string;
  /** Prefecture (e.g., 東京都, Tokyo) */
  prefecture: string;
  /** City/Municipality (e.g., 千代田区, Chiyoda-ku) */
  city: string;
  /** Town/Street (e.g., 大手町, Otemachi) */
  town: string;
  /** Full address string */
  fullAddress: string;
  /** Building info (only available with Digital Address lookup) */
  buildingInfo?: string;
  /** Prefecture in Kana */
  prefectureKana?: string;
  /** City in Kana */
  cityKana?: string;
  /** Town in Kana */
  townKana?: string;
  /** Prefecture in Roman characters */
  prefectureRoman?: string;
  /** City in Roman characters */
  cityRoman?: string;
  /** Town in Roman characters */
  townRoman?: string;
}

/**
 * Search result from the API
 */
export interface SearchResult {
  /** Search success status */
  success: boolean;
  /** Address data if found */
  data?: AddressData;
  /** Error message if unsuccessful */
  error?: string;
  /** Number of results */
  count: number;
}

/**
 * Configuration options for the normalizer
 */
export interface NormalizerConfig {
  /** Base URL for the API */
  baseUrl?: string;
  /** OAuth token endpoint */
  tokenUrl?: string;
  /** Preferred address format */
  defaultFormat?: AddressFormat;
  /** Cache TTL in milliseconds (default: 24 hours) */
  cacheTtl?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Cached address entry
 */
interface CacheEntry {
  data: AddressData;
  timestamp: number;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error for address normalization
 */
export class AddressNormalizationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AddressNormalizationError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AddressNormalizationError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AddressNormalizationError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

/**
 * Address not found error
 */
export class AddressNotFoundError extends AddressNormalizationError {
  constructor(message: string = 'Address not found') {
    super(message, 'NOT_FOUND');
    this.name = 'AddressNotFoundError';
  }
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * Japan Post Address Normalizer
 * 
 * Provides address lookup and normalization capabilities using the
 * official Japan Post Address API.
 * 
 * @example
 * ```typescript
 * const normalizer = new JapanPostAddressNormalizer({
 *   credentials: { clientId: 'xxx', clientSecret: 'yyy' }
 * });
 * 
 * const address = await normalizer.lookupPostalCode('1000004');
 * console.log(address.prefecture); // '東京都'
 * ```
 */
export class JapanPostAddressNormalizer {
  private credentials: AuthCredentials;
  private config: Required<NormalizerConfig>;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private cache: Map<string, CacheEntry> = new Map();

  // Default configuration
  private static readonly DEFAULT_CONFIG: Required<NormalizerConfig> = {
    baseUrl: 'https://api.da.pf.japanpost.jp',
    tokenUrl: 'https://api.da.pf.japanpost.jp/oauth2/token',
    defaultFormat: 'kanji',
    cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
    timeout: 10000, // 10 seconds
    debug: false,
  };

  /**
   * Create a new address normalizer instance
   */
  constructor(options: { credentials: AuthCredentials } & NormalizerConfig) {
    this.credentials = options.credentials;
    this.config = {
      ...JapanPostAddressNormalizer.DEFAULT_CONFIG,
      ...options,
    };
  }

  // ========================================================================
  // PUBLIC API METHODS
  // ========================================================================

  /**
   * Look up address by postal code
   * 
   * @param postalCode - 7-digit postal code (with or without hyphen)
   * @param format - Desired address format
   * @returns Address data
   * @throws AddressNotFoundError if address not found
   * @throws AuthenticationError if authentication fails
   * @throws RateLimitError if rate limit exceeded
   */
  async lookupPostalCode(
    postalCode: string,
    format: AddressFormat = this.config.defaultFormat
  ): Promise<AddressData> {
    const normalizedCode = this.normalizePostalCode(postalCode);
    const cacheKey = `postal:${normalizedCode}:${format}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.log('Cache hit for postal code:', normalizedCode);
      return cached;
    }

    // Ensure authenticated
    await this.ensureAuthenticated();

    try {
      const result = await this.searchCode({
        code: normalizedCode,
        type: 'postal',
        format,
      });

      if (!result.success || !result.data) {
        throw new AddressNotFoundError(
          `No address found for postal code: ${postalCode}`
        );
      }

      // Cache the result
      this.setCache(cacheKey, result.data);

      return result.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Look up full address by Digital Address
   * 
   * Digital Address is a 7-character alphanumeric code that represents
   * a complete address including building information.
   * 
   * @param digitalAddress - 7-character alphanumeric code (e.g., 'ABC-12D6')
   * @param format - Desired address format
   * @returns Full address data with building info
   */
  async lookupDigitalAddress(
    digitalAddress: string,
    format: AddressFormat = this.config.defaultFormat
  ): Promise<AddressData> {
    const normalizedCode = this.normalizeDigitalAddress(digitalAddress);
    const cacheKey = `digital:${normalizedCode}:${format}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.log('Cache hit for digital address:', normalizedCode);
      return cached;
    }

    // Ensure authenticated
    await this.ensureAuthenticated();

    try {
      const result = await this.searchCode({
        code: normalizedCode,
        type: 'digital',
        format,
      });

      if (!result.success || !result.data) {
        throw new AddressNotFoundError(
          `No address found for digital address: ${digitalAddress}`
        );
      }

      // Cache the result
      this.setCache(cacheKey, result.data);

      return result.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Search postal code by address
   * 
   * @param addressQuery - Partial address information
   * @returns Array of matching postal codes with addresses
   */
  async searchPostalCodeByAddress(
    addressQuery: string,
    format: AddressFormat = this.config.defaultFormat
  ): Promise<AddressData[]> {
    // Ensure authenticated
    await this.ensureAuthenticated();

    try {
      return await this.addressToZip({
        query: addressQuery,
        format,
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Normalize a complete address string
   * 
   * This method attempts to parse and normalize a messy address string
   * into structured components.
   * 
   * @param address - Raw address string
   * @returns Normalized address data
   */
  async normalizeAddress(address: string): Promise<AddressData> {
    // Extract postal code from address if present
    const postalCodeMatch = address.match(/(\d{3})[-\s]?(\d{4})/);
    
    if (postalCodeMatch) {
      const postalCode = postalCodeMatch[1] + postalCodeMatch[2];
      this.log('Extracted postal code from address:', postalCode);
      
      const addressData = await this.lookupPostalCode(postalCode);
      
      // Extract building info from original address if present
      const buildingInfo = this.extractBuildingInfo(address);
      if (buildingInfo) {
        addressData.buildingInfo = buildingInfo;
        addressData.fullAddress += ` ${buildingInfo}`;
      }
      
      return addressData;
    }

    // Try searching by address text
    const results = await this.searchPostalCodeByAddress(address);
    if (results.length > 0) {
      return results[0];
    }

    throw new AddressNotFoundError(
      `Could not normalize address: ${address}`
    );
  }

  /**
   * Format address for display
   * 
   * @param address - Address data
   * @param format - Desired format
   * @returns Formatted address string
   */
  formatAddress(address: AddressData, format: AddressFormat = 'kanji'): string {
    switch (format) {
      case 'kanji':
        return address.fullAddress;
      
      case 'kana':
        return [
          address.prefectureKana,
          address.cityKana,
          address.townKana,
        ].filter(Boolean).join('');
      
      case 'roman':
        return [
          address.prefectureRoman,
          address.cityRoman,
          address.townRoman,
        ].filter(Boolean).join(', ');
      
      default:
        return address.fullAddress;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return; // Token is still valid
    }

    await this.refreshToken();
  }

  /**
   * Refresh the OAuth access token
   */
  private async refreshToken(): Promise<void> {
    this.log('Refreshing access token...');

    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${this.encodeCredentials()}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'searchcode addresszip',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError('Invalid client credentials');
        }
        throw new Error(`Token request failed: ${response.status}`);
      }

      const tokenData: TokenResponse = await response.json();
      
      this.accessToken = tokenData.access_token;
      // Set expiry with 5-minute buffer
      this.tokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000;
      
      this.log('Token refreshed successfully');
    } catch (error) {
      this.log('Token refresh failed:', error);
      throw new AuthenticationError(
        error instanceof Error ? error.message : 'Token refresh failed'
      );
    }
  }

  /**
   * Search by code (postal or digital)
   */
  private async searchCode(params: {
    code: string;
    type: 'postal' | 'digital';
    format: AddressFormat;
  }): Promise<SearchResult> {
    const url = new URL(`${this.config.baseUrl}/v1/searchcode`);
    url.searchParams.set('code', params.code);
    url.searchParams.set('type', params.type);
    url.searchParams.set('format', params.format);

    const response = await this.fetchWithAuth(url.toString());
    return this.parseSearchResponse(response);
  }

  /**
   * Convert address to postal code
   */
  private async addressToZip(params: {
    query: string;
    format: AddressFormat;
  }): Promise<AddressData[]> {
    const url = new URL(`${this.config.baseUrl}/v1/addresszip`);
    url.searchParams.set('address', params.query);
    url.searchParams.set('format', params.format);

    const response = await this.fetchWithAuth(url.toString());
    const results = await this.parseSearchResponse(response);
    
    // The API might return multiple results
    return results.data ? [results.data] : [];
  }

  /**
   * Make authenticated API request
   */
  private async fetchWithAuth(url: string): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      throw new RateLimitError();
    }

    if (response.status === 401) {
      throw new AuthenticationError('Token expired or invalid');
    }

    return response;
  }

  /**
   * Parse API search response
   */
  private parseSearchResponse(response: Response): SearchResult {
    // This is a placeholder implementation
    // Actual implementation would depend on the exact API response format
    
    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
        count: 0,
      };
    }

    // Placeholder - actual parsing would happen here
    return {
      success: true,
      data: undefined, // Would be parsed from response
      count: 0,
    };
  }

  /**
   * Normalize postal code (remove hyphens, ensure 7 digits)
   */
  private normalizePostalCode(postalCode: string): string {
    const digits = postalCode.replace(/\D/g, '');
    if (digits.length !== 7) {
      throw new AddressNormalizationError(
        `Invalid postal code: ${postalCode}. Must be 7 digits.`,
        'INVALID_POSTAL_CODE'
      );
    }
    return digits;
  }

  /**
   * Normalize digital address
   */
  private normalizeDigitalAddress(digitalAddress: string): string {
    // Remove hyphens and spaces, ensure 7 alphanumeric characters
    const normalized = digitalAddress.replace(/[-\s]/g, '').toUpperCase();
    if (!/^[A-Z0-9]{7}$/.test(normalized)) {
      throw new AddressNormalizationError(
        `Invalid digital address: ${digitalAddress}. Must be 7 alphanumeric characters.`,
        'INVALID_DIGITAL_ADDRESS'
      );
    }
    return normalized;
  }

  /**
   * Extract building information from address string
   */
  private extractBuildingInfo(address: string): string | undefined {
    // Common patterns for building info in Japanese addresses
    const patterns = [
      /(\d+丁目\d+番\d+号.+)$/,  // Match from "X丁目Y番Z号" to end
      /([^\d]+\d+[階室号].+)$/,     // Match building with floor/room numbers
      /(.+マンション.+)$/,           // Match apartment names
      /(.+ビル.+)$/,                 // Match building names
    ];

    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Get item from cache
   */
  private getFromCache(key: string): AddressData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.cacheTtl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache
   */
  private setCache(key: string, data: AddressData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Encode credentials for Basic Auth
   */
  private encodeCredentials(): string {
    return btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`);
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): never {
    if (error instanceof AddressNormalizationError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new AddressNormalizationError(
        error.message,
        'UNKNOWN_ERROR'
      );
    }

    throw new AddressNormalizationError(
      'An unknown error occurred',
      'UNKNOWN_ERROR'
    );
  }

  /**
   * Debug logging
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[JapanPostAddressNormalizer]', ...args);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a singleton instance of the normalizer
 */
let globalNormalizer: JapanPostAddressNormalizer | null = null;

export function initializeNormalizer(
  options: { credentials: AuthCredentials } & NormalizerConfig
): JapanPostAddressNormalizer {
  globalNormalizer = new JapanPostAddressNormalizer(options);
  return globalNormalizer;
}

export function getNormalizer(): JapanPostAddressNormalizer {
  if (!globalNormalizer) {
    throw new Error(
      'Normalizer not initialized. Call initializeNormalizer() first.'
    );
  }
  return globalNormalizer;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Example 1: Basic postal code lookup
const normalizer = new JapanPostAddressNormalizer({
  credentials: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
  },
  debug: true,
});

const address = await normalizer.lookupPostalCode('100-0004');
console.log(address);
// {
//   postalCode: '1000004',
//   prefecture: '東京都',
//   city: '千代田区',
//   town: '大手町',
//   fullAddress: '東京都千代田区大手町',
//   prefectureRoman: 'Tokyo',
//   cityRoman: 'Chiyoda-ku',
//   townRoman: 'Otemachi',
//   ...
// }

// Example 2: Digital Address lookup
const fullAddress = await normalizer.lookupDigitalAddress('ABC-12D6');
console.log(fullAddress.buildingInfo); // 'JPマンション301'

// Example 3: Address normalization
const normalized = await normalizer.normalizeAddress(
  '東京都千代田区大手町2-3-1 JPマンション301'
);
console.log(normalized.fullAddress);

// Example 4: Format for international use
const romanAddress = await normalizer.lookupPostalCode('100-0004', 'roman');
console.log(normalizer.formatAddress(romanAddress, 'roman'));
// 'Tokyo, Chiyoda-ku, Otemachi'
*/

// ============================================================================
// EXPORTS
// ============================================================================

export default JapanPostAddressNormalizer;
