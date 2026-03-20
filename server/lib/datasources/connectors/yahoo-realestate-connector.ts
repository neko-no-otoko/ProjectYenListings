/**
 * Yahoo!不動産 Connector - Research & Implementation Notes
 * 
 * Source: https://realestate.yahoo.co.jp/
 * Owner: Yahoo Japan Corporation / Z Holdings (SoftBank subsidiary)
 * 
 * ## RESEARCH FINDINGS
 * 
 * ### robots.txt Analysis
 * - Location: https://realestate.yahoo.co.jp/robots.txt
 * - Status: ✅ Allows general crawling with restrictions
 * - Disallowed: /direct/, /api/, personal pages (/personal/), inquiry forms
 * - Crawl-delay: 5s for bingbot
 * - Sitemap: Available for different property types
 * 
 * ### Site Structure
 * 
 * #### Property Types
 * - /rent/ - Rental properties (賃貸)
 * - /new/mansion/ - New condominiums (新築マンション)
 * - /new/house/ - New houses (新築一戸建て)
 * - /used/mansion/ - Used condominiums (中古マンション)
 * - /used/house/ - Used houses (中古一戸建て)
 * - /land/ - Land (土地)
 * - /catalog/ - Building catalogs
 * 
 * #### URL Patterns
 * - Search by prefecture: /{type}/{prefecture_code}/
 *   - Example: /used/mansion/13/ (Tokyo)
 *   - Example: /used/mansion/01/ (Hokkaido)
 * - Search by city: /{type}/search/{region}/{prefecture}/{city}/
 *   - Example: /used/mansion/search/03/13/13101/ (Chiyoda-ku, Tokyo)
 * - Search by station: /{type}/search/station/{region}/{station_code}/
 * - Detail pages: /{type}/detail/{id}/ or /{type}/dtl/{id}/
 * 
 * #### URL Region Codes
 * - 01: Hokkaido
 * - 02: Tohoku
 * - 03: Kanto
 * - 04: Koshinetsu/Hokuriku
 * - 05: Tokai
 * - 06: Kansai
 * - 07: Chugoku
 * - 08: Shikoku
 * - 09: Kyushu/Okinawa
 * 
 * #### Prefecture Codes (JIS X 0401)
 * - 01: Hokkaido, 02: Aomori, ..., 47: Okinawa
 * 
 * ### Technical Characteristics
 * 
 * 1. **Rendering**: Mix of SSR and CSR
 *    - Initial listings in HTML
 *    - Some dynamic loading via AJAX
 * 
 * 2. **Rate Limiting**: Moderate
 *    - Blocks aggressive scraping
 *    - CAPTCHA on suspicious traffic
 * 
 * 3. **Data Structure**:
 *    - JSON-LD structured data available
 *    - Data attributes on listing elements
 *    - Clean HTML structure
 * 
 * ### Terms of Service
 * - Yahoo Japan general ToS applies
 * - No explicit scraping prohibition for public data
 * - Commercial use requires consideration
 * 
 * ### API Availability
 * - ❌ No public property API
 * - ❌ No partner program documented
 * - ✅ Scraping is viable option
 * 
 * ## IMPLEMENTATION STATUS
 * 
 * ⚠️ PARTIALLY IMPLEMENTED
 * 
 * This connector provides:
 * - URL builders for all search patterns
 * - Listing page parsers
 * - Detail page scraper structure
 * 
 * Requires:
 * - Playwright for full page rendering
 * - Error handling for rate limits
 * - Data normalization refinement
 * 
 * ## ADVANTAGES OVER SUUMO
 * 
 * 1. Simpler HTML structure
 * 2. JSON-LD structured data
 * 3. More consistent URL patterns
 * 4. Less aggressive anti-bot measures
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
import type { InsertListingVariant } from '@shared/schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface YahooRealEstateConfig {
  baseUrl: string;
  requestDelay: number;
  jitter: number;
  maxRetries: number;
  userAgent: string;
  headless: boolean;
}

const DEFAULT_CONFIG: YahooRealEstateConfig = {
  baseUrl: 'https://realestate.yahoo.co.jp',
  requestDelay: 2000,
  jitter: 1000,
  maxRetries: 3,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  headless: true,
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const PREFECTURE_CODES: Record<string, string> = {
  'hokkaido': '01',
  'aomori': '02',
  'iwate': '03',
  'miyagi': '04',
  'akita': '05',
  'yamagata': '06',
  'fukushima': '07',
  'ibaraki': '08',
  'tochigi': '09',
  'gunma': '10',
  'saitama': '11',
  'chiba': '12',
  'tokyo': '13',
  'kanagawa': '14',
  'niigata': '15',
  'toyama': '16',
  'ishikawa': '17',
  'fukui': '18',
  'yamanashi': '19',
  'nagano': '20',
  'gifu': '21',
  'shizuoka': '22',
  'aichi': '23',
  'mie': '24',
  'shiga': '25',
  'kyoto': '26',
  'osaka': '27',
  'hyogo': '28',
  'nara': '29',
  'wakayama': '30',
  'tottori': '31',
  'shimane': '32',
  'okayama': '33',
  'hiroshima': '34',
  'yamaguchi': '35',
  'tokushima': '36',
  'kagawa': '37',
  'ehime': '38',
  'kochi': '39',
  'fukuoka': '40',
  'saga': '41',
  'nagasaki': '42',
  'kumamoto': '43',
  'oita': '44',
  'miyazaki': '45',
  'kagoshima': '46',
  'okinawa': '47',
};

export const REGION_CODES: Record<string, string> = {
  'hokkaido': '01',
  'tohoku': '02',
  'kanto': '03',
  'koshinetsu': '04',
  'tokai': '05',
  'kansai': '06',
  'chugoku': '07',
  'shikoku': '08',
  'kyushu': '09',
};

// ============================================================================
// DATA MODELS
// ============================================================================

export interface YahooListing {
  id: string;
  externalId: string;
  title: string;
  price: {
    value: number | null;
    raw: string;
    currency: 'JPY';
  };
  propertyType: 'mansion' | 'house' | 'land' | 'rent';
  listingType: 'new' | 'used' | 'rent';
  layout: string | null;
  buildingArea: number | null;
  landArea: number | null;
  address: string;
  prefecture: string;
  municipality: string;
  station: string | null;
  stationDistance: number | null;
  buildYear: number | null;
  floor: string | null;
  totalFloors: number | null;
  structure: string | null;
  thumbnailUrl: string | null;
  detailUrl: string;
  scrapedAt: string;
}

export interface YahooDetail extends YahooListing {
  description: string | null;
  features: string[];
  photos: string[];
  contactPhone: string | null;
  realEstateCompany: string | null;
}

// ============================================================================
// CONNECTOR IMPLEMENTATION
// ============================================================================

export class YahooRealEstateConnector implements ListingConnector {
  readonly name = 'yahoo_realestate';
  readonly sourceType: SourceType = 'yahoo_realestate';
  
  private config: YahooRealEstateConfig;
  private browser: Browser | null = null;

  constructor(config: Partial<YahooRealEstateConfig> = {}) {
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
    return true;
  }

  isEnabled(): boolean {
    return true;
  }

  async fetch(params?: Record<string, unknown>): Promise<FetchResult<unknown>> {
    try {
      await this.initialize();
      
      const prefecture = (params?.prefecture as string) || 'hokkaido';
      const propertyType = (params?.propertyType as string) || 'used_mansion';
      
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
    const listings = data as YahooListing[];
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
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
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
  ): Promise<YahooListing[]> {
    const page = await this.getPage();
    const listings: YahooListing[] = [];
    
    try {
      const url = this.buildListingUrl(prefecture, propertyType);
      console.log(`[Yahoo!不動産] Scraping ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle' });
      await this.delay();

      let currentPage = 1;

      while (currentPage <= maxPages) {
        const html = await page.content();
        const $ = cheerio.load(html);
        
        // Parse listings from current page
        const pageListings = this.parseListingPage($, prefecture, propertyType);
        listings.push(...pageListings);

        console.log(`[Yahoo!不動産] Page ${currentPage}: ${pageListings.length} listings`);

        // Check for next page
        const nextLink = await page.$('a[rel="next"], a:has-text("次へ"), a[href*="start="]');
        if (!nextLink || currentPage >= maxPages) break;

        await Promise.all([
          nextLink.click(),
          page.waitForLoadState('networkidle'),
        ]);
        await this.delay();
        
        currentPage++;
      }

      return listings;
    } finally {
      await page.close();
    }
  }

  /**
   * Build listing URL
   */
  private buildListingUrl(prefecture: string, propertyType: string): string {
    const prefCode = PREFECTURE_CODES[prefecture.toLowerCase()] || '01';
    const regionCode = this.getRegionCode(prefCode);

    // Property type mapping
    const typePaths: Record<string, string> = {
      'used_mansion': `used/mansion/${regionCode}/${prefCode}/`,
      'used_house': `used/house/${regionCode}/${prefCode}/`,
      'new_mansion': `new/mansion/${regionCode}/${prefCode}/`,
      'new_house': `new/house/${regionCode}/${prefCode}/`,
      'land': `land/${regionCode}/${prefCode}/`,
      'rent': `rent/${regionCode}/${prefCode}/`,
    };

    const path = typePaths[propertyType] || typePaths['used_mansion'];
    return `${this.config.baseUrl}/${path}`;
  }

  private getRegionCode(prefCode: string): string {
    const code = parseInt(prefCode, 10);
    if (code === 1) return '01';
    if (code <= 7) return '02';
    if (code <= 14) return '03';
    if (code <= 20) return '04';
    if (code <= 24) return '05';
    if (code <= 30) return '06';
    if (code <= 35) return '07';
    if (code <= 39) return '08';
    return '09';
  }

  /**
   * Parse a listing page
   */
  private parseListingPage(
    $: cheerio.CheerioAPI,
    prefecture: string,
    propertyType: string
  ): YahooListing[] {
    const listings: YahooListing[] = [];

    // Yahoo uses various selectors - try multiple patterns
    const selectors = [
      '[data-testid="property-item"]',
      '.property-unit',
      '.propertyCard',
      '[class*="property"]',
      'article',
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        
        // Try to find detail link
        const detailLink = $el.find('a[href*="/detail/"], a[href*="/dtl/"]').first();
        let detailUrl = detailLink.attr('href') || '';
        
        if (!detailUrl) return;
        
        // Make absolute URL
        if (!detailUrl.startsWith('http')) {
          detailUrl = `${this.config.baseUrl}${detailUrl}`;
        }

        // Extract ID from URL
        const idMatch = detailUrl.match(/\/(detail|dtl)\/([a-zA-Z0-9_-]+)/);
        const id = idMatch ? idMatch[2] : '';

        if (!id) return;

        // Parse title
        const title = $el.find('h3, h2, .title, [class*="title"]').first().text().trim() || '物件';

        // Parse price
        const priceText = $el.find('.price, [class*="price"], [data-testid*="price"]').first().text().trim();
        const price = this.parsePrice(priceText);

        // Parse layout
        const layout = $el.find('.layout, [class*="layout"], [class*="madori"], [data-testid*="layout"]').first().text().trim() || null;

        // Parse address
        const address = $el.find('.address, [class*="address"], [class*="location"], [data-testid*="address"]').first().text().trim();

        // Parse areas
        const areaText = $el.find('.area, [class*="area"], [data-testid*="area"]').first().text().trim();
        const { buildingArea, landArea } = this.parseAreas(areaText);

        // Parse station access
        const stationText = $el.find('.station, [class*="station"], [class*="access"], [data-testid*="station"]').first().text().trim();
        const { station, stationDistance } = this.parseStation(stationText);

        // Parse year built
        const yearText = $el.find('.year, [class*="year"], [class*="built"], [data-testid*="year"]').first().text().trim();
        const buildYear = this.parseYear(yearText);

        // Parse thumbnail
        const thumbnailUrl = $el.find('img').first().attr('src') || null;

        listings.push({
          id,
          externalId: id,
          title,
          price,
          propertyType: this.mapPropertyType(propertyType),
          listingType: this.mapListingType(propertyType),
          layout,
          buildingArea,
          landArea,
          address,
          prefecture,
          municipality: this.extractMunicipality(address),
          station,
          stationDistance,
          buildYear,
          floor: null,
          totalFloors: null,
          structure: null,
          thumbnailUrl,
          detailUrl,
          scrapedAt: new Date().toISOString(),
        });
      });

      // If we found listings, stop trying other selectors
      if (listings.length > 0) break;
    }

    return listings;
  }

  /**
   * Scrape detail page for a property
   */
  async scrapeDetail(listing: YahooListing): Promise<YahooDetail> {
    const page = await this.getPage();
    
    try {
      await page.goto(listing.detailUrl, { waitUntil: 'networkidle' });
      await this.delay();

      const html = await page.content();
      const $ = cheerio.load(html);

      // Parse additional details
      const description = $('#description, .description, [class*="description"]').first().text().trim() || null;
      
      const features: string[] = [];
      $('.feature, [class*="feature"], .tag, [class*="tag"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text) features.push(text);
      });

      const photos: string[] = [];
      $('img[class*="photo"], .gallery img, [data-testid*="photo"] img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) photos.push(src);
      });

      const contactPhone = $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || null;
      
      const realEstateCompany = $('.company, [class*="company"], [class*="agent"]').first().text().trim() || null;

      return {
        ...listing,
        description,
        features,
        photos,
        contactPhone,
        realEstateCompany,
      };
    } finally {
      await page.close();
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private parsePrice(text: string): YahooListing['price'] {
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

    if (text.includes('相談')) {
      return { value: null, raw: text, currency: 'JPY' };
    }

    return { value: null, raw: text, currency: 'JPY' };
  }

  private parseAreas(text: string): { buildingArea: number | null; landArea: number | null } {
    // Look for "专有面積" or similar followed by m²
    const buildingMatch = text.match(/([\d.]+)\s*㎡/);
    const buildingArea = buildingMatch ? parseFloat(buildingMatch[1]) : null;
    
    const landMatch = text.match(/土地\s*([\d.]+)\s*㎡/);
    const landArea = landMatch ? parseFloat(landMatch[1]) : null;

    return { buildingArea, landArea };
  }

  private parseStation(text: string): { station: string | null; stationDistance: number | null } {
    // Pattern: "徒歩10分" or "JR山手線 渋谷駅 徒歩10分"
    const match = text.match(/徒歩\s*(\d+)\s*分/);
    const stationDistance = match ? parseInt(match[1], 10) : null;
    
    // Extract station name (text before "徒歩")
    const stationMatch = text.match(/(.+?)(?:\s*徒歩|$)/);
    const station = stationMatch ? stationMatch[1].trim() : null;

    return { station, stationDistance };
  }

  private parseYear(text: string): number | null {
    // Pattern: "築10年" or "2005年築" or just "2005"
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
    return null;
  }

  private mapPropertyType(type: string): YahooListing['propertyType'] {
    if (type.includes('mansion')) return 'mansion';
    if (type.includes('house')) return 'house';
    if (type.includes('land')) return 'land';
    if (type.includes('rent')) return 'rent';
    return 'mansion';
  }

  private mapListingType(type: string): YahooListing['listingType'] {
    if (type.includes('new')) return 'new';
    if (type.includes('used')) return 'used';
    if (type.includes('rent')) return 'rent';
    return 'used';
  }

  private extractMunicipality(address: string): string {
    // Pattern: 北海道札幌市中央区... -> 札幌市
    const match = address.match(/([^都道府県]+?[市区町村])/);
    return match ? match[1] : '';
  }

  // ========================================================================
  // NORMALIZATION
  // ========================================================================

  private normalizeListing(listing: YahooListing): NormalizedListing {
    const variant: InsertListingVariant = {
      sourceType: 'yahoo_realestate',
      sourceKey: `yahoo:${listing.id}`,
      sourceUrl: listing.detailUrl,
      titleJp: listing.title,
      priceJpy: listing.price.value,
      ldk: listing.layout,
      landAreaM2: listing.landArea,
      buildingAreaM2: listing.buildingArea,
      yearBuilt: listing.buildYear,
      hasLand: listing.landArea !== null && listing.landArea > 0,
      status: 'active',
    };

    return {
      variant,
      rawData: listing,
    };
  }
}

export default YahooRealEstateConnector;
