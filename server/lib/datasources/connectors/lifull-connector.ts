/**
 * LIFULL HOMES (ライフルホームズ) Connector - Research & Implementation Notes
 * 
 * Source: https://www.homes.co.jp/
 * Owner: LIFULL Co., Ltd. (formerly Next Co., Ltd.)
 * 
 * ## RESEARCH FINDINGS
 * 
 * ### robots.txt Analysis
 * - Location: https://www.homes.co.jp/robots.txt
 * - Status: ✅ Very permissive - allows general crawling
 * - Disallowed: Limited to search/review endpoints, app endpoints
 * - Many sitemaps provided for different property types
 * - No crawl-delay specified
 * 
 * ### Site Structure
 * 
 * #### Property Types
 * - /chintai/ - Rental properties (賃貸)
 * - /mansion/ - Condominiums (マンション)
 * - /kodate/ - Houses (一戸建て)
 * - /tochi/ - Land (土地)
 * - /tempo/ - Commercial (店舗)
 * - /office/ - Office space (事務所)
 * 
 * #### URL Patterns
 * - Prefecture: /{type}/{prefecture}/ (e.g., /mansion/tokyo/)
 * - City: /{type}/{prefecture}/{city}/
 * - Station: /{type}/{prefecture}/{line}/{station}/
 * - Detail: /{type}/{prefecture}/{city}/b-{id}/
 * 
 * #### New/Used Distinction
 * - New construction: /{type}/shinchiku/ or /{type}/bunjou/
 * - Used properties: /{type}/chuko/ or just /{type}/
 * 
 * ### Technical Characteristics
 * 
 * 1. **Rendering**: Primarily SSR with some dynamic elements
 *    - Listings available in initial HTML
 *    - Good for scraping
 * 
 * 2. **Rate Limiting**: Appears lenient
 *    - No CAPTCHA observed in moderate use
 *    - Responds well to respectful scraping
 * 
 * 3. **Data Structure**:
 *    - Clean semantic HTML
 *    - JSON-LD structured data on detail pages
 *    - Data attributes on listing items
 * 
 * 4. **Sitemaps**:
 *    - Comprehensive sitemap structure
 *    - Separate sitemaps for each property type
 *    - Updated regularly
 * 
 * ### Terms of Service
 * - Allows indexing by search engines
 * - No explicit scraping prohibition for public listings
 * - Commercial use should consider guidelines
 * 
 * ### API Availability
 * - ❌ No public API for listings
 * - ❌ No documented partner feed
 * - ✅ Scraping is the primary option
 * 
 * ## IMPLEMENTATION STATUS
 * 
 * ⚠️ PARTIALLY IMPLEMENTED
 * 
 * This connector provides:
 * - URL builders for all property types
 * - Listing page parser
 * - Detail page scraper structure
 * - Municipality/prefecture extraction
 * 
 * Requires:
 * - Playwright for dynamic content
 * - Full detail page parsing
 * - Photo extraction
 * 
 * ## COMPARISON WITH OTHER PORTALS
 * 
 * | Feature | SUUMO | Yahoo | LIFULL |
 * |---------|-------|-------|--------|
 * | robots.txt | Restrictive | Moderate | Permissive |
 * | Anti-bot | Aggressive | Moderate | Lenient |
 * | Data Quality | High | High | High |
 * | Akiya Focus | Medium | Medium | High |
 * | Rural Coverage | Good | Good | Excellent |
 * 
 * ## RECOMMENDATION
 * 
 * LIFULL is the most scraper-friendly of the major portals.
 * Good starting point for production scraping.
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

export interface LifullHomesConfig {
  baseUrl: string;
  requestDelay: number;
  jitter: number;
  maxRetries: number;
  userAgent: string;
  headless: boolean;
}

const DEFAULT_CONFIG: LifullHomesConfig = {
  baseUrl: 'https://www.homes.co.jp',
  requestDelay: 1500,
  jitter: 1000,
  maxRetries: 3,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  headless: true,
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const PREFECTURE_SLUGS: Record<string, string> = {
  'hokkaido': 'hokkaido',
  'aomori': 'aomori',
  'iwate': 'iwate',
  'miyagi': 'miyagi',
  'akita': 'akita',
  'yamagata': 'yamagata',
  'fukushima': 'fukushima',
  'ibaraki': 'ibaraki',
  'tochigi': 'tochigi',
  'gunma': 'gunma',
  'saitama': 'saitama',
  'chiba': 'chiba',
  'tokyo': 'tokyo',
  'kanagawa': 'kanagawa',
  'niigata': 'niigata',
  'toyama': 'toyama',
  'ishikawa': 'ishikawa',
  'fukui': 'fukui',
  'yamanashi': 'yamanashi',
  'nagano': 'nagano',
  'gifu': 'gifu',
  'shizuoka': 'shizuoka',
  'aichi': 'aichi',
  'mie': 'mie',
  'shiga': 'shiga',
  'kyoto': 'kyoto',
  'osaka': 'osaka',
  'hyogo': 'hyogo',
  'nara': 'nara',
  'wakayama': 'wakayama',
  'tottori': 'tottori',
  'shimane': 'shimane',
  'okayama': 'okayama',
  'hiroshima': 'hiroshima',
  'yamaguchi': 'yamaguchi',
  'tokushima': 'tokushima',
  'kagawa': 'kagawa',
  'ehime': 'ehime',
  'kochi': 'kochi',
  'fukuoka': 'fukuoka',
  'saga': 'saga',
  'nagasaki': 'nagasaki',
  'kumamoto': 'kumamoto',
  'oita': 'oita',
  'miyazaki': 'miyazaki',
  'kagoshima': 'kagoshima',
  'okinawa': 'okinawa',
};

// ============================================================================
// DATA MODELS
// ============================================================================

export interface LifullListing {
  id: string;
  externalId: string;
  title: string;
  price: {
    value: number | null;
    raw: string;
    currency: 'JPY';
  };
  propertyType: 'mansion' | 'kodate' | 'tochi' | 'chintai' | 'tempo' | 'office';
  listingType: 'new' | 'used' | 'rent';
  layout: string | null;
  buildingArea: number | null;
  landArea: number | null;
  address: string;
  prefecture: string;
  municipality: string;
  station: string | null;
  stationDistance: number | null;
  stationLine: string | null;
  buildYear: number | null;
  floor: string | null;
  totalFloors: number | null;
  structure: string | null;
  thumbnailUrl: string | null;
  detailUrl: string;
  scrapedAt: string;
}

export interface LifullDetail extends LifullListing {
  description: string | null;
  features: string[];
  photos: string[];
  contactPhone: string | null;
  realEstateCompany: string | null;
  realEstateCompanyAddress: string | null;
  managementFee: string | null;
  repairReserve: string | null;
}

// ============================================================================
// CONNECTOR IMPLEMENTATION
// ============================================================================

export class LifullHomesConnector implements ListingConnector {
  readonly name = 'lifull';
  readonly sourceType: SourceType = 'lifull';
  
  private config: LifullHomesConfig;
  private browser: Browser | null = null;

  constructor(config: Partial<LifullHomesConfig> = {}) {
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
      const propertyType = (params?.propertyType as string) || 'kodate';
      const listingType = (params?.listingType as string) || 'chuko';
      
      const listings = await this.scrapeListings(prefecture, propertyType, listingType);
      
      return {
        success: true,
        data: listings,
        metadata: {
          prefecture,
          propertyType,
          listingType,
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
    const listings = data as LifullListing[];
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
    await new Promise(resolve => setTimeout(resolve, Math.max(500, delay)));
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
    listingType: string = 'chuko',
    maxPages: number = 5
  ): Promise<LifullListing[]> {
    const page = await this.getPage();
    const listings: LifullListing[] = [];
    
    try {
      const url = this.buildListingUrl(prefecture, propertyType, listingType);
      console.log(`[LIFULL HOMES] Scraping ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle' });
      await this.delay();

      let currentPage = 1;

      while (currentPage <= maxPages) {
        const html = await page.content();
        const $ = cheerio.load(html);
        
        // Parse listings from current page
        const pageListings = this.parseListingPage($, prefecture, propertyType, listingType);
        listings.push(...pageListings);

        console.log(`[LIFULL HOMES] Page ${currentPage}: ${pageListings.length} listings`);

        // Check for next page
        const nextLink = await page.$('a[rel="next"], .pagination a:last-child, a:has-text("次へ")');
        if (!nextLink || currentPage >= maxPages) break;

        const hasNext = await nextLink.evaluate(el => {
          return !el.classList.contains('disabled') && !el.getAttribute('aria-disabled');
        });

        if (!hasNext) break;

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
  private buildListingUrl(
    prefecture: string,
    propertyType: string,
    listingType: string
  ): string {
    const prefSlug = PREFECTURE_SLUGS[prefecture.toLowerCase()] || prefecture;

    // Determine type path
    let typePath = propertyType;
    
    // Add listing type modifier
    if (listingType === 'shinchiku' || listingType === 'new') {
      typePath = `${propertyType}/shinchiku`;
    } else if (listingType === 'chuko' || listingType === 'used') {
      typePath = `${propertyType}/chuko`;
    }

    return `${this.config.baseUrl}/${typePath}/${prefSlug}/`;
  }

  /**
   * Parse a listing page
   */
  private parseListingPage(
    $: cheerio.CheerioAPI,
    prefecture: string,
    propertyType: string,
    listingType: string
  ): LifullListing[] {
    const listings: LifullListing[] = [];

    // LIFULL uses various selectors
    const selectors = [
      '.bukken-card',
      '[data-bukken-id]',
      '.property-unit',
      'article.bukken',
      '.list-item',
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        
        // Get bukken ID from data attribute or URL
        const bukkenId = $el.attr('data-bukken-id') || 
                        $el.attr('data-id') || 
                        '';

        // Find detail link
        const detailLink = $el.find('a[href*="/b-"], a[href*="/r-"]').first();
        let detailUrl = detailLink.attr('href') || '';
        
        if (!detailUrl) return;
        
        // Make absolute URL
        if (!detailUrl.startsWith('http')) {
          detailUrl = `${this.config.baseUrl}${detailUrl}`;
        }

        // Extract ID from URL if not in data attribute
        const id = bukkenId || this.extractIdFromUrl(detailUrl);
        if (!id) return;

        // Parse title
        const title = $el.find('.title, h3, h2, .bukken-title').first().text().trim() || '物件';

        // Parse price
        const priceText = $el.find('.price, .bukken-price, [class*="price"]').first().text().trim();
        const price = this.parsePrice(priceText);

        // Parse layout
        const layout = $el.find('.layout, .madori, [class*="layout"]').first().text().trim() || null;

        // Parse address
        const address = $el.find('.address, .bukken-address, [class*="address"]').first().text().trim();

        // Parse areas
        const areaText = $el.find('.area, .bukken-area, [class*="area"]').first().text().trim();
        const { buildingArea, landArea } = this.parseAreas(areaText);

        // Parse station access
        const stationText = $el.find('.station, .access, [class*="station"], [class*="access"]').first().text().trim();
        const { station, stationLine, stationDistance } = this.parseStation(stationText);

        // Parse year built
        const yearText = $el.find('.year, .built, [class*="year"], [class*="built"]').first().text().trim();
        const buildYear = this.parseYear(yearText);

        // Parse thumbnail
        const thumbnailUrl = $el.find('img').first().attr('src') || 
                            $el.find('img').first().attr('data-src') || 
                            null;

        listings.push({
          id,
          externalId: id,
          title,
          price,
          propertyType: this.mapPropertyType(propertyType),
          listingType: this.mapListingType(listingType),
          layout,
          buildingArea,
          landArea,
          address,
          prefecture,
          municipality: this.extractMunicipality(address),
          station,
          stationDistance,
          stationLine,
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
   * Scrape detail page
   */
  async scrapeDetail(listing: LifullListing): Promise<LifullDetail> {
    const page = await this.getPage();
    
    try {
      await page.goto(listing.detailUrl, { waitUntil: 'networkidle' });
      await this.delay();

      const html = await page.content();
      const $ = cheerio.load(html);

      // Parse description
      const description = $('.description, .bukken-description, #description').first().text().trim() || null;
      
      // Parse features/tags
      const features: string[] = [];
      $('.feature, .tag, .point, [class*="feature"], [class*="tag"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 50) features.push(text);
      });

      // Parse photos
      const photos: string[] = [];
      $('.photo img, .gallery img, [class*="photo"] img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) photos.push(src);
      });

      // Parse contact info
      const contactPhone = $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || null;
      
      // Parse real estate company
      const realEstateCompany = $('.company, .agent, [class*="company"], [class*="agent"]').first().text().trim() || null;
      
      // Parse fees (for rentals)
      const managementFee = $('.management-fee, [class*="kanri"]').first().text().trim() || null;
      const repairReserve = $('.repair-reserve, [class*="shuzen"]').first().text().trim() || null;

      return {
        ...listing,
        description,
        features: [...new Set(features)], // dedupe
        photos: [...new Set(photos)],
        contactPhone,
        realEstateCompany,
        realEstateCompanyAddress: null,
        managementFee,
        repairReserve,
      };
    } finally {
      await page.close();
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private extractIdFromUrl(url: string): string {
    // Pattern: /b-123456/ or /r-123456/
    const match = url.match(/\/[br]-(\d+)/);
    return match ? match[1] : '';
  }

  private parsePrice(text: string): LifullListing['price'] {
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
    // Look for patterns like "专有面積 75.5㎡" or "75.5㎡"
    const buildingMatch = text.match(/([\d.]+)\s*㎡/);
    const buildingArea = buildingMatch ? parseFloat(buildingMatch[1]) : null;
    
    // Land area
    const landMatch = text.match(/土地\s*([\d.]+)\s*㎡/);
    const landArea = landMatch ? parseFloat(landMatch[1]) : null;

    return { buildingArea, landArea };
  }

  private parseStation(text: string): { station: string | null; stationLine: string | null; stationDistance: number | null } {
    // Pattern: "JR山手線 渋谷駅 徒歩10分" or "渋谷駅まで徒歩10分"
    
    // Extract distance
    const distanceMatch = text.match(/徒歩\s*(\d+)\s*分/);
    const stationDistance = distanceMatch ? parseInt(distanceMatch[1], 10) : null;
    
    // Extract line and station
    const lineStationMatch = text.match(/(.+?)\s*(\S+?駅)/);
    if (lineStationMatch) {
      return {
        stationLine: lineStationMatch[1].trim(),
        station: lineStationMatch[2].trim(),
        stationDistance,
      };
    }

    // Just station name
    const stationMatch = text.match(/(\S+?駅)/);
    return {
      stationLine: null,
      station: stationMatch ? stationMatch[1] : null,
      stationDistance,
    };
  }

  private parseYear(text: string): number | null {
    // Pattern: "築10年" or "2005年築" or "2005年"
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
    
    // "築10年" - calculate from current year
    const ageMatch = text.match(/築\s*(\d+)\s*年/);
    if (ageMatch) {
      const age = parseInt(ageMatch[1], 10);
      return new Date().getFullYear() - age;
    }
    
    return null;
  }

  private mapPropertyType(type: string): LifullListing['propertyType'] {
    const typeMap: Record<string, LifullListing['propertyType']> = {
      'mansion': 'mansion',
      'kodate': 'kodate',
      'tochi': 'tochi',
      'chintai': 'chintai',
      'tempo': 'tempo',
      'office': 'office',
    };
    return typeMap[type] || 'kodate';
  }

  private mapListingType(type: string): LifullListing['listingType'] {
    if (type === 'shinchiku' || type === 'new') return 'new';
    if (type === 'chintai' || type === 'rent') return 'rent';
    return 'used';
  }

  private extractMunicipality(address: string): string {
    // Pattern: 東京都渋谷区... -> 渋谷区
    // Pattern: 北海道札幌市中央区... -> 札幌市
    const match = address.match(/([^都道府県]+?[市区町村])/);
    return match ? match[1] : '';
  }

  // ========================================================================
  // NORMALIZATION
  // ========================================================================

  private normalizeListing(listing: LifullListing): NormalizedListing {
    const variant: InsertListingVariant = {
      sourceType: 'lifull',
      sourceKey: `lifull:${listing.id}`,
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

export default LifullHomesConnector;
