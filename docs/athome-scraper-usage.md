# AtHome Scraper Usage Guide

## Overview

The AtHome scraper fetches property listings from [AtHome Akiya Bank](https://www.akiya-athome.jp) (アットホーム 空き家バンク), Japan's largest vacant house database with approximately **11,034 listings** across **894 municipalities**.

## Features

- **Respectful scraping**: Rate limited to 1 request per second (60 req/min)
- **Data persistence**: Stores properties in PostgreSQL via Drizzle ORM
- **Raw capture**: Captures HTML for debugging/auditing
- **Deduplication**: Prevents duplicate entries using source keys
- **Incremental updates**: Updates existing properties on re-scrape
- **Error handling**: Graceful handling of network errors with detailed logging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AtHome Scraper                           │
├─────────────────────────────────────────────────────────────┤
│  AtHomeScraper                                              │
│    ├── AtHomeHttpClient (rate-limited fetch)               │
│    └── AtHomeHtmlParser (HTML extraction)                   │
│                                                             │
│  Database Storage                                           │
│    ├── raw_captures (audit trail)                          │
│    ├── property_entities (canonical properties)            │
│    └── listing_variants (AtHome-specific data)             │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Description |
|------|-------------|
| `server/lib/scrapers/athome-scraper.ts` | Main scraper implementation |
| `server/scripts/run-athome-scrape.ts` | CLI script to run scrapes |
| `docs/athome-scraper-usage.md` | This documentation |

## Quick Start

### 1. Prerequisites

Ensure your environment has:
- PostgreSQL database running
- `DATABASE_URL` environment variable set
- Node.js dependencies installed

### 2. Run a Test Scrape (Hokkaido)

Scrape a single prefecture as proof of concept:

```bash
cd /Users/openclaw/.openclaw/workspace/akiya-app
DATABASE_URL=postgresql://user:pass@localhost/dbname \
  npx tsx server/scripts/run-athome-scrape.ts --prefecture 01
```

Expected output:
```
Scraping prefecture: 01 - Hokkaido (北海道)
Starting AtHome scraper...
Rate limit: 1 request per second

[AtHome] Scraping prefecture 01...
[AtHome] Found 241 properties (total: 241)

==================================================
SCRAPING STATISTICS
==================================================
Prefectures scanned: 1
Properties found:    241
Properties inserted: 241
Properties updated:  0
==================================================

✓ Scrape completed successfully!
```

### 3. Scrape All Prefectures

To scrape all 47 prefectures:

```bash
DATABASE_URL=postgresql://user:pass@localhost/dbname \
  npx tsx server/scripts/run-athome-scrape.ts --all
```

### 4. Limit Scope (for testing)

Scrape only first 3 prefectures:

```bash
DATABASE_URL=postgresql://user:pass@localhost/dbname \
  npx tsx server/scripts/run-athome-scrape.ts --all --limit 3
```

## Command Line Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--prefecture` | `-p` | Scrape specific prefecture | `-p 01` |
| `--all` | `-a` | Scrape all prefectures | `-a` |
| `--limit` | `-l` | Limit prefecture count | `-l 5` |
| `--help` | `-h` | Show help | `-h` |

## Prefecture Codes

| Code | Prefecture | Code | Prefecture |
|------|------------|------|------------|
| 01 | Hokkaido | 25 | Shiga |
| 02 | Aomori | 26 | Kyoto |
| 03 | Iwate | 27 | Osaka |
| 04 | Miyagi | 28 | Hyogo |
| 05 | Akita | 29 | Nara |
| 06 | Yamagata | 30 | Wakayama |
| 07 | Fukushima | 31 | Tottori |
| 08 | Ibaraki | 32 | Shimane |
| 09 | Tochigi | 33 | Okayama |
| 10 | Gunma | 34 | Hiroshima |
| 11 | Saitama | 35 | Yamaguchi |
| 12 | Chiba | 36 | Tokushima |
| 13 | Tokyo | 37 | Kagawa |
| 14 | Kanagawa | 38 | Ehime |
| 15 | Niigata | 39 | Kochi |
| 16 | Toyama | 40 | Fukuoka |
| 17 | Ishikawa | 41 | Saga |
| 18 | Fukui | 42 | Nagasaki |
| 19 | Yamanashi | 43 | Kumamoto |
| 20 | Nagano | 44 | Oita |
| 21 | Gifu | 45 | Miyazaki |
| 22 | Shizuoka | 46 | Kagoshima |
| 23 | Aichi | 47 | Okinawa |
| 24 | Mie | | |

## Data Model

### ScrapedProperty

```typescript
interface ScrapedProperty {
  externalId: string;      // Display ID (e.g., "No.96")
  propertyId: string;      // Internal property ID from URL
  title: string;
  price: {
    value: number | null;  // Price in JPY (null if "相談")
    raw: string;           // Original price text
    currency: "JPY";
  };
  propertyType: "house" | "land" | "mansion" | "invest" | "unknown";
  layout: string | null;   // "6LDK", "3LDK", etc.
  buildingArea: number | null;  // Square meters
  landArea: number | null;      // Square meters
  address: string;
  prefecture: string;
  municipality: string;
  transportation: string;
  buildDate: string | null;     // ISO date (YYYY-MM-DD)
  photoCount: number;
  detailUrl: string;
  municipalitySubdomain: string;
}
```

### Database Schema

Properties are stored in three tables:

1. **raw_captures** - Audit trail of scraped HTML
2. **property_entities** - Canonical property records (address, location)
3. **listing_variants** - AtHome-specific data (price, layout, etc.)

## Programmatic Usage

### Basic Usage

```typescript
import { AtHomeScraper, runAtHomeScrapeJob } from "./server/lib/scrapers/athome-scraper";

// Method 1: Using the job runner (recommended)
const result = await runAtHomeScrapeJob({
  specificPrefectures: ["01", "02"],  // Hokkaido and Aomori
});

console.log(`Found ${result.stats.propertiesFound} properties`);
```

### Advanced Usage

```typescript
import { AtHomeScraper } from "./server/lib/scrapers/athome-scraper";

// Method 2: Direct scraper control
const scraper = new AtHomeScraper();

// Scrape single prefecture
const result = await scraper.scrapePrefecture("01");

if (result.success) {
  for (const property of result.properties) {
    console.log(`${property.externalId}: ${property.price.raw} - ${property.address}`);
  }
}

// Get stats
const stats = scraper.getStats();
console.log(`Total properties: ${stats.propertiesFound}`);
```

### Scrape All Prefectures

```typescript
const scraper = new AtHomeScraper();

const stats = await scraper.scrapeAllPrefectures({
  maxPrefectures: 5,  // Optional: limit to first 5
});

console.log(`Scanned ${stats.prefecturesScanned} prefectures`);
console.log(`Found ${stats.propertiesFound} properties`);
```

## Rate Limiting

The scraper respects a rate limit of **1 request per second** (60 requests per minute):

```typescript
const ATHOME_HOST = "www.akiya-athome.jp";
const rateLimiter = getRateLimiter(ATHOME_HOST, 60); // 60 req/min
await rateLimiter.acquire();
```

This is implemented using a token bucket algorithm that:
- Refills 1 token per second
- Allows bursts up to 60 requests
- Automatically waits when rate limited

## Error Handling

The scraper handles various error scenarios:

| Error Type | Behavior |
|------------|----------|
| HTTP errors | Logged, continues to next prefecture |
| Network timeouts | Logged, continues to next prefecture |
| Parse errors | Logged, skips property |
| Database errors | Throws, stops job |

Error logs are stored in the `ingestion_logs` table.

## Monitoring

Check ingestion logs:

```sql
SELECT 
  connector_name,
  job_type,
  status,
  items_fetched,
  items_upserted,
  started_at,
  completed_at
FROM ingestion_logs
WHERE connector_name = 'athome_scraper'
ORDER BY started_at DESC
LIMIT 10;
```

## Future Enhancements

Potential improvements for the scraper:

1. **Pagination Support** - AtHome uses JavaScript pagination; currently only scrapes first page per prefecture
2. **Detail Page Scraping** - Fetch individual property pages for more details
3. **Photo Download** - Download property photos
4. **Municipality Filtering** - Scrape specific municipalities within prefectures
5. **Incremental Updates** - Only fetch changed properties since last run
6. **Proxy Support** - Rotate IPs for large-scale scraping
7. **Playwright Integration** - Use headless browser for JavaScript-heavy pages

## Troubleshooting

### "DATABASE_URL is required"

Set the environment variable:
```bash
export DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### "Invalid prefecture code"

Use codes 01-47. See Prefecture Codes table above.

### Rate limiting errors

The scraper automatically handles rate limiting. If you see 429 errors:
- Wait a few minutes before retrying
- Check if other processes are hitting the same endpoint

### Empty results

If a prefecture returns 0 properties:
1. Check that the prefecture code is valid
2. Verify the site is accessible: `curl https://www.akiya-athome.jp/buy/01/`
3. Check if the site structure has changed

## Legal & Ethical Notes

- **Rate Limiting**: Always respect the 1 req/sec limit
- **Terms of Service**: Review https://www.athome.co.jp/help/kiyaku.html
- **Copyright**: Content is © At Home Co.,Ltd. - use for research only
- **No robots.txt**: While none exists, be conservative and respectful

## See Also

- [AtHome Scraper Plan](../docs/athome-scraper-plan.md) - Original planning document
- [Data Sources Guide](../DATA_SOURCES_GUIDE.md) - Overview of all data sources
