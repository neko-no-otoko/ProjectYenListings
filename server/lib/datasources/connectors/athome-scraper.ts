/**
 * AtHome Akiya Bank Scraper
 * 
 * A respectful, robust scraper for Japan's largest akiya (vacant house) database.
 * Target: https://www.akiya-athome.jp
 * Listings: ~11,034 properties across 894 municipalities
 * 
 * @author AI Research Assistant
 * @version 1.0.0
 */

import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ScraperConfig {
  /** Base URL for the site (must include www) */
  baseUrl: string;
  /** Delay between requests in milliseconds */
  requestDelay: number;
  /** Random jitter to add to delay (±ms) */
  jitter: number;
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** Delay between retries */
  retryDelay: number;
  /** User agent string */
  userAgent: string;
  /** Whether to run in headless mode */
  headless: boolean;
  /** Output directory for data */
  outputDir: string;
}

const DEFAULT_CONFIG: ScraperConfig = {
  baseUrl: 'https://www.akiya-athome.jp',
  requestDelay: 2000,
  jitter: 1000,
  maxConcurrent: 2,
  maxRetries: 3,
  retryDelay: 5000,
  userAgent: 'AkiyaResearchBot/1.0 (Research Project; Respectful Scraping)',
  headless: true,
  outputDir: './data',
};

// ============================================================================
// DATA MODELS
// ============================================================================

export interface PropertyListing {
  id: string;
  externalId: string;
  title: string;
  price: {
    value: number | null;
    raw: string;
    currency: 'JPY';
  };
  propertyType: 'house' | 'land' | 'mansion' | 'invest' | 'live' | 'business' | 'unknown';
  listingType: 'buy' | 'rent';
  layout: string | null;
  buildingArea: number | null;
  landArea: number | null;
  address: string;
  prefecture: string;
  municipality: string;
  transportation: string;
  buildDate: string | null;
  thumbnailUrl: string | null;
  detailUrl: string;
  municipalitySubdomain: string;
  photoCount: number;
  scrapedAt: string;
}

export interface PropertyDetail extends PropertyListing {
  floorCount: number | null;
  structure: string | null;
  parking: string | null;
  currentStatus: string | null;
  handover: string | null;
  landRights: string | null;
  landUse: string | null;
  buildingCoverage: number | null;
  floorAreaRatio: number | null;
  landType: string | null;
  features: string[];
  remarks: string | null;
  publicationDate: string | null;
  nextUpdate: string | null;
  facilities: SurroundingFacility[];
  photos: PropertyPhoto[];
  contactInfo: ContactInfo;
}

export interface SurroundingFacility {
  type: string;
  name: string;
  distance: number | null;
}

export interface PropertyPhoto {
  url: string;
  caption: string | null;
}

export interface ContactInfo {
  phone: string | null;
  department: string | null;
  inquiryNumber: string | null;
  address: string | null;
}

export interface Municipality {
  code: string;
  name: string;
  prefectureCode: string;
  prefectureName: string;
  subdomain: string | null;
  listingCount: number;
  hasDedicatedSite: boolean;
  siteUrl: string | null;
}

export interface Prefecture {
  code: string;
  name: string;
  nameEn: string;
  region: string;
}

// ============================================================================
// PREFECTURE DATA (JIS X 0401)
// ============================================================================

export const PREFECTURES: Prefecture[] = [
  { code: '01', name: '北海道', nameEn: 'Hokkaido', region: 'Hokkaido' },
  { code: '02', name: '青森', nameEn: 'Aomori', region: 'Tohoku' },
  { code: '03', name: '岩手', nameEn: 'Iwate', region: 'Tohoku' },
  { code: '04', name: '宮城', nameEn: 'Miyagi', region: 'Tohoku' },
  { code: '05', name: '秋田', nameEn: 'Akita', region: 'Tohoku' },
  { code: '06', name: '山形', nameEn: 'Yamagata', region: 'Tohoku' },
  { code: '07', name: '福島', nameEn: 'Fukushima', region: 'Tohoku' },
  { code: '08', name: '茨城', nameEn: 'Ibaraki', region: 'Kanto' },
  { code: '09', name: '栃木', nameEn: 'Tochigi', region: 'Kanto' },
  { code: '10', name: '群馬', nameEn: 'Gunma', region: 'Kanto' },
  { code: '11', name: '埼玉', nameEn: 'Saitama', region: 'Kanto' },
  { code: '12', name: '千葉', nameEn: 'Chiba', region: 'Kanto' },
  { code: '13', name: '東京', nameEn: 'Tokyo', region: 'Kanto' },
  { code: '14', name: '神奈川', nameEn: 'Kanagawa', region: 'Kanto' },
  { code: '15', name: '新潟', nameEn: 'Niigata', region: 'Chubu' },
  { code: '16', name: '富山', nameEn: 'Toyama', region: 'Chubu' },
  { code: '17', name: '石川', nameEn: 'Ishikawa', region: 'Chubu' },
  { code: '18', name: '福井', nameEn: 'Fukui', region: 'Chubu' },
  { code: '19', name: '山梨', nameEn: 'Yamanashi', region: 'Chubu' },
  { code: '20', name: '長野', nameEn: 'Nagano', region: 'Chubu' },
  { code: '21', name: '岐阜', nameEn: 'Gifu', region: 'Chubu' },
  { code: '22', name: '静岡', nameEn: 'Shizuoka', region: 'Chubu' },
  { code: '23', name: '愛知', nameEn: 'Aichi', region: 'Chubu' },
  { code: '24', name: '三重', nameEn: 'Mie', region: 'Kansai' },
  { code: '25', name: '滋賀', nameEn: 'Shiga', region: 'Kansai' },
  { code: '26', name: '京都', nameEn: 'Kyoto', region: 'Kansai' },
  { code: '27', name: '大阪', nameEn: 'Osaka', region: 'Kansai' },
  { code: '28', name: '兵庫', nameEn: 'Hyogo', region: 'Kansai' },
  { code: '29', name: '奈良', nameEn: 'Nara', region: 'Kansai' },
  { code: '30', name: '和歌山', nameEn: 'Wakayama', region: 'Kansai' },
  { code: '31', name: '鳥取', nameEn: 'Tottori', region: 'Chugoku' },
  { code: '32', name: '島根', nameEn: 'Shimane', region: 'Chugoku' },
  { code: '33', name: '岡山', nameEn: 'Okayama', region: 'Chugoku' },
  { code: '34', name: '広島', nameEn: 'Hiroshima', region: 'Chugoku' },
  { code: '35', name: '山口', nameEn: 'Yamaguchi', region: 'Chugoku' },
  { code: '36', name: '徳島', nameEn: 'Tokushima', region: 'Shikoku' },
  { code: '37', name: '香川', nameEn: 'Kagawa', region: 'Shikoku' },
  { code: '38', name: '愛媛', nameEn: 'Ehime', region: 'Shikoku' },
  { code: '39', name: '高知', nameEn: 'Kochi', region: 'Shikoku' },
  { code: '40', name: '福岡', nameEn: 'Fukuoka', region: 'Kyushu' },
  { code: '41', name: '佐賀', nameEn: 'Saga', region: 'Kyushu' },
  { code: '42', name: '長崎', nameEn: 'Nagasaki', region: 'Kyushu' },
  { code: '43', name: '熊本', nameEn: 'Kumamoto', region: 'Kyushu' },
  { code: '44', name: '大分', nameEn: 'Oita', region: 'Kyushu' },
  { code: '45', name: '宮崎', nameEn: 'Miyazaki', region: 'Kyushu' },
  { code: '46', name: '鹿児島', nameEn: 'Kagoshima', region: 'Kyushu' },
  { code: '47', name: '沖縄', nameEn: 'Okinawa', region: 'Okinawa' },
];

// ============================================================================
// MAIN SCRAPER CLASS
// ============================================================================

export class AtHomeScraper {
  private config: ScraperConfig;
  private browser: Browser | null = null;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the scraper (launch browser)
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });
    console.log('✓ Browser initialized');
  }

  /**
   * Close the scraper (close browser)
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✓ Browser closed');
    }
  }

  /**
   * Respectful delay between requests
   */
  private async delay(): Promise<void> {
    const jitter = Math.random() * this.config.jitter * 2 - this.config.jitter;
    const delay = this.config.requestDelay + jitter;
    await new Promise(resolve => setTimeout(resolve, Math.max(500, delay)));
  }

  /**
   * Get a new page with proper configuration
   */
  private async getPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage({
      userAgent: this.config.userAgent,
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
    });

    return page;
  }

  // ========================================================================
  // PHASE 1: DISCOVERY
  // ========================================================================

  /**
   * Scrape municipalities for a prefecture
   */
  async scrapeMunicipalities(prefectureCode: string): Promise<Municipality[]> {
    const page = await this.getPage();
    const url = `${this.config.baseUrl}/buy/${prefectureCode}/`;

    try {
      console.log(`Scraping municipalities for prefecture ${prefectureCode}...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await this.delay();

      const html = await page.content();
      const $ = cheerio.load(html);
      const municipalities: Municipality[] = [];

      // Parse municipality list
      // Structure: <dl><dt>[Region]</dt><dd><a href="/buy/01/?gyosei_cd[]=XXXX">Name(Count)</a></dd></dl>
      $('dl dd a').each((_, el) => {
        const $link = $(el);
        const href = $link.attr('href') || '';
        const text = $link.text().trim();

        // Extract count from text: "函館市(1)"
        const match = text.match(/^(.+?)\((\d+)\)$/);
        if (match) {
          const name = match[1];
          const count = parseInt(match[2], 10);

          // Extract municipality code from URL
          const codeMatch = href.match(/gyosei_cd\[\]=(\d+)/);
          const code = codeMatch ? codeMatch[1] : '';

          // Check if it's a dedicated subdomain URL
          const hasDedicatedSite = href.startsWith('http');
          const subdomain = hasDedicatedSite ? new URL(href).hostname : null;

          const prefecture = PREFECTURES.find(p => p.code === prefectureCode);

          municipalities.push({
            code,
            name,
            prefectureCode,
            prefectureName: prefecture?.name || '',
            subdomain,
            listingCount: count,
            hasDedicatedSite,
            siteUrl: hasDedicatedSite ? href : null,
          });
        }
      });

      console.log(`  Found ${municipalities.length} municipalities`);
      return municipalities;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape all municipalities for all prefectures
   */
  async scrapeAllMunicipalities(): Promise<Municipality[]> {
    const allMunicipalities: Municipality[] = [];

    for (const prefecture of PREFECTURES) {
      try {
        const municipalities = await this.scrapeMunicipalities(prefecture.code);
        allMunicipalities.push(...municipalities);
      } catch (error) {
        console.error(`Error scraping prefecture ${prefecture.code}:`, error);
      }
    }

    return allMunicipalities;
  }

  // ========================================================================
  // PHASE 2: LISTING EXTRACTION
  // ========================================================================

  /**
   * Scrape property listings from a prefecture page
   * Note: Handles JavaScript pagination via Playwright
   */
  async scrapeListings(
    prefectureCode: string,
    options: {
      itemsPerPage?: 20 | 50 | 100;
      maxPages?: number;
    } = {}
  ): Promise<PropertyListing[]> {
    const { itemsPerPage = 100, maxPages = Infinity } = options;
    const page = await this.getPage();
    const url = `${this.config.baseUrl}/buy/${prefectureCode}/`;

    const listings: PropertyListing[] = [];
    let currentPage = 1;

    try {
      console.log(`Scraping listings for prefecture ${prefectureCode}...`);
      await page.goto(url, { waitUntil: 'networkidle' });

      // Change items per page to maximum
      await page.selectOption('select:nth-of-type(2)', itemsPerPage.toString());
      await page.waitForLoadState('networkidle');
      await this.delay();

      while (currentPage <= maxPages) {
        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract listings from current page
        const pageListings = this.parseListingPage($, prefectureCode);
        listings.push(...pageListings);

        console.log(`  Page ${currentPage}: ${pageListings.length} listings`);

        // Check for next page
        const nextButton = await page.$('a:has-text("次へ")');
        if (!nextButton) break;

        // Click next page
        await nextButton.click();
        await page.waitForLoadState('networkidle');
        await this.delay();

        currentPage++;
      }

      console.log(`  Total: ${listings.length} listings`);
      return listings;
    } finally {
      await page.close();
    }
  }

  /**
   * Parse a listing page and extract property data
   */
  private parseListingPage($: cheerio.CheerioAPI, prefectureCode: string): PropertyListing[] {
    const listings: PropertyListing[] = [];
    const prefecture = PREFECTURES.find(p => p.code === prefectureCode);

    // Property cards - each has a link to detail page
    // Look for links containing /bukken/detail/
    $('a[href*="/bukken/detail/"]').each((_, el) => {
      const $link = $(el);
      const detailUrl = $link.attr('href') || '';

      // Skip if not a valid detail URL
      if (!detailUrl.includes('/bukken/detail/')) return;

      // Extract property ID from URL
      const idMatch = detailUrl.match(/\/bukken\/detail\/\w+\/(\d+)/);
      const id = idMatch ? idMatch[1] : '';

      // Get parent container
      const $container = $link.closest('div, article, section').parent();

      // Extract external ID (No.XX)
      const externalId = $link.text().trim();

      // Parse property type from nearby text
      const typeText = $container.find('dt:contains("物件種目") + dd').text().trim();
      const propertyType = this.parsePropertyType(typeText);

      // Parse price
      const priceText = $container.find('dt:contains("価格") + dd').text().trim();
      const price = this.parsePrice(priceText);

      // Parse layout
      const layout = $container.find('dt:contains("間取") + dd').text().trim() || null;

      // Parse areas
      const buildingArea = this.parseArea(
        $container.find('dt:contains("建物面積") + dd').text().trim()
      );
      const landArea = this.parseArea(
        $container.find('dt:contains("土地面積") + dd').text().trim()
      );

      // Parse address
      const address = $container.find('dt:contains("所在地") + dd').text().trim();
      const municipality = this.extractMunicipality(address);

      // Parse transportation
      const transportation = $container.find('dt:contains("交通") + dd').text().trim();

      // Parse build date
      const buildDateText = $container.find('dt:contains("築年月") + dd').text().trim();
      const buildDate = this.parseBuildDate(buildDateText);

      // Get photo count
      const photoText = $container.find('*:contains("写真")').text();
      const photoMatch = photoText.match(/写真\s*(\d+)枚/);
      const photoCount = photoMatch ? parseInt(photoMatch[1], 10) : 0;

      // Extract subdomain from URL
      const urlObj = new URL(detailUrl);
      const municipalitySubdomain = urlObj.hostname;

      listings.push({
        id,
        externalId,
        title: externalId,
        price,
        propertyType,
        listingType: 'buy',
        layout,
        buildingArea,
        landArea,
        address,
        prefecture: prefecture?.name || '',
        municipality,
        transportation,
        buildDate,
        thumbnailUrl: null, // Would need to extract from image
        detailUrl,
        municipalitySubdomain,
        photoCount,
        scrapedAt: new Date().toISOString(),
      });
    });

    return listings;
  }

  // ========================================================================
  // PHASE 3: DETAIL EXTRACTION
  // ========================================================================

  /**
   * Scrape detailed information for a single property
   */
  async scrapePropertyDetail(listing: PropertyListing): Promise<PropertyDetail> {
    const page = await this.getPage();

    try {
      console.log(`Scraping detail for property ${listing.id}...`);
      await page.goto(listing.detailUrl, { waitUntil: 'networkidle' });
      await this.delay();

      const html = await page.content();
      const $ = cheerio.load(html);

      // Parse detailed fields
      const detail = this.parseDetailPage($, listing);

      return detail;
    } finally {
      await page.close();
    }
  }

  /**
   * Parse a property detail page
   */
  private parseDetailPage($: cheerio.CheerioAPI, baseListing: PropertyListing): PropertyDetail {
    // Helper to safely extract text
    const getText = (label: string): string | null => {
      const text = $(`dt:contains("${label}") + dd`).first().text().trim();
      return text || null;
    };

    // Parse floor count
    const floorText = getText('階建') || '';
    const floorMatch = floorText.match(/(\d+)階建/);
    const floorCount = floorMatch ? parseInt(floorMatch[1], 10) : null;

    // Parse building coverage and floor area ratio
    const buildingCoverage = this.parsePercentage(getText('建ぺい率') || '');
    const floorAreaRatio = this.parsePercentage(getText('容積率') || '');

    // Parse features
    const featuresText = getText('こだわり') || '';
    const features = featuresText.split(/\s+/).filter(f => f);

    // Parse facilities
    const facilities: SurroundingFacility[] = [];
    $('section:has(h4:contains("周辺施設")) li, section:has(h4:contains("周辺施設")) dl').each((_, el) => {
      const $item = $(el);
      const type = $item.find('span, dt').first().text().trim();
      const name = $item.find('h5, dd').first().text().trim();
      const distanceText = $item.find('p').text().trim();
      const distanceMatch = distanceText.match(/(\d+)m/);
      const distance = distanceMatch ? parseInt(distanceMatch[1], 10) : null;

      if (name) {
        facilities.push({ type, name, distance });
      }
    });

    // Parse photos
    const photos: PropertyPhoto[] = [];
    // TODO: Extract photo URLs from gallery

    // Parse contact info
    const contactInfo: ContactInfo = {
      phone: getText('電話') || $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || null,
      department: $('h1').text().trim() || null,
      inquiryNumber: null, // Extract from page text
      address: getText('所在地') || null,
    };

    return {
      ...baseListing,
      floorCount,
      structure: getText('建物構造'),
      parking: getText('駐車場'),
      currentStatus: getText('現況'),
      handover: getText('引渡し'),
      landRights: getText('土地権利'),
      landUse: getText('用途地域'),
      buildingCoverage,
      floorAreaRatio,
      landType: getText('地目'),
      features,
      remarks: getText('備考'),
      publicationDate: this.parseDate(getText('情報公開日') || ''),
      nextUpdate: getText('次回更新予定日'),
      facilities,
      photos,
      contactInfo,
    };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Parse property type from Japanese text
   */
  private parsePropertyType(text: string): PropertyListing['propertyType'] {
    if (text.includes('戸建')) return 'house';
    if (text.includes('土地')) return 'land';
    if (text.includes('マンション')) return 'mansion';
    if (text.includes('投資')) return 'invest';
    return 'unknown';
  }

  /**
   * Parse price from Japanese text
   */
  private parsePrice(text: string): PropertyListing['price'] {
    // Handle "相談" (negotiable)
    if (text.includes('相談')) {
      return { value: null, raw: text, currency: 'JPY' };
    }

    // Parse "330万円" or "1,500万円"
    const match = text.replace(/,/g, '').match(/([\d.]+)万円/);
    if (match) {
      const man = parseFloat(match[1]);
      return {
        value: man * 10000, // Convert to yen
        raw: text,
        currency: 'JPY',
      };
    }

    return { value: null, raw: text, currency: 'JPY' };
  }

  /**
   * Parse area from Japanese text
   */
  private parseArea(text: string): number | null {
    // Handle "面積不明" (unknown)
    if (text.includes('不明')) return null;

    const match = text.replace(/,/g, '').match(/([\d.]+)\s*㎡/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Parse percentage from text
   */
  private parsePercentage(text: string): number | null {
    if (text === '-' || !text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Parse build date from Japanese text
   */
  private parseBuildDate(text: string): string | null {
    const match = text.match(/(\d{4})年(\d{1,2})月/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}-01`;
    }
    return null;
  }

  /**
   * Parse date from Japanese text
   */
  private parseDate(text: string): string | null {
    const match = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  /**
   * Extract municipality name from address
   */
  private extractMunicipality(address: string): string {
    // Pattern: 北海道樺戸郡月形町字赤川 -> 月形町
    const match = address.match(/([^都道府県]+?[市町村])/);
    return match ? match[1] : address;
  }
}

// ============================================================================
// CLI / MAIN EXECUTION
// ============================================================================

async function main() {
  const scraper = new AtHomeScraper({
    headless: true,
    requestDelay: 2000,
  });

  try {
    await scraper.initialize();

    // Example: Scrape municipalities for Hokkaido
    console.log('=== Phase 1: Discovery ===');
    const municipalities = await scraper.scrapeMunicipalities('01');
    console.log(`Found ${municipalities.length} municipalities in Hokkaido`);

    // Example: Scrape listings
    console.log('\n=== Phase 2: Listing Extraction ===');
    const listings = await scraper.scrapeListings('01', { itemsPerPage: 20, maxPages: 2 });
    console.log(`Scraped ${listings.length} listings`);

    // Example: Scrape detail for first listing
    if (listings.length > 0) {
      console.log('\n=== Phase 3: Detail Extraction ===');
      const detail = await scraper.scrapePropertyDetail(listings[0]);
      console.log('Property detail:', JSON.stringify(detail, null, 2));
    }

  } catch (error) {
    console.error('Scraper error:', error);
  } finally {
    await scraper.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default AtHomeScraper;
