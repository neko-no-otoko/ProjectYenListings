/**
 * Google Maps Geocoding API Connector
 * 
 * A comprehensive TypeScript client for geocoding Japanese addresses
 * using the Google Maps Geocoding API.
 * 
 * Features:
 * - Single and batch geocoding for Japanese addresses
 * - Intelligent rate limiting with token bucket algorithm
 * - Multi-tier caching (memory + persistent)
 * - Ambiguous address handling with suggestions
 * - Reverse geocoding support
 * - Address component parsing optimized for Japanese addresses
 * 
 * For the Akiya Japan application
 * 
 * @see https://developers.google.com/maps/documentation/geocoding/overview
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Google Maps geocoder address component (local definition)
 */
interface GeocoderAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Geocoding result with coordinates and address components
 */
export interface GeocodingResult {
  /** Unique identifier for this result */
  id: string;
  /** Formatted full address */
  formattedAddress: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Place ID from Google Maps */
  placeId: string;
  /** Address components (parsed) */
  components: AddressComponents;
  /** Location type (ROOFTOP, RANGE_INTERPOLATED, etc.) */
  locationType: LocationType;
  /** Viewport for map display */
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  /** Partial match indicator */
  partialMatch: boolean;
  /** Types of this location (street_address, premise, etc.) */
  types: string[];
  /** Original input address */
  originalInput: string;
  /** Timestamp of geocoding */
  geocodedAt: Date;
}

/**
 * Parsed address components for Japanese addresses
 */
export interface AddressComponents {
  /** Prefecture (e.g., 東京都) */
  prefecture?: string;
  /** City/Municipality (e.g., 千代田区) */
  city?: string;
  /** Town/Ward (e.g., 大手町) */
  town?: string;
  /** Street address with chome/ban/go */
  street?: string;
  /** Building name/floor */
  building?: string;
  /** Postal code */
  postalCode?: string;
  /** Country (always Japan) */
  country: string;
  /** Country code */
  countryCode: string;
  /** Full component array for advanced use */
  rawComponents: GeocoderAddressComponent[];
}

/**
 * Location type accuracy levels
 */
export type LocationType =
  | 'ROOFTOP'           // Precise street address
  | 'RANGE_INTERPOLATED' // Interpolated between two precise points
  | 'GEOMETRIC_CENTER'   // Center of result (e.g., a city)
  | 'APPROXIMATE';       // Approximate location

/**
 * Batch geocoding result
 */
export interface BatchGeocodingResult {
  /** Successfully geocoded results */
  successful: GeocodingResult[];
  /** Failed addresses with error details */
  failed: FailedGeocoding[];
  /** Ambiguous addresses requiring clarification */
  ambiguous: AmbiguousAddress[];
  /** Summary statistics */
  stats: BatchStats;
}

/**
 * Failed geocoding entry
 */
export interface FailedGeocoding {
  /** Original input */
  input: string;
  /** Error code */
  errorCode: string;
  /** Error message */
  errorMessage: string;
  /** Retryable flag */
  retryable: boolean;
}

/**
 * Ambiguous address with suggestions
 */
export interface AmbiguousAddress {
  /** Original input */
  input: string;
  /** Multiple possible matches */
  suggestions: GeocodingResult[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for ambiguity */
  reason: string;
}

/**
 * Batch processing statistics
 */
export interface BatchStats {
  total: number;
  success: number;
  failed: number;
  ambiguous: number;
  processingTimeMs: number;
  cached: number;
}

/**
 * Reverse geocoding result
 */
export interface ReverseGeocodingResult {
  addresses: GeocodingResult[];
  nearestStation?: {
    name: string;
    distance: number; // meters
  };
}

/**
 * Configuration options for the geocoder
 */
export interface GeocoderConfig {
  /** Google Maps API key */
  apiKey: string;
  /** Region bias (default: 'jp' for Japan) */
  regionBias?: string;
  /** Language (default: 'ja') */
  language?: string;
  /** Component filters */
  components?: Record<string, string>;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Cache TTL in ms (default: 7 days) */
  cacheTtl?: number;
  /** Max cache size (default: 1000 entries) */
  maxCacheSize?: number;
  /** Rate limit: requests per second (default: 50) */
  rateLimitRps?: number;
  /** Batch size for concurrent requests (default: 10) */
  batchSize?: number;
  /** Retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Base URL (for testing) */
  baseUrl?: string;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  result: GeocodingResult;
  timestamp: number;
  accessCount: number;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base geocoding error
 */
export class GeocodingError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'GeocodingError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends GeocodingError {
  constructor(message: string = 'Rate limit exceeded', public retryAfterMs?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', true);
    this.name = 'RateLimitError';
  }
}

/**
 * Address not found error
 */
export class AddressNotFoundError extends GeocodingError {
  constructor(address: string) {
    super(`Address not found: ${address}`, 'ADDRESS_NOT_FOUND', false);
    this.name = 'AddressNotFoundError';
  }
}

/**
 * Ambiguous address error with suggestions
 */
export class AmbiguousAddressError extends GeocodingError {
  constructor(
    message: string,
    public suggestions: GeocodingResult[],
    public originalInput: string
  ) {
    super(message, 'AMBIGUOUS_ADDRESS', false);
    this.name = 'AmbiguousAddressError';
  }
}

/**
 * API key invalid error
 */
export class AuthenticationError extends GeocodingError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTH_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Network/timeout error
 */
export class NetworkError extends GeocodingError {
  constructor(message: string = 'Network error') {
    super(message, 'NETWORK_ERROR', true);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// RATE LIMITER (Token Bucket)
// ============================================================================

/**
 * Token bucket rate limiter for API requests
 */
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private queue: Array<() => void> = [];

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond; // tokens per second
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Need to wait
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.scheduleNextRefill();
    });
  }

  /**
   * Try to acquire without waiting
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Schedule processing of queued requests
   */
  private scheduleNextRefill(): void {
    if (this.queue.length === 0) return;

    const neededTokens = Math.ceil(this.queue.length / this.refillRate) * 1000;
    setTimeout(() => {
      this.refill();
      while (this.tokens >= 1 && this.queue.length > 0) {
        this.tokens--;
        const resolve = this.queue.shift();
        resolve?.();
      }
      if (this.queue.length > 0) {
        this.scheduleNextRefill();
      }
    }, neededTokens);
  }
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * Google Maps Geocoder Client
 * 
 * Provides comprehensive geocoding capabilities for Japanese addresses
 * with rate limiting, caching, and batch processing.
 * 
 * @example
 * ```typescript
 * const geocoder = new GoogleMapsGeocoder({
 *   apiKey: 'your-api-key',
 *   debug: true
 * });
 * 
 * // Single address
 * const result = await geocoder.geocode('東京都千代田区大手町2-3-1');
 * console.log(result.lat, result.lng);
 * 
 * // Batch processing
 * const batch = await geocoder.geocodeBatch([
 *   '東京都新宿区西新宿2-8-1',
 *   '大阪府大阪市中央区大手前2-1',
 *   '北海道札幌市中央区北1条西2丁目'
 * ]);
 * ```
 */
export class GoogleMapsGeocoder {
  private config: Required<GeocoderConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimiter: TokenBucketRateLimiter;
  private requestCount = 0;
  private cacheHits = 0;

  // Default configuration
  private static readonly DEFAULT_CONFIG: Omit<Required<GeocoderConfig>, 'apiKey'> = {
    regionBias: 'jp',
    language: 'ja',
    components: {},
    timeout: 10000,
    cacheTtl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxCacheSize: 1000,
    rateLimitRps: 50,
    batchSize: 10,
    maxRetries: 3,
    debug: false,
    baseUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
  };

  /**
   * Create a new geocoder instance
   */
  constructor(config: GeocoderConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('API key is required');
    }

    this.config = {
      ...GoogleMapsGeocoder.DEFAULT_CONFIG,
      ...config,
    };

    this.rateLimiter = new TokenBucketRateLimiter(this.config.rateLimitRps);
  }

  // =======================================================================
  // PUBLIC API METHODS
  // =======================================================================

  /**
   * Geocode a single Japanese address
   * 
   * @param address - Japanese address string
   * @param options - Optional overrides
   * @returns Geocoding result with coordinates
   * @throws AddressNotFoundError if address cannot be found
   * @throws AmbiguousAddressError if multiple matches found
   * @throws RateLimitError if rate limit exceeded
   * 
   * @example
   * ```typescript
   * const result = await geocoder.geocode('東京都千代田区大手町2-3-1');
   * console.log(`${result.lat}, ${result.lng}`);
   * // 35.685, 139.691
   * ```
   */
  async geocode(
    address: string,
    options?: {
      regionBias?: string;
      language?: string;
      components?: Record<string, string>;
      allowPartialMatch?: boolean;
    }
  ): Promise<GeocodingResult> {
    const normalizedAddress = this.normalizeJapaneseAddress(address);
    const cacheKey = this.generateCacheKey(normalizedAddress, options);

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.log('Cache hit for:', address);
      this.cacheHits++;
      return cached;
    }

    // Wait for rate limit
    await this.rateLimiter.acquire();

    const params = this.buildGeocodingParams(normalizedAddress, options);
    const result = await this.makeGeocodingRequest(params, address);

    // Cache successful result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Batch geocode multiple addresses
   * 
   * Processes addresses with concurrency control and provides
   * detailed results including failures and ambiguous matches.
   * 
   * @param addresses - Array of Japanese addresses
   * @param options - Batch processing options
   * @returns Batch result with successful, failed, and ambiguous entries
   * 
   * @example
   * ```typescript
   * const addresses = [
   *   '東京都千代田区大手町2-3-1',
   *   '大阪府大阪市中央区大手前2-1',
   *   '北海道札幌市中央区北1条西2丁目'
   * ];
   * 
   * const result = await geocoder.geocodeBatch(addresses);
   * console.log(`${result.stats.success}/${result.stats.total} succeeded`);
   * ```
   */
  async geocodeBatch(
    addresses: string[],
    options?: {
      continueOnError?: boolean;
      onProgress?: (completed: number, total: number) => void;
      regionBias?: string;
      language?: string;
    }
  ): Promise<BatchGeocodingResult> {
    const startTime = Date.now();
    const normalizedAddresses = addresses.map(a => this.normalizeJapaneseAddress(a));
    
    const result: BatchGeocodingResult = {
      successful: [],
      failed: [],
      ambiguous: [],
      stats: {
        total: addresses.length,
        success: 0,
        failed: 0,
        ambiguous: 0,
        processingTimeMs: 0,
        cached: 0,
      },
    };

    // Process in batches for concurrency control
    const batchSize = this.config.batchSize;
    const continueOnError = options?.continueOnError ?? true;

    for (let i = 0; i < normalizedAddresses.length; i += batchSize) {
      const batch = normalizedAddresses.slice(i, i + batchSize);
      const batchPromises = batch.map((address, index) =>
        this.geocodeSingleWithErrorHandling(address, addresses[i + index], options)
      );

      const batchResults = await Promise.all(batchPromises);

      for (const item of batchResults) {
        if (item.status === 'success') {
          result.successful.push(item.result);
          result.stats.success++;
        } else if (item.status === 'ambiguous') {
          result.ambiguous.push(item.ambiguous);
          result.stats.ambiguous++;
        } else {
          result.failed.push(item.error);
          result.stats.failed++;
          if (!continueOnError) {
            break;
          }
        }
      }

      options?.onProgress?.(
        Math.min(i + batchSize, normalizedAddresses.length),
        normalizedAddresses.length
      );

      if (!continueOnError && result.failed.length > 0) {
        break;
      }
    }

    result.stats.processingTimeMs = Date.now() - startTime;
    result.stats.cached = this.cacheHits;

    this.log('Batch complete:', result.stats);

    return result;
  }

  /**
   * Reverse geocode coordinates to address
   * 
   * @param lat - Latitude
   * @param lng - Longitude
   * @param options - Optional settings
   * @returns Reverse geocoding result with address components
   * 
   * @example
   * ```typescript
   * const result = await geocoder.reverseGeocode(35.685, 139.691);
   * console.log(result.addresses[0].formattedAddress);
   * // "2-chōme-3-1 Ōtemachi, Chiyoda City, Tokyo 100-0004, Japan"
   * ```
   */
  async reverseGeocode(
    lat: number,
    lng: number,
    options?: {
      language?: string;
      resultType?: string[];
      locationType?: string[];
    }
  ): Promise<ReverseGeocodingResult> {
    const cacheKey = `reverse:${lat},${lng}:${options?.language ?? this.config.language}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.cacheHits++;
      return { addresses: [cached] };
    }

    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.config.apiKey,
      language: options?.language ?? this.config.language,
    });

    if (options?.resultType) {
      params.set('result_type', options.resultType.join('|'));
    }

    const url = `${this.config.baseUrl}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      this.handleApiError(data.status, data.error_message);
    }

    const addresses: GeocodingResult[] = data.results.map((result: any) =>
      this.parseGeocodingResult(result, `${lat},${lng}`)
    );

    if (addresses.length > 0) {
      this.setCache(cacheKey, addresses[0]);
    }

    return { addresses };
  }

  /**
   * Validate if an address can be geocoded
   * 
   * @param address - Address to validate
   * @returns Validation result with confidence score
   */
  async validateAddress(address: string): Promise<{
    valid: boolean;
    confidence: number;
    suggestions?: string[];
  }> {
    try {
      const result = await this.geocode(address, { allowPartialMatch: true });
      return {
        valid: true,
        confidence: result.partialMatch ? 0.7 : 1.0,
      };
    } catch (error) {
      if (error instanceof AmbiguousAddressError) {
        return {
          valid: false,
          confidence: 0.5,
          suggestions: error.suggestions.map(s => s.formattedAddress),
        };
      }
      return { valid: false, confidence: 0 };
    }
  }

  /**
   * Clear the memory cache
   */
  clearCache(): void {
    this.cache.clear();
    this.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    requests: number;
  } {
    const hitRate = this.requestCount > 0
      ? this.cacheHits / this.requestCount
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate,
      requests: this.requestCount,
    };
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    requests: number;
    cacheHits: number;
    cacheSize: number;
  } {
    return {
      requests: this.requestCount,
      cacheHits: this.cacheHits,
      cacheSize: this.cache.size,
    };
  }

  // =======================================================================
  // PRIVATE METHODS
  // =======================================================================

  /**
   * Geocode single address with error handling for batch processing
   */
  private async geocodeSingleWithErrorHandling(
    normalizedAddress: string,
    originalAddress: string,
    options?: any
  ): Promise<
    | { status: 'success'; result: GeocodingResult }
    | { status: 'ambiguous'; ambiguous: AmbiguousAddress }
    | { status: 'error'; error: FailedGeocoding }
  > {
    try {
      const result = await this.geocode(normalizedAddress, options);
      return { status: 'success', result };
    } catch (error) {
      if (error instanceof AmbiguousAddressError) {
        return {
          status: 'ambiguous',
          ambiguous: {
            input: originalAddress,
            suggestions: error.suggestions,
            confidence: 0.5,
            reason: error.message,
          },
        };
      }

      const geocodingError = error as GeocodingError;
      return {
        status: 'error',
        error: {
          input: originalAddress,
          errorCode: geocodingError.code || 'UNKNOWN_ERROR',
          errorMessage: geocodingError.message,
          retryable: geocodingError.retryable ?? false,
        },
      };
    }
  }

  /**
   * Make geocoding request with parameters
   */
  private async makeGeocodingRequest(
    params: URLSearchParams,
    originalInput: string
  ): Promise<GeocodingResult> {
    const url = `${this.config.baseUrl}?${params.toString()}`;
    this.requestCount++;

    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    this.log('API Response:', data.status);

    // Handle different response statuses
    switch (data.status) {
      case 'OK':
        return this.processOkResponse(data, originalInput);

      case 'ZERO_RESULTS':
        throw new AddressNotFoundError(originalInput);

      case 'OVER_DAILY_LIMIT':
      case 'OVER_QUERY_LIMIT':
        throw new RateLimitError('API quota exceeded', 60000);

      case 'REQUEST_DENIED':
        throw new AuthenticationError(data.error_message || 'Request denied');

      case 'INVALID_REQUEST':
        throw new GeocodingError(
          `Invalid request: ${data.error_message}`,
          'INVALID_REQUEST',
          false
        );

      case 'UNKNOWN_ERROR':
        throw new NetworkError('Unknown API error - retry suggested');

      default:
        throw new GeocodingError(
          `Unexpected status: ${data.status}`,
          'UNEXPECTED_ERROR',
          true
        );
    }
  }

  /**
   * Process successful API response
   */
  private processOkResponse(data: any, originalInput: string): GeocodingResult {
    const results = data.results as any[];

    if (results.length === 0) {
      throw new AddressNotFoundError(originalInput);
    }

    // Check for ambiguous results (multiple ROOFTOP matches)
    const rooftopResults = results.filter(
      r => r.geometry?.location_type === 'ROOFTOP'
    );

    if (rooftopResults.length > 1) {
      // Multiple precise matches - ambiguous
      const suggestions = rooftopResults.map(r =>
        this.parseGeocodingResult(r, originalInput)
      );
      throw new AmbiguousAddressError(
        'Multiple precise matches found for this address',
        suggestions,
        originalInput
      );
    }

    // Use best result
    const bestResult = rooftopResults[0] || results[0];
    return this.parseGeocodingResult(bestResult, originalInput);
  }

  /**
   * Build geocoding URL parameters
   */
  private buildGeocodingParams(
    address: string,
    options?: any
  ): URLSearchParams {
    const params = new URLSearchParams({
      address: address,
      key: this.config.apiKey,
      language: options?.language ?? this.config.language,
      region: options?.regionBias ?? this.config.regionBias,
    });

    // Add component filters
    const components = {
      ...this.config.components,
      ...options?.components,
      country: 'JP', // Always restrict to Japan for akiya use case
    };

    const componentString = Object.entries(components)
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    if (componentString) {
      params.set('components', componentString);
    }

    return params;
  }

  /**
   * Parse API result to our format
   */
  private parseGeocodingResult(
    result: any,
    originalInput: string
  ): GeocodingResult {
    const components = this.parseAddressComponents(result.address_components);

    return {
      id: this.generateResultId(),
      formattedAddress: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      placeId: result.place_id,
      components,
      locationType: result.geometry.location_type,
      viewport: result.geometry.viewport,
      partialMatch: result.partial_match ?? false,
      types: result.types,
      originalInput,
      geocodedAt: new Date(),
    };
  }

  /**
   * Parse address components for Japanese addresses
   */
  private parseAddressComponents(
    components: GeocoderAddressComponent[]
  ): AddressComponents {
    const getComponent = (type: string): string | undefined => {
      const component = components.find(c => c.types.includes(type));
      return component?.long_name;
    };

    const getComponentShort = (type: string): string | undefined => {
      const component = components.find(c => c.types.includes(type));
      return component?.short_name;
    };

    // Extract prefecture (administrative_area_level_1)
    const prefecture = getComponent('administrative_area_level_1');

    // Extract city (locality or administrative_area_level_2)
    const city = getComponent('locality') || getComponent('administrative_area_level_2');

    // Extract town (sublocality_level_1 or neighborhood)
    const town = getComponent('sublocality_level_1') || getComponent('neighborhood');

    // Extract street (premise or sublocality_level_2-4)
    const street = getComponent('premise') ||
      getComponent('sublocality_level_2') ||
      getComponent('sublocality_level_3') ||
      getComponent('sublocality_level_4');

    // Extract building (premise or point_of_interest)
    const building = getComponent('premise') || getComponent('point_of_interest');

    // Extract postal code
    const postalCode = getComponent('postal_code');

    return {
      prefecture,
      city,
      town,
      street,
      building,
      postalCode,
      country: getComponent('country') || 'Japan',
      countryCode: getComponentShort('country') || 'JP',
      rawComponents: components,
    };
  }

  /**
   * Normalize Japanese address for better geocoding
   */
  private normalizeJapaneseAddress(address: string): string {
    let normalized = address.trim();

    // Common replacements for Japanese address formats
    const replacements: [RegExp, string | ((substring: string, ...args: any[]) => string)][] = [
      [/〒\d{3}-?\d{4}\s*/, ''], // Remove postal code prefix
      [/^日本国?\s*/, ''], // Remove country prefix
      [/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-'], // Normalize dashes
      [/\s+/g, ' '], // Normalize whitespace
      [/([０-９])/g, (_, char: string) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0)], // Full-width to half-width numbers
      [/丁目/g, '-'], // Normalize chome
      [/番地?/g, '-'], // Normalize ban
      [/号/g, ''], // Remove "go" suffix
    ];

    for (const [pattern, replacement] of replacements) {
      if (typeof replacement === 'function') {
        normalized = normalized.replace(pattern, replacement as (substring: string, ...args: any[]) => string);
      } else {
        normalized = normalized.replace(pattern, replacement);
      }
    }

    return normalized;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(address: string, options?: any): string {
    const optionsHash = options
      ? JSON.stringify({
          r: options.regionBias,
          l: options.language,
          c: options.components,
        })
      : '';
    return `geo:${address}:${optionsHash}`;
  }

  /**
   * Get from cache with LRU handling
   */
  private getFromCache(key: string): GeocodingResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.cacheTtl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count for LRU
    entry.accessCount++;
    return entry.result;
  }

  /**
   * Set cache entry with size management
   */
  private setCache(key: string, result: GeocodingResult): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Evict oldest/lowest access cache entries
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestAccess = Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      // Prioritize by access count, then timestamp
      if (entry.accessCount < lowestAccess ||
          (entry.accessCount === lowestAccess && entry.timestamp < oldestTime)) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestAccess = entry.accessCount;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, attempt = 1): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * attempt;
        throw new RateLimitError('Rate limited', delayMs);
      }

      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        if (attempt < this.config.maxRetries && error.retryable) {
          this.log(`Retrying after ${error.retryAfterMs}ms...`);
          await this.delay(error.retryAfterMs || 1000 * attempt);
          return this.fetchWithRetry(url, attempt + 1);
        }
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }

      if (attempt < this.config.maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt); // Exponential backoff
        this.log(`Retrying after ${delayMs}ms...`);
        await this.delay(delayMs);
        return this.fetchWithRetry(url, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Handle API error status
   */
  private handleApiError(status: string, message?: string): never {
    switch (status) {
      case 'ZERO_RESULTS':
        throw new AddressNotFoundError('');
      case 'OVER_QUERY_LIMIT':
        throw new RateLimitError();
      case 'REQUEST_DENIED':
        throw new AuthenticationError(message);
      case 'INVALID_REQUEST':
        throw new GeocodingError(message || 'Invalid request', 'INVALID_REQUEST');
      default:
        throw new GeocodingError(message || `API Error: ${status}`, 'API_ERROR');
    }
  }

  /**
   * Generate unique result ID
   */
  private generateResultId(): string {
    return `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug logging
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[GoogleMapsGeocoder]', ...args);
    }
  }
}

// ============================================================================
// PERSISTENT CACHE MANAGER
// ============================================================================

/**
 * Persistent cache manager for geocoding results
 * Can be backed by localStorage, file system, or database
 */
export class PersistentCacheManager {
  private storage: Map<string, string> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 7 * 24 * 60 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  /**
   * Get item from persistent cache
   */
  get(key: string): GeocodingResult | null {
    const stored = this.storage.get(key);
    if (!stored) return null;

    try {
      const entry = JSON.parse(stored);
      if (Date.now() - entry.timestamp > this.ttl) {
        this.storage.delete(key);
        return null;
      }
      return entry.result;
    } catch {
      return null;
    }
  }

  /**
   * Set item in persistent cache
   */
  set(key: string, result: GeocodingResult): void {
    this.storage.set(key, JSON.stringify({
      result,
      timestamp: Date.now(),
    }));
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.storage.size;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Check if coordinates are within Japan's bounding box
 */
export function isWithinJapan(lat: number, lng: number): boolean {
  // Approximate bounding box for Japan
  // This is a rough check - Japan's actual shape is complex
  return (
    lat >= 20.0 && lat <= 46.0 && // Latitude range
    lng >= 122.0 && lng <= 154.0   // Longitude range
  );
}

/**
 * Create singleton instance
 */
let globalGeocoder: GoogleMapsGeocoder | null = null;

export function initializeGeocoder(config: GeocoderConfig): GoogleMapsGeocoder {
  globalGeocoder = new GoogleMapsGeocoder(config);
  return globalGeocoder;
}

export function getGeocoder(): GoogleMapsGeocoder {
  if (!globalGeocoder) {
    throw new Error('Geocoder not initialized. Call initializeGeocoder() first.');
  }
  return globalGeocoder;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Example 1: Initialize and geocode a single address
const geocoder = new GoogleMapsGeocoder({
  apiKey: 'your-google-maps-api-key',
  debug: true,
});

try {
  const result = await geocoder.geocode('東京都千代田区大手町2-3-1');
  console.log('Coordinates:', formatCoordinates(result.lat, result.lng));
  console.log('Prefecture:', result.components.prefecture);
  console.log('City:', result.components.city);
} catch (error) {
  if (error instanceof AddressNotFoundError) {
    console.error('Address not found');
  } else if (error instanceof AmbiguousAddressError) {
    console.log('Did you mean:', error.suggestions.map(s => s.formattedAddress));
  }
}

// Example 2: Batch geocoding for multiple akiya properties
const akiyaAddresses = [
  '島根県浜田市金城町七条30-1',
  '長野県木曽郡王滝村字上新田7914-1',
  '岡山県新見市西方字羽化3207-1',
  '鹿児島県曽於市財部町南俣2645-4',
  '岩手県遠野市宮守町下宮守71-1',
];

const batchResult = await geocoder.geocodeBatch(akiyaAddresses, {
  continueOnError: true,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});

console.log('Successful:', batchResult.stats.success);
console.log('Failed:', batchResult.stats.failed);
console.log('Ambiguous:', batchResult.stats.ambiguous);

// Process successful results
for (const result of batchResult.successful) {
  console.log(`${result.originalInput} -> ${formatCoordinates(result.lat, result.lng)}`);
}

// Handle ambiguous addresses
for (const ambiguous of batchResult.ambiguous) {
  console.log(`Ambiguous: ${ambiguous.input}`);
  console.log('Suggestions:', ambiguous.suggestions.map(s => s.formattedAddress));
}

// Example 3: Reverse geocode to verify location
const result = await geocoder.reverseGeocode(35.685, 139.691);
console.log('Address:', result.addresses[0].formattedAddress);

// Example 4: Validate addresses before processing
const isValid = await geocoder.validateAddress('東京都新宿区西新宿2-8-1');
console.log('Valid:', isValid.valid, 'Confidence:', isValid.confidence);

// Example 5: Check cache stats
const stats = geocoder.getCacheStats();
console.log('Cache hit rate:', (stats.hitRate * 100).toFixed(2) + '%');
*/

// ============================================================================
// EXPORTS
// ============================================================================

export default GoogleMapsGeocoder;
