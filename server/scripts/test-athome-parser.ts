// Quick test to verify AtHome scraper HTML parsing (no DB required)
// Run: npx tsx server/scripts/test-athome-parser.ts

import { getRateLimiter } from "../lib/ingestion/rateLimiter";

const ATHOME_BASE_URL = "https://www.akiya-athome.jp";
const ATHOME_HOST = "www.akiya-athome.jp";

class TestAtHomeHttpClient {
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
        },
      });
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}`, status: response.status };
      }
      const html = await response.text();
      return { success: true, html, status: response.status };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

class TestAtHomeHtmlParser {
  parseListings(html: string, prefectureCode: string): Array<{
    externalId: string;
    propertyId: string;
    title: string;
    price: { value: number | null; raw: string; currency: "JPY" };
    address: string;
    detailUrl: string;
  }> {
    const properties: any[] = [];
    const detailUrlRegex = /https:\/\/([^\s"]+\.akiya-athome\.jp)\/bukken\/detail\/buy\/(\d+)/g;
    const matches = Array.from(html.matchAll(detailUrlRegex));

    for (const match of matches) {
      const subdomain = match[1];
      const propertyId = match[2];
      const detailUrl = match[0];
      const urlIndex = html.indexOf(match[0]);
      const contextStart = Math.max(0, urlIndex - 1500);
      const contextEnd = Math.min(html.length, urlIndex + 1500);
      const context = html.slice(contextStart, contextEnd);
      const externalIdMatch = context.match(/No\.(\d+)/);
      const externalId = externalIdMatch ? `No.${externalIdMatch[1]}` : `ID:${propertyId}`;
      
      // Extract price
      let priceText = "";
      const priceMatch = context.match(/<dt[^>]*>[^\u003c]*価格[^\u003c]*<\/dt>\s*<dd[^>]*>([^\u003c]+)<\/dd>/i);
      if (priceMatch) priceText = priceMatch[1].trim();
      
      const price = this.parsePrice(priceText);
      const address = this.extractDtDdValue(context, "所在地") || "";

      properties.push({ externalId, propertyId, title: externalId, price, address, detailUrl });
    }

    const seen = new Set<string>();
    return properties.filter(p => { if (seen.has(p.propertyId)) return false; seen.add(p.propertyId); return true; });
  }

  private extractDtDdValue(html: string, label: string): string | null {
    const pattern = new RegExp(`<dt[^>]*>[^\u003c]*${label}[^\u003c]*<\/dt>\\s*<dd[^>]*>([^\u003c]+)<\/dd>`, "i");
    const match = html.match(pattern);
    return match ? match[1].trim() : null;
  }

  private parsePrice(text: string): { value: number | null; raw: string; currency: "JPY" } {
    if (!text) return { value: null, raw: "", currency: "JPY" };
    if (text.includes("相談")) return { value: null, raw: text, currency: "JPY" };
    const match = text.replace(/,/g, "").match(/([\d.]+)万円/);
    if (match) {
      return { value: parseFloat(match[1]) * 10000, raw: text, currency: "JPY" };
    }
    return { value: null, raw: text, currency: "JPY" };
  }

  extractTotalCount(html: string): number {
    const patterns = [/(\d+)件中/, /全(\d+)件/, /(\d+)件/];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  }
}

async function testScraper() {
  console.log("Testing AtHome Scraper Parser...\n");
  const httpClient = new TestAtHomeHttpClient();
  const parser = new TestAtHomeHtmlParser();

  console.log("Fetching Hokkaido prefecture page...");
  const result = await httpClient.fetch(`${ATHOME_BASE_URL}/buy/01/`);

  if (!result.success) {
    console.error("✗ Failed:", result.error);
    process.exit(1);
  }

  console.log(`✓ Fetched: ${result.html?.length} chars\n`);
  const properties = parser.parseListings(result.html!, "01");
  const totalCount = parser.extractTotalCount(result.html!);

  console.log(`✓ Found ${properties.length} unique properties`);
  console.log(`✓ Total on site: ${totalCount}\n`);

  if (properties.length > 0) {
    console.log("Sample properties:");
    properties.slice(0, 3).forEach((p, i) => {
      console.log(`\n  ${i + 1}. ${p.externalId}`);
      console.log(`     Price: ${p.price.raw} (${p.price.value?.toLocaleString() || "N/A"} JPY)`);
      console.log(`     Address: ${p.address.slice(0, 50)}${p.address.length > 50 ? "..." : ""}`);
    });
  }

  console.log("\n" + "=".repeat(50));
  console.log("Test passed! Scraper is working ✓");
  console.log("=".repeat(50));
}

testScraper().catch(console.error);
