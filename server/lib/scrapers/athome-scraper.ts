/**
 * AtHome Akiya Bank Scraper
 * 
 * A respectful, robust scraper for Japan's largest akiya (vacant house) database.
 * Target: https://www.akiya-athome.jp
 * Listings: ~11,034 properties across 894 municipalities
 * 
 * Rate limit: 1 request per second (60 req/min)
 * 
 * @author AI Research Assistant
 * @version 1.0.0
 */

import { db } from "../../db";
import { 
  listingVariants, 
  propertyEntities, 
  rawCaptures,
  type InsertListingVariant,
  type InsertPropertyEntity,
  type InsertRawCapture
} from "@shared/schema";
import { getRateLimiter } from "../ingestion/rateLimiter";
import { 
  captureRaw, 
  upsertListingVariant, 
  upsertPropertyEntity,
  generateSourceKey 
} from "../ingestion/upsert";
import { createIngestionLog, updateIngestionLog } from "../ingestion/upsert";

// ============================================================================
// CONFIGURATION
// ============================================================================

const ATHOME_BASE_URL = "https://www.akiya-athome.jp";
const ATHOME_HOST = "www.akiya-athome.jp";
const REQUEST_DELAY_MS = 1000; // 1 second between requests (60 req/min)

// Prefecture codes (JIS X 0401)
export const PREFECTURES: Array<{ code: string; name: string; nameEn: string }> = [
  { code: "01", name: "北海道", nameEn: "Hokkaido" },
  { code: "02", name: "青森", nameEn: "Aomori" },
  { code: "03", name: "岩手", nameEn: "Iwate" },
  { code: "04", name: "宮城", nameEn: "Miyagi" },
  { code: "05", name: "秋田", nameEn: "Akita" },
  { code: "06", name: "山形", nameEn: "Yamagata" },
  { code: "07", name: "福島", nameEn: "Fukushima" },
  { code: "08", name: "茨城", nameEn: "Ibaraki" },
  { code: "09", name: "栃木", nameEn: "Tochigi" },
  { code: "10", name: "群馬", nameEn: "Gunma" },
  { code: "11", name: "埼玉", nameEn: "Saitama" },
  { code: "12", name: "千葉", nameEn: "Chiba" },
  { code: "13", name: "東京", nameEn: "Tokyo" },
  { code: "14", name: "神奈川", nameEn: "Kanagawa" },
  { code: "15", name: "新潟", nameEn: "Niigata" },
  { code: "16", name: "富山", nameEn: "Toyama" },
  { code: "17", name: "石川", nameEn: "Ishikawa" },
  { code: "18", name: "福井", nameEn: "Fukui" },
  { code: "19", name: "山梨", nameEn: "Yamanashi" },
  { code: "20", name: "長野", nameEn: "Nagano" },
  { code: "21", name: "岐阜", nameEn: "Gifu" },
  { code: "22", name: "静岡", nameEn: "Shizuoka" },
  { code: "23", name: "愛知", nameEn: "Aichi" },
  { code: "24", name: "三重", nameEn: "Mie" },
  { code: "25", name: "滋賀", nameEn: "Shiga" },
  { code: "26", name: "京都", nameEn: "Kyoto" },
  { code: "27", name: "大阪", nameEn: "Osaka" },
  { code: "28", name: "兵庫", nameEn: "Hyogo" },
  { code: "29", name: "奈良", nameEn: "Nara" },
  { code: "30", name: "和歌山", nameEn: "Wakayama" },
  { code: "31", name: "鳥取", nameEn: "Tottori" },
  { code: "32", name: "島根", nameEn: "Shimane" },
  { code: "33", name: "岡山", nameEn: "Okayama" },
  { code: "34", name: "広島", nameEn: "Hiroshima" },
  { code: "35", name: "山口", nameEn: "Yamaguchi" },
  { code: "36", name: "徳島", nameEn: "Tokushima" },
  { code: "37", name: "香川", nameEn: "Kagawa" },
  { code: "38", name: "愛媛", nameEn: "Ehime" },
  { code: "39", name: "高知", nameEn: "Kochi" },
  { code: "40", name: "福岡", nameEn: "Fukuoka" },
  { code: "41", name: "佐賀", nameEn: "Saga" },
  { code: "42", name: "長崎", nameEn: "Nagasaki" },
  { code: "43", name: "熊本", nameEn: "Kumamoto" },
  { code: "44", name: "大分", nameEn: "Oita" },
  { code: "45", name: "宮崎", nameEn: "Miyazaki" },
  { code: "46", name: "鹿児島", nameEn: "Kagoshima" },
  { code: "47", name: "沖縄", nameEn: "Okinawa" },
];

// ============================================================================
// DATA MODELS
// ============================================================================

export interface ScrapedProperty {
  externalId: string;           // Display ID (e.g., "No.96")
  propertyId: string;           // Internal property ID from URL
  title: string;
  price: {
    value: number | null;
    raw: string;
    currency: "JPY";
  };
  propertyType: "house" | "land" | "mansion" | "invest" | "unknown";
  layout: string | null;        // "6LDK", etc.
  buildingArea: number | null;  // Square meters
  landArea: number | null;      // Square meters
  address: string;
  prefecture: string;
  municipality: string;
  transportation: string;
  buildDate: string | null;     // ISO date or null
  photoCount: number;
  detailUrl: string;
  municipalitySubdomain: string;
}

export interface ScrapeResult {
  success: boolean;
  properties: ScrapedProperty[];
  totalCount: number;
  error?: string;
}

export interface AtHomeScraperStats {
  prefecturesScanned: number;
  propertiesFound: number;
  propertiesUpserted: number;
  propertiesUpdated: number;
  errors: string[];
}

// ============================================================================
// HTTP CLIENT WITH RATE LIMITING
// ============================================================================

export class AtHomeHttpClient {
  private rateLimiter = getRateLimiter(ATHOME_HOST, 60);
  private userAgent = "AkiyaResearchBot/1.0 (Research Project; Respectful Scraping; Contact: research@example.com)";

  async fetch(url: string): Promise<{ success: boolean; html?: string; error?: string; status?: number }> {
    try {
      // Acquire rate limit token (1 req/sec)
      await this.rateLimiter.acquire();

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "DNT": "1",
          "Connection": "keep-alive",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      const html = await response.text();
      return { success: true, html, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

// ============================================================================
// HTML PARSERS
// ============================================================================

export class AtHomeHtmlParser {
  /**
   * Parse property listings from prefecture listing page HTML
   */
  parseListings(html: string, prefectureCode: string): ScrapedProperty[] {
    const properties: ScrapedProperty[] = [];
    const prefecture = PREFECTURES.find(p => p.code === prefectureCode);

    // Find all property cards by looking for detail URLs
    // Pattern: <a href="https://[subdomain].akiya-athome.jp/bukken/detail/buy/[ID]">
    const detailUrlRegex = /https:\/\/([^\s"]+\.akiya-athome\.jp)\/bukken\/detail\/buy\/(\d+)/g;
    const matches = Array.from(html.matchAll(detailUrlRegex));

    for (const match of matches) {
      const subdomain = match[1];
      const propertyId = match[2];
      const detailUrl = match[0];

      // Extract property details from surrounding HTML context
      // Find the property card context (within ~1000 chars before and after the URL)
      const urlIndex = html.indexOf(match[0]);
      const contextStart = Math.max(0, urlIndex - 1500);
      const contextEnd = Math.min(html.length, urlIndex + 1500);
      const context = html.slice(contextStart, contextEnd);

      const property = this.parsePropertyCard(context, propertyId, detailUrl, subdomain, prefecture);
      if (property) {
        properties.push(property);
      }
    }

    // Deduplicate by propertyId
    const seen = new Set<string>();
    return properties.filter(p => {
      if (seen.has(p.propertyId)) return false;
      seen.add(p.propertyId);
      return true;
    });
  }

  /**
   * Parse a single property card HTML
   */
  private parsePropertyCard(
    context: string,
    propertyId: string,
    detailUrl: string,
    subdomain: string,
    prefecture?: { code: string; name: string; nameEn: string }
  ): ScrapedProperty | null {
    // Extract external ID (No.XX) - look for pattern near the link
    const externalIdMatch = context.match(/No\.(\d+)/);
    const externalId = externalIdMatch ? `No.${externalIdMatch[1]}` : `ID:${propertyId}`;

    // Extract price
    const priceText = this.extractDtDdValue(context, "価格");
    const price = this.parsePrice(priceText);

    // Extract layout
    const layout = this.extractDtDdValue(context, "間取") || null;

    // Extract building area
    const buildingAreaText = this.extractDtDdValue(context, "建物面積");
    const buildingArea = this.parseArea(buildingAreaText);

    // Extract land area
    const landAreaText = this.extractDtDdValue(context, "土地面積");
    const landArea = this.parseArea(landAreaText);

    // Extract address
    const address = this.extractDtDdValue(context, "所在地") || "";

    // Extract property type
    const typeText = this.extractDtDdValue(context, "物件種目");
    const propertyType = this.parsePropertyType(typeText);

    // Extract transportation
    const transportation = this.extractDtDdValue(context, "交通") || "";

    // Extract build date
    const buildDateText = this.extractDtDdValue(context, "築年月");
    const buildDate = this.parseBuildDate(buildDateText);

    // Extract photo count
    const photoMatch = context.match(/写真\s*(\d+)枚/);
    const photoCount = photoMatch ? parseInt(photoMatch[1], 10) : 0;

    // Extract municipality from address
    const municipality = this.extractMunicipality(address);

    return {
      externalId,
      propertyId,
      title: externalId,
      price,
      propertyType,
      layout,
      buildingArea,
      landArea,
      address,
      prefecture: prefecture?.name || "",
      municipality,
      transportation,
      buildDate,
      photoCount,
      detailUrl,
      municipalitySubdomain: subdomain,
    };
  }

  /**
   * Extract value from dt/dd pattern
   */
  private extractDtDdValue(html: string, label: string): string | null {
    // Try to find: <dt>...label...</dt><dd>VALUE</dd>
    const patterns = [
      new RegExp(`<dt[^>]*>[^<]*${label}[^<]*<\/dt>\\s*<dd[^>]*>([^<]+)<\/dd>`, "i"),
      new RegExp(`${label}[：:]\\s*([^<\n]+)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Parse price from Japanese text
   */
  private parsePrice(text: string | null): ScrapedProperty["price"] {
    if (!text) {
      return { value: null, raw: "", currency: "JPY" };
    }

    // Handle "相談" (negotiable)
    if (text.includes("相談")) {
      return { value: null, raw: text, currency: "JPY" };
    }

    // Parse "330万円" or "1,500万円"
    const match = text.replace(/,/g, "").match(/([\d.]+)万円/);
    if (match) {
      const man = parseFloat(match[1]);
      return {
        value: man * 10000, // Convert to yen
        raw: text,
        currency: "JPY",
      };
    }

    return { value: null, raw: text, currency: "JPY" };
  }

  /**
   * Parse area from Japanese text
   */
  private parseArea(text: string | null): number | null {
    if (!text) return null;
    // Handle "面積不明" (unknown)
    if (text.includes("不明")) return null;

    const match = text.replace(/,/g, "").match(/([\d.]+)\s*㎡/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Parse property type from Japanese text
   */
  private parsePropertyType(text: string | null): ScrapedProperty["propertyType"] {
    if (!text) return "unknown";
    if (text.includes("戸建")) return "house";
    if (text.includes("土地")) return "land";
    if (text.includes("マンション")) return "mansion";
    if (text.includes("投資")) return "invest";
    return "unknown";
  }

  /**
   * Parse build date from Japanese text
   */
  private parseBuildDate(text: string | null): string | null {
    if (!text) return null;
    const match = text.match(/(\d{4})年(\d{1,2})月/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, "0");
      return `${year}-${month}-01`;
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

  /**
   * Extract total count from listing page
   */
  extractTotalCount(html: string): number {
    // Pattern: "241件中1～20件を表示" or "全241件"
    const patterns = [
      /(\d+)件中/,
      /全(\d+)件/,
      /(\d+)件/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  }
}

// ============================================================================
// MAIN SCRAPER CLASS
// ============================================================================

export class AtHomeScraper {
  private httpClient = new AtHomeHttpClient();
  private parser = new AtHomeHtmlParser();
  private stats: AtHomeScraperStats = {
    prefecturesScanned: 0,
    propertiesFound: 0,
    propertiesUpserted: 0,
    propertiesUpdated: 0,
    errors: [],
  };

  /**
   * Scrape listings for a single prefecture
   */
  async scrapePrefecture(prefectureCode: string): Promise<ScrapeResult> {
    const url = `${ATHOME_BASE_URL}/buy/${prefectureCode}/`;
    
    console.log(`[AtHome] Scraping prefecture ${prefectureCode}...`);
    
    const result = await this.httpClient.fetch(url);
    
    if (!result.success || !result.html) {
      const error = result.error || "Unknown error";
      this.stats.errors.push(`Prefecture ${prefectureCode}: ${error}`);
      return { success: false, properties: [], totalCount: 0, error };
    }

    // Capture raw HTML for debugging/auditing
    const rawCaptureId = await this.captureRawData(result.html, prefectureCode);

    const properties = this.parser.parseListings(result.html, prefectureCode);
    const totalCount = this.parser.extractTotalCount(result.html);

    console.log(`[AtHome] Found ${properties.length} properties (total: ${totalCount})`);

    this.stats.prefecturesScanned++;
    this.stats.propertiesFound += properties.length;

    // Store properties in database
    for (const property of properties) {
      await this.storeProperty(property, rawCaptureId);
    }

    return {
      success: true,
      properties,
      totalCount,
    };
  }

  /**
   * Scrape all prefectures
   */
  async scrapeAllPrefectures(options: { 
    maxPrefectures?: number;
    specificPrefectures?: string[];
  } = {}): Promise<AtHomeScraperStats> {
    const { maxPrefectures, specificPrefectures } = options;
    
    let prefecturesToScrape = PREFECTURES;
    
    if (specificPrefectures && specificPrefectures.length > 0) {
      prefecturesToScrape = PREFECTURES.filter(p => specificPrefectures.includes(p.code));
    }
    
    if (maxPrefectures) {
      prefecturesToScrape = prefecturesToScrape.slice(0, maxPrefectures);
    }

    console.log(`[AtHome] Starting scrape of ${prefecturesToScrape.length} prefectures...`);

    for (const prefecture of prefecturesToScrape) {
      try {
        await this.scrapePrefecture(prefecture.code);
      } catch (error) {
        const errorMsg = (error as Error).message;
        console.error(`[AtHome] Error scraping prefecture ${prefecture.code}:`, errorMsg);
        this.stats.errors.push(`Prefecture ${prefecture.code}: ${errorMsg}`);
      }
    }

    return this.stats;
  }

  /**
   * Capture raw HTML for auditing
   */
  private async captureRawData(html: string, prefectureCode: string): Promise<string> {
    const capture: InsertRawCapture = {
      sourceType: "athome",
      contentType: "json",
      inlineJson: {
        prefectureCode,
        htmlLength: html.length,
        htmlSnippet: html.slice(0, 5000), // Store first 5KB for debugging
        scrapedAt: new Date().toISOString(),
      },
    };

    return await captureRaw(capture);
  }

  /**
   * Store a property in the database
   */
  private async storeProperty(property: ScrapedProperty, rawCaptureId: string): Promise<void> {
    // Create property entity
    const propertyEntity: InsertPropertyEntity = {
      canonicalAddressJp: property.address,
      prefecture: property.prefecture,
      municipality: property.municipality,
      confidenceScore: 0.7,
    };

    const propertyEntityId = await upsertPropertyEntity(propertyEntity);

    // Create listing variant
    const sourceKey = generateSourceKey("athome", property.propertyId, property.detailUrl);

    const variant: InsertListingVariant = {
      propertyEntityId,
      sourceType: "athome",
      sourceKey,
      sourceUrl: property.detailUrl,
      titleJp: property.title,
      priceJpy: property.price.value,
      ldk: property.layout,
      landAreaM2: property.landArea,
      buildingAreaM2: property.buildingArea,
      yearBuilt: property.buildDate ? parseInt(property.buildDate.slice(0, 4), 10) : null,
      hasLand: property.landArea !== null && property.landArea > 0,
      rawCaptureId,
      status: "active",
      translateStatus: "pending",
    };

    const result = await upsertListingVariant(variant);

    if (result.isNew) {
      this.stats.propertiesUpserted++;
    } else {
      this.stats.propertiesUpdated++;
    }
  }

  /**
   * Get current stats
   */
  getStats(): AtHomeScraperStats {
    return { ...this.stats };
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.stats = {
      prefecturesScanned: 0,
      propertiesFound: 0,
      propertiesUpserted: 0,
      propertiesUpdated: 0,
      errors: [],
    };
  }
}

// ============================================================================
// JOB RUNNER
// ============================================================================

export async function runAtHomeScrapeJob(options: {
  specificPrefectures?: string[];
  maxPrefectures?: number;
} = {}): Promise<{ 
  success: boolean; 
  stats: AtHomeScraperStats;
  logId?: string;
  error?: string;
}> {
  const logId = await createIngestionLog({
    connectorName: "athome_scraper",
    jobType: "scrape",
    status: "running",
  });

  const scraper = new AtHomeScraper();

  try {
    console.log("[AtHomeScraper] Starting scrape job...");
    
    const stats = await scraper.scrapeAllPrefectures({
      specificPrefectures: options.specificPrefectures,
      maxPrefectures: options.maxPrefectures,
    });

    const success = stats.errors.length === 0;

    await updateIngestionLog(logId, {
      completedAt: new Date(),
      status: success ? "completed" : "completed_with_errors",
      itemsFetched: stats.propertiesFound,
      itemsUpserted: stats.propertiesUpserted,
      itemsSkipped: stats.propertiesUpdated,
      errorMessage: stats.errors.length > 0 ? stats.errors.join("; ") : undefined,
      metadata: {
        prefecturesScanned: stats.prefecturesScanned,
        errors: stats.errors,
      },
    });

    console.log("[AtHomeScraper] Job completed:", stats);

    return {
      success,
      stats,
      logId,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    await updateIngestionLog(logId, {
      completedAt: new Date(),
      status: "failed",
      errorMessage,
      itemsFetched: scraper.getStats().propertiesFound,
      itemsUpserted: scraper.getStats().propertiesUpserted,
    });

    console.error("[AtHomeScraper] Job failed:", errorMessage);

    return {
      success: false,
      stats: scraper.getStats(),
      logId,
      error: errorMessage,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AtHomeScraper;
