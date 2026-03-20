/**
 * SUUMO (スーモ) Connector - Research & Implementation Notes
 * 
 * Source: https://suumo.jp/
 * Owner: Recruit Co., Ltd. (リクルート)
 * 
 * ## RESEARCH FINDINGS
 * 
 * ### robots.txt Analysis
 * - Location: https://suumo.jp/robots.txt
 * - Status: ✅ No blanket ban on property listings
 * - Disallowed: Internal APIs (/jj/), dynamic content, user-specific pages
 * - Allowed: General property listing pages
 * - Crawl-delay: Not specified for general user-agent (30s for bingbot)
 * 
 * ### Site Structure
 * 
 * #### Property Types
 * - /chintai/ - Rental properties (賃貸)
 * - /ms/shinchiku/ - New condominiums (新築マンション)
 * - /ms/chuko/ - Used condominiums (中古マンション)
 * - /ikkodate/ - New houses (新築一戸建て)
 * - /chukoikkodate/ - Used houses (中古一戸建て)
 * - /tochi/ - Land (土地)
 * 
 * #### URL Patterns
 * - Prefecture level: /{type}/{prefecture}/ (e.g., /ms/chuko/hokkaido/)
 * - City level: /{type}/{prefecture}/{city}/
 * - Station level: /{type}/{prefecture}/ek_{station_code}/
 * - Detail page: /jj/bukken/shosai/{id}/
 * 
 * #### Listing Page Structure
 * - Uses data-analytics-tracker attributes with JSON data
 * - Property cards in .property_unit elements
 * - Pagination via "次へ" (next) button
 * 
 * ### Technical Challenges
 * 
 * 1. **JavaScript Rendering**: Listings load dynamically via JS
 *    - Solution: Requires Playwright/puppeteer for full rendering
 * 
 * 2. **Anti-Bot Measures**:
 *    - Rate limiting aggressive (blocks after ~50 rapid requests)
 *    - CAPTCHA on suspicious traffic
 *    - User-Agent checking
 *    - Solution: Respectful delays (2-5s between requests), rotate UAs
 * 
 * 3. **Pagination Limits**:
 *    - Max 100 items per page
 *    - No documented API for bulk access
 * 
 * 4. **Data Structure**:
 *    - Embedded JSON in data-analytics-tracker attributes
 *    - Mixed Japanese/English field names
 * 
 * ### Terms of Service
 * - No explicit scraping prohibition found in public ToS
 * - Commercial use requires permission
 * - Personal/research use generally tolerated with respectful scraping
 * 
 * ### API Availability
 * - ❌ No public API for property listings
 * - ❌ No partner feed program for small developers
 * - ✅ Only option is web scraping
 * 
 * ## IMPLEMENTATION STATUS
 * 
 * ⚠️ PARTIALLY IMPLEMENTED
 * 
 * This connector provides a foundation but requires:
 * 1. Playwright browser automation for JS-rendered content
 * 2. Robust error handling for anti-bot measures
 * 3. Proxy rotation for sustained scraping
 * 4. Rate limiting compliance
 * 
 * ## RECOMMENDATION
 * 
 * For production use:
 * 1. Contact Recruit for official data partnership
 * 2. Or use as fallback with very conservative scraping (10-20 listings/day)
 * 3. Monitor for ToS changes
 */

import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import type { 
  ListingConnector, 
  ConnectorStatus, 
  FetchResult, 
  NormalizedListing,
  SourceType 
} from '../types';
import type { InsertListingVariant, InsertPropertyEntity, InsertRawCapture } from '@shared/schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SuumoConfig {
  /** Base URL for SUUMO */
  baseUrl: string;
  /** Delay between requests in milliseconds */
  requestDelay: number;
  /** Random jitter to add to delay (±ms) */
  jitter: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** Delay between retries */
  retryDelay: number;
  /** User agent string */
  userAgent: string;
  /** Whether to run in headless mode */
  headless: boolean;
  /** Prefectures to scrape (empty = all) */
  prefectures: string[];
  /** Property types to scrape */
  propertyTypes: Array<'chintai' | 'shinchiku' | 'chuko' | 'ikkodate' | 'chukoikkodate' | 'tochi'>;
}

const DEFAULT_CONFIG: SuumoConfig = {
  baseUrl: 'https://suumo.jp',
  requestDelay: 3000,
  jitter: 2000,
  maxRetries: 3,
  retryDelay: 10000,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  headless: true,
  prefectures: [],
  propertyTypes: ['chuko', 'chukoikkodate', 'tochi'], // Focus on akiya-relevant types
};

// ============================================================================
// DATA MODELS
// ============================================================================

export interface SuumoListing {
  id: string;
  externalId: string;
  title: string;
  price: {
    value: number | null;
    raw: string;
    currency: 'JPY';
  };
  propertyType: string;
  listingType: 'buy' | 'rent';
  layout: string | null;
  buildingArea: number | null;
  landArea: number | null;
  address: string;
  prefecture: string;
  municipality: string;
  station: string | null;
  stationDistance: number | null; // minutes
  buildDate: string | null;
  floor: string | null;
  totalFloors: number | null;
  structure: string | null;
  thumbnailUrl: string | null;
  detailUrl: string;
  scrapedAt: string;
}

// ============================================================================
// CONNECTOR IMPLEMENTATION
// ============================================================================

export class SuumoConnector implements ListingConnector {
  readonly name = 'suumo';
  readonly sourceType: SourceType = 'suumo';
  
  private config: SuumoConfig;
  private browser: Browser | null = null;
  private lastRequestTime = 0;
  private requestCount = 0;

  constructor(config: Partial<SuumoConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ========================================================================
  // CONNECTOR INTERFACE
  // ========================================================================

  async getStatus(): Promise<ConnectorStatus> {
    return {
      name: this.name,
      configured: this.isConfigured(),
      enabled: this.isEnabled(),
      itemsFetched: 0,
      itemsUpserted: 0,
    };
  }

  isConfigured(): boolean {
    return true; // No API key required
  }

  isEnabled(): boolean {
    return true;
  }

  async fetch(params?: Record<string, unknown>): Promise<FetchResult<unknown>> {
    try {
      await this.initialize();
      
      const prefecture = (params?.prefecture as string) || 'hokkaido';
      const propertyType = (params?.propertyType as string) || 'chuko';
      
      const listings = await this.scrapeListings(prefecture, propertyType);
      
      return {
        success: true,
        data: listings,
        metadata: {
          prefecture,
          propertyType,
          count: listings.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await this.close();
    }
  }

  async normalize(data: unknown[]): Promise<NormalizedListing[]> {
    const listings = data as SuumoListing[];
    return listings.map(listing => this.normalizeListing(listing));
  }

  // ========================================================================
  // SCRAPER METHODS
  // ========================================================================

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async delay(): Promise<void> {
    const jitter = Math.random() * this.config.jitter * 2 - this.config.jitter;
    const delay = this.config.requestDelay + jitter;
    await new Promise(resolve => setTimeout(resolve, Math.max(1000, delay)));
  }

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage({
      userAgent: this.config.userAgent,
    });

    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
    });

    return page;
  }

  /**
   * Scrape listings for a prefecture and property type
   */
  async scrapeListings(
    prefecture: string,
    propertyType: string,
    maxPages: number = 5
  ): Promise<SuumoListing[]> {
    const page = await this.getPage();
    const listings: SuumoListing[] = [];
    
    try {
      const url = this.buildListingUrl(prefecture, propertyType);
      console.log(`[SUUMO] Scraping ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle' });
      await this.delay();

      let currentPage = 1;

      while (currentPage <= maxPages) {
        const html = await page.content();
        const $ = cheerio.load(html);
        
        // Parse listings from current page
        const pageListings = this.parseListingPage($);
        listings.push(...pageListings);

        console.log(`[SUUMO] Page ${currentPage}: ${pageListings.length} listings`);

        // Check for next page
        const nextButton = await page.$('a:has-text("次へ")');
        if (!nextButton || currentPage >= maxPages) break;

        await nextButton.click();
        await page.waitForLoadState('networkidle');
        await this.delay();
        
        currentPage++;
      }

      return listings;
    } finally {
      await page.close();
    }
  }

  /**
   * Build listing URL based on property type
   */
  private buildListingUrl(prefecture: string, propertyType: string): string {
    const typeMap: Record<string, string> = {
      'chintai': 'chintai',
      'shinchiku': 'ms/shinchiku',
      'chuko': 'ms/chuko',
      'ikkodate': 'ikkodate',
      'chukoikkodate': 'chukoikkodate',
      'tochi': 'tochi',
    };

    const typePath = typeMap[propertyType] || 'ms/chuko';
    return `${this.config.baseUrl}/${typePath}/${prefecture}/`;
  }

  /**
   * Parse a listing page
   */
  private parseListingPage($: cheerio.CheerioAPI): SuumoListing[] {
    const listings: SuumoListing[] = [];

    // SUUMO uses data-analytics-tracker attributes with JSON
    // Example: <div data-analytics-tracker="{&quot;price&quot;:&quot;1980&quot;...}">
    
    $('.property_unit, [data-analytics-tracker]').each((_, el) => {
      const $el = $(el);
      
      // Try to extract from data-analytics-tracker
      const trackerData = $el.attr('data-analytics-tracker');
      if (trackerData) {
        try {
          const parsed = JSON.parse(trackerData.replace(/&quot;/g, '"'));
          // Process parsed data...
        } catch {
          // Ignore parse errors
        }
      }

      // Fallback to DOM parsing
      const detailLink = $el.find('a[href*="/jj/bukken/shosai/"]').first();
      const detailUrl = detailLink.attr('href') || '';
      
      if (!detailUrl) return;

      // Extract ID from URL
      const idMatch = detailUrl.match(/\/jj\/bukken\/shosai\/(\w+)\//);
      const id = idMatch ? idMatch[1] : '';

      // Parse price
      const priceText = $el.find('.price, [class*="price"]').first().text().trim();
      const price = this.parsePrice(priceText);

      // Parse layout
      const layout = $el.find('.layout, [class*="layout"], [class*="madori"]').first().text().trim() || null;

      // Parse address
      const address = $el.find('.address, [class*="address"], [class*="location"]').first().text().trim();

      // Parse areas
      const areaText = $el.find('.area, [class*="area"]').first().text().trim();
      const { buildingArea, landArea } = this.parseAreas(areaText);

      // Parse station info
      const stationText = $el.find('.station, [class*="station"], [class*="access"]').first().text().trim();
      const { station, stationDistance } = this.parseStation(stationText);

      listings.push({
        id,
        externalId: id,
        title: `${layout || '物件'} ${address}`,
        price,
        propertyType: 'unknown',
        listingType: 'buy',
        layout,
        buildingArea,
        landArea,
        address,
        prefecture: '', // Extract from address
        municipality: '', // Extract from address
        station,
        stationDistance,
        buildDate: null,
        floor: null,
        totalFloors: null,
        structure: null,
        thumbnailUrl: null,
        detailUrl: detailUrl.startsWith('http') ? detailUrl : `${this.config.baseUrl}${detailUrl}`,
        scrapedAt: new Date().toISOString(),
      });
    });

    return listings;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private parsePrice(text: string): SuumoListing['price'] {
    // Handle "1980万円" or "1,980万円"
    const match = text.replace(/,/g, '').match(/([\d.]+)\s*万円/);
    if (match) {
      const man = parseFloat(match[1]);
      return {
        value: man * 10000,
        raw: text,
        currency: 'JPY',
      };
    }

    // Handle "相談" (negotiable)
    if (text.includes('相談')) {
      return { value: null, raw: text, currency: 'JPY' };
    }

    return { value: null, raw: text, currency: 'JPY' };
  }

  private parseAreas(text: string): { buildingArea: number | null; landArea: number | null } {
    const buildingMatch = text.match(/([\d.]+)\s*㎡/);
    const buildingArea = buildingMatch ? parseFloat(buildingMatch[1]) : null;
    
    // Land area often follows building area
    const landMatch = text.match(/土地\s*([\d.]+)\s*㎡/);
    const landArea = landMatch ? parseFloat(landMatch[1]) : null;

    return { buildingArea, landArea };
  }

  private parseStation(text: string): { station: string | null; stationDistance: number | null } {
    // Pattern: "JR山手線 渋谷駅 徒歩10分"
    const match = text.match(/(.+?)\s*徒歩\s*(\d+)\s*分/);
    if (match) {
      return {
        station: match[1].trim(),
        stationDistance: parseInt(match[2], 10),
      };
    }
    return { station: text || null, stationDistance: null };
  }

  // ========================================================================
  // NORMALIZATION
  // ========================================================================

  private normalizeListing(listing: SuumoListing): NormalizedListing {
    const variant: InsertListingVariant = {
      sourceType: 'suumo',
      sourceKey: `suumo:${listing.id}`,
      sourceUrl: listing.detailUrl,
      titleJp: listing.title,
      priceJpy: listing.price.value,
      ldk: listing.layout,
      landAreaM2: listing.landArea,
      buildingAreaM2: listing.buildingArea,
      yearBuilt: null, // Parse from buildDate
      hasLand: listing.landArea !== null && listing.landArea > 0,
      status: 'active',
    };

    return {
      variant,
      rawData: listing,
    };
  }
}

export default SuumoConnector;
