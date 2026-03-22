/**
 * AtHome Scraper Core - Database-free version for testing
 * 
 * This file contains the core scraping logic without database dependencies.
 * Used for standalone testing of the AtHome scraper.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ATHOME_BASE_URL = "https://www.akiya-athome.jp";
const ATHOME_HOST = "www.akiya-athome.jp";

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
  externalId: string;
  propertyId: string;
  title: string;
  price: {
    value: number | null;
    raw: string;
    currency: "JPY";
  };
  propertyType: "house" | "land" | "mansion" | "invest" | "unknown";
  layout: string | null;
  buildingArea: number | null;
  landArea: number | null;
  address: string;
  prefecture: string;
  municipality: string;
  transportation: string;
  buildDate: string | null;
  photoCount: number;
  detailUrl: string;
  municipalitySubdomain: string;
}

export interface ScrapeResult {
  success: boolean;
  properties: ScrapedProperty[];
  totalCount: number;
  pagesScraped: number;
  error?: string;
}

// ============================================================================
// SIMPLE RATE LIMITER
// ============================================================================

class SimpleRateLimiter {
  private lastRequestTime = 0;
  private minDelay = 1000; // 1 second between requests

  async acquire(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

export class AtHomeHttpClient {
  private rateLimiter = new SimpleRateLimiter();
  private userAgent = "AkiyaResearchBot/1.0 (Research Project; Respectful Scraping)";

  async fetch(
    url: string
  ): Promise<{ success: boolean; html?: string; error?: string; status?: number }> {
    try {
      await this.rateLimiter.acquire();

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
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
// HTML PARSER
// ============================================================================

export class AtHomeHtmlParser {
  parseListings(html: string, prefectureCode: string): ScrapedProperty[] {
    const properties: ScrapedProperty[] = [];
    const prefecture = PREFECTURES.find((p) => p.code === prefectureCode);

    // Find all property cards by looking for detail URLs
    const detailUrlRegex =
      /https:\/\/([^\s"]+\.akiya-athome\.jp)\/bukken\/detail\/buy\/(\d+)/g;
    const matches = Array.from(html.matchAll(detailUrlRegex));

    for (const match of matches) {
      const subdomain = match[1];
      const propertyId = match[2];
      const detailUrl = match[0];

      // Find the property card context
      const urlIndex = html.indexOf(match[0]);
      const contextStart = Math.max(0, urlIndex - 1500);
      const contextEnd = Math.min(html.length, urlIndex + 1500);
      const context = html.slice(contextStart, contextEnd);

      const property = this.parsePropertyCard(
        context,
        propertyId,
        detailUrl,
        subdomain,
        prefecture
      );
      if (property) {
        properties.push(property);
      }
    }

    // Deduplicate by propertyId
    const seen = new Set<string>();
    return properties.filter((p) => {
      if (seen.has(p.propertyId)) return false;
      seen.add(p.propertyId);
      return true;
    });
  }

  private parsePropertyCard(
    context: string,
    propertyId: string,
    detailUrl: string,
    subdomain: string,
    prefecture?: { code: string; name: string; nameEn: string }
  ): ScrapedProperty | null {
    // Extract external ID (No.XX)
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

  private extractDtDdValue(html: string, label: string): string | null {
    const patterns = [
      new RegExp(
        `<dt[^\u003e]*>[^<]*${label}[^<]*<\/dt>\\s*<dd[^\u003e]*>([^<]+)<\/dd>`,
        "i"
      ),
      new RegExp(`${label}[：:]\\s*([^<<\n]+)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private parsePrice(text: string | null): ScrapedProperty["price"] {
    if (!text) {
      return { value: null, raw: "", currency: "JPY" };
    }

    if (text.includes("相談")) {
      return { value: null, raw: text, currency: "JPY" };
    }

    const match = text.replace(/,/g, "").match(/([\d.]+)万円/);
    if (match) {
      const man = parseFloat(match[1]);
      return {
        value: man * 10000,
        raw: text,
        currency: "JPY",
      };
    }

    return { value: null, raw: text, currency: "JPY" };
  }

  private parseArea(text: string | null): number | null {
    if (!text) return null;
    if (text.includes("不明")) return null;

    const match = text.replace(/,/g, "").match(/([\d.]+)\s*㎡/);
    return match ? parseFloat(match[1]) : null;
  }

  private parsePropertyType(text: string | null): ScrapedProperty["propertyType"] {
    if (!text) return "unknown";
    if (text.includes("戸建")) return "house";
    if (text.includes("土地")) return "land";
    if (text.includes("マンション")) return "mansion";
    if (text.includes("投資")) return "invest";
    return "unknown";
  }

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

  private extractMunicipality(address: string): string {
    const match = address.match(/([^都道府県]+?[市町村])/);
    return match ? match[1] : address;
  }

  extractTotalCount(html: string): number {
    const specificMatch = html.match(/(\d+)件中\d+～\d+件/);
    if (specificMatch) {
      return parseInt(specificMatch[1], 10);
    }

    const patterns = [/全(\d+)件/, /(\d+)件中/];

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
// MAIN SCRAPER
// ============================================================================

export class AtHomeScraperCore {
  private httpClient = new AtHomeHttpClient();
  private parser = new AtHomeHtmlParser();

  async scrapePrefecture(
    prefectureCode: string,
    maxPages: number = 100
  ): Promise<ScrapeResult> {
    const allProperties: ScrapedProperty[] = [];
    let totalCount = 0;
    let page = 1;

    console.log(`[AtHome] Scraping prefecture ${prefectureCode}...`);

    try {
      while (page <= maxPages) {
        const url =
          page === 1
            ? `${ATHOME_BASE_URL}/buy/${prefectureCode}/`
            : `${ATHOME_BASE_URL}/buy/${prefectureCode}/?page=${page}`;

        console.log(`[AtHome] Fetching page ${page}: ${url}`);

        const result = await this.httpClient.fetch(url);

        if (!result.success || !result.html) {
          return {
            success: false,
            properties: allProperties,
            totalCount,
            pagesScraped: page - 1,
            error: result.error,
          };
        }

        if (page === 1) {
          totalCount = this.parser.extractTotalCount(result.html);
          console.log(`[AtHome] Total properties expected: ${totalCount}`);
        }

        const pageProperties = this.parser.parseListings(result.html, prefectureCode);
        console.log(`[AtHome] Page ${page}: Found ${pageProperties.length} properties`);

        if (pageProperties.length === 0) {
          console.log(`[AtHome] No more properties on page ${page}, stopping.`);
          break;
        }

        allProperties.push(...pageProperties);

        const expectedPages = Math.ceil(totalCount / 20);
        if (page >= expectedPages && totalCount > 0) {
          console.log(`[AtHome] Reached expected last page (${expectedPages}), stopping.`);
          break;
        }

        page++;
      }

      console.log(`[AtHome] Total found: ${allProperties.length} properties`);

      return {
        success: true,
        properties: allProperties,
        totalCount: totalCount || allProperties.length,
        pagesScraped: page - 1,
      };
    } catch (error) {
      return {
        success: false,
        properties: allProperties,
        totalCount,
        pagesScraped: page - 1,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export default AtHomeScraperCore;
