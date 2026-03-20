/**
 * Completely standalone test for AtHome scraper pagination
 * Tests fetching all pages from Hokkaido without any database dependencies
 */

import { getRateLimiter } from "../lib/ingestion/rateLimiter";

const ATHOME_BASE_URL = "https://www.akiya-athome.jp";
const ATHOME_HOST = "www.akiya-athome.jp";

// Prefecture data
const PREFECTURES = [
  { code: "01", name: "北海道", nameEn: "Hokkaido" },
  { code: "02", name: "青森", nameEn: "Aomori" },
];

// HTTP Client
class TestHttpClient {
  private rateLimiter = getRateLimiter(ATHOME_HOST, 60);
  private userAgent = "AkiyaResearchBot/1.0 (Research Project; Respectful Scraping)";

  async fetch(url: string): Promise<{ success: boolean; html?: string; error?: string; status?: number }> {
    try {
      await this.rateLimiter.acquire();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
          "DNT": "1",
        },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}`, status: response.status };
      }

      const html = await response.text();
      return { success: true, html, status: response.status };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

// HTML Parser
class TestHtmlParser {
  parseListings(html: string, prefectureCode: string): any[] {
    const properties: any[] = [];
    const prefecture = PREFECTURES.find(p => p.code === prefectureCode);

    // Find all property cards by looking for detail URLs
    const detailUrlRegex = /https:\/\/([^\s"]+\.akiya-athome\.jp)\/bukken\/detail\/buy\/(\d+)/g;
    const matches = Array.from(html.matchAll(detailUrlRegex));

    for (const match of matches) {
      const subdomain = match[1];
      const propertyId = match[2];
      const detailUrl = match[0];

      // Extract property details from surrounding HTML context
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

  private parsePropertyCard(
    context: string,
    propertyId: string,
    detailUrl: string,
    subdomain: string,
    prefecture?: { code: string; name: string; nameEn: string }
  ): any | null {
    const externalIdMatch = context.match(/No\.(\d+)/);
    const externalId = externalIdMatch ? `No.${externalIdMatch[1]}` : `ID:${propertyId}`;

    const priceText = this.extractDtDdValue(context, "価格");
    const price = this.parsePrice(priceText);
    const layout = this.extractDtDdValue(context, "間取") || null;
    const buildingAreaText = this.extractDtDdValue(context, "建物面積");
    const buildingArea = this.parseArea(buildingAreaText);
    const landAreaText = this.extractDtDdValue(context, "土地面積");
    const landArea = this.parseArea(landAreaText);
    const address = this.extractDtDdValue(context, "所在地") || "";
    const typeText = this.extractDtDdValue(context, "物件種目");
    const propertyType = this.parsePropertyType(typeText);
    const transportation = this.extractDtDdValue(context, "交通") || "";
    const buildDateText = this.extractDtDdValue(context, "築年月");
    const buildDate = this.parseBuildDate(buildDateText);
    const photoMatch = context.match(/写真\s*(\d+)枚/);
    const photoCount = photoMatch ? parseInt(photoMatch[1], 10) : 0;
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
      new RegExp(`<dt[^\u003e]*>[^\u003c]*${label}[^\u003c]*<\/dt>\\s*<dd[^\u003e]*>([^\u003c]+)<\/dd>`, "i"),
      new RegExp(`${label}[：:]\\s*([^\u003c\\n]+)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  private parsePrice(text: string | null): any {
    if (!text) return { value: null, raw: "", currency: "JPY" };
    if (text.includes("相談")) return { value: null, raw: text, currency: "JPY" };
    const match = text.replace(/,/g, "").match(/([\d.]+)万円/);
    if (match) {
      const man = parseFloat(match[1]);
      return { value: man * 10000, raw: text, currency: "JPY" };
    }
    return { value: null, raw: text, currency: "JPY" };
  }

  private parseArea(text: string | null): number | null {
    if (!text) return null;
    if (text.includes("不明")) return null;
    const match = text.replace(/,/g, "").match(/([\d.]+)\\s*㎡/);
    return match ? parseFloat(match[1]) : null;
  }

  private parsePropertyType(text: string | null): string {
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
    // Look for specific pattern: "X件中Y～Z件を表示" - X is the total
    const specificMatch = html.match(/(\d+)件中\d+～\d+件/);
    if (specificMatch) {
      return parseInt(specificMatch[1], 10);
    }

    // Fallback patterns
    const patterns = [
      /全(\d+)件/,
      /(\d+)件中/,
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

// Main test function
async function testPagination() {
  console.log("=== Testing AtHome Scraper Pagination (Hokkaido) ===\n");

  const httpClient = new TestHttpClient();
  const parser = new TestHtmlParser();
  const allProperties: any[] = [];
  let totalCount = 0;
  let page = 1;

  const prefectureCode = "01"; // Hokkaido

  console.log(`[Test] Scraping prefecture ${prefectureCode}...`);

  while (true) {
    const url = page === 1
      ? `${ATHOME_BASE_URL}/buy/${prefectureCode}/`
      : `${ATHOME_BASE_URL}/buy/${prefectureCode}/?page=${page}`;

    console.log(`[Test] Fetching page ${page}: ${url}`);

    const result = await httpClient.fetch(url);

    if (!result.success || !result.html) {
      console.error(`[Test] Error on page ${page}: ${result.error}`);
      break;
    }

    if (page === 1) {
      totalCount = parser.extractTotalCount(result.html);
      console.log(`[Test] Total properties expected: ${totalCount}`);
    }

    const pageProperties = parser.parseListings(result.html, prefectureCode);
    console.log(`[Test] Page ${page}: Found ${pageProperties.length} properties`);

    if (pageProperties.length === 0) {
      console.log(`[Test] No more properties on page ${page}, stopping.`);
      break;
    }

    allProperties.push(...pageProperties);

    const expectedPages = Math.ceil(totalCount / 20);
    if (page >= expectedPages && totalCount > 0) {
      console.log(`[Test] Reached expected last page (${expectedPages}), stopping.`);
      break;
    }

    if (page >= 100) {
      console.log(`[Test] Safety limit reached (100 pages), stopping.`);
      break;
    }

    page++;
  }

  console.log("\n=== Results ===");
  console.log(`Total properties fetched: ${allProperties.length}`);
  console.log(`Total count reported by site: ${totalCount}`);

  if (allProperties.length > 20) {
    console.log("\n✅ SUCCESS: Pagination is working! Got more than 20 properties.");
  } else {
    console.log("\n⚠️ WARNING: Only got 20 or fewer properties. Pagination may not be working.");
  }

  console.log("\n=== Sample Property IDs (first 5) ===");
  allProperties.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.externalId} - ${p.municipality} - ${p.price.raw || "相談"}`);
  });

  if (allProperties.length > 10) {
    console.log("\n=== Sample Property IDs (last 5) ===");
    allProperties.slice(-5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.externalId} - ${p.municipality} - ${p.price.raw || "相談"}`);
    });
  }

  return allProperties.length;
}

// Run the test
testPagination()
  .then((count) => {
    console.log(`\n✅ Test completed. Total properties: ${count}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test failed:", err);
    process.exit(1);
  });
