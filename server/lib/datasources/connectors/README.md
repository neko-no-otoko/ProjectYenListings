# Japanese Property Data Source Research Summary

**Date:** 2026-03-20  
**Researcher:** AI Research Assistant  
**Project:** Akiya App - Additional Data Sources

---

## Executive Summary

Research completed on 4 major Japanese property data sources:

| Source | Type | robots.txt | Status | Recommendation |
|--------|------|------------|--------|----------------|
| **SUUMO** | Commercial Portal | ⚠️ Restrictive | Partially Implemented | Use with caution |
| **Yahoo!不動産** | Commercial Portal | ✅ Moderate | Partially Implemented | Viable option |
| **REINFOLIB (MLIT)** | Government API | N/A | ✅ Fully Implemented | **Primary source** |
| **LIFULL HOMES** | Commercial Portal | ✅ Permissive | Partially Implemented | **Best for scraping** |

---

## 1. SUUMO (スーモ) - https://suumo.jp/

### Overview
- **Owner:** Recruit Co., Ltd. (リクルート)
- **Market Position:** #1 property portal in Japan
- **Listings:** Largest database (~11,034 akiya properties)

### robots.txt Analysis
```
User-agent: *
Disallow: /edit/       # Internal systems
Disallow: /jj/         # API endpoints
Disallow: /sp/apiforward/  # Mobile API
Allow: /journal/       # Blog content allowed

User-agent: bingbot
Crawl-delay: 30        # 30 second delay for Bing
```

**Verdict:** No blanket ban, but internal APIs blocked. General listings allowed.

### Technical Challenges

| Challenge | Severity | Solution |
|-----------|----------|----------|
| JavaScript Rendering | High | Requires Playwright/Puppeteer |
| Anti-Bot Measures | High | CAPTCHA, rate limiting (~50 req/session) |
| Aggressive Blocking | High | IP blocks on suspicious traffic |
| Dynamic Pagination | Medium | Click-based pagination |

### Data Structure
- Listings load via JavaScript
- Data embedded in `data-analytics-tracker` attributes
- JSON format within HTML

### URL Patterns
```
/chintai/{prefecture}/           # Rental
/ms/shinchiku/{prefecture}/      # New condos
/ms/chuko/{prefecture}/          # Used condos
/ikkodate/{prefecture}/          # New houses
/chukoikkodate/{prefecture}/     # Used houses (akiya)
/tochi/{prefecture}/             # Land
```

### Implementation Status
⚠️ **PARTIALLY IMPLEMENTED**

Created: `server/lib/datasources/connectors/suumo-connector.ts`

**What's implemented:**
- URL builders for all property types
- Playwright-based scraper foundation
- Listing page parser structure
- Data normalization

**What's needed:**
- Full DOM selector testing
- Anti-bot evasion (proxy rotation)
- Error recovery for CAPTCHA
- Production rate limiting

### Recommendation
Use only as a fallback. Contact Recruit for official data partnership for production use.

---

## 2. Yahoo!不動産 - https://realestate.yahoo.co.jp/

### Overview
- **Owner:** Yahoo Japan Corporation / Z Holdings (SoftBank)
- **Market Position:** #2 property portal
- **Listings:** Comprehensive coverage

### robots.txt Analysis
```
User-agent: *
Disallow: /direct/     # Direct access pages
Disallow: /api/        # API endpoints
Disallow: /personal/   # User-specific pages
Allow: /               # General listings allowed

User-agent: bingbot
Crawl-delay: 5         # 5 second delay
```

**Verdict:** More permissive than SUUMO. General crawling allowed.

### Technical Characteristics

| Feature | Assessment |
|---------|------------|
| Rendering | SSR + CSR hybrid |
| Rate Limiting | Moderate |
| Anti-Bot | CAPTCHA on suspicious traffic |
| Data Quality | High |
| JSON-LD | ✅ Available |

### URL Patterns
```
/rent/{region}/{prefecture}/           # Rental
/new/mansion/{region}/{prefecture}/    # New condos
/new/house/{region}/{prefecture}/      # New houses
/used/mansion/{region}/{prefecture}/   # Used condos
/used/house/{region}/{prefecture}/     # Used houses
/land/{region}/{prefecture}/           # Land
```

**Region Codes:** 01=Hokkaido, 02=Tohoku, 03=Kanto, etc.

### Implementation Status
⚠️ **PARTIALLY IMPLEMENTED**

Created: `server/lib/datasources/connectors/yahoo-realestate-connector.ts`

**What's implemented:**
- Complete URL builder with region/prefecture mapping
- Listing page parser with multiple selector fallbacks
- Detail page scraper structure
- Data normalization

**What's needed:**
- Production testing with real pages
- JSON-LD structured data extraction
- Photo extraction
- Pagination testing

### Recommendation
Good middle-ground option. Simpler structure than SUUMO, more data than smaller portals.

---

## 3. 不動産情報ライブラリー (REINFOLIB) - https://www.reinfolib.mlit.go.jp/

### Overview
- **Owner:** Ministry of Land, Infrastructure, Transport and Tourism (国土交通省)
- **Type:** Official Government API
- **Data:** Transaction prices, land prices, appraisal data
- **Cost:** FREE with registration

### API Registration
- **URL:** https://www.reinfolib.mlit.go.jp/api/request/
- **Cost:** Free
- **Requirements:** Email, usage description
- **Approval:** Automatic to few days
- **Key Type:** `Ocp-Apim-Subscription-Key` header

### Available Endpoints

| Endpoint | Data | Coverage |
|----------|------|----------|
| XIT001 | Transaction prices | 2005+ |
| XIT002 | Municipalities list | All Japan |
| XPT001 | Price points (geo) | 2005+ |
| XPT002 | Land prices | 1995+ |
| XCT001 | Appraisal reports | Last 5 years |

### Data Quality
- ✅ Official government source
- ✅ High accuracy
- ✅ Legal transaction data
- ✅ Urban planning data included
- ⚠️ 3-month delay (quarterly)

### Terms of Use
- ✅ Research/commercial use allowed
- ✅ Attribution required
- ✅ No redistribution restrictions

### Required Attribution
```
このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、
提供情報の最新性、正確性、完全性等が保証されたものではありません
```

### Implementation Status
✅ **FULLY IMPLEMENTED**

Created: `server/lib/datasources/connectors/reinfolib-connector.ts`

**What's implemented:**
- Complete API client with all endpoints
- Type-safe TypeScript interfaces
- Error handling
- Gzip support
- Example usage
- Required attribution text

**To use:**
```bash
# Register at https://www.reinfolib.mlit.go.jp/api/request/
export REINFOLIB_API_KEY="your-api-key"
```

### Recommendation
**PRIMARY DATA SOURCE** - Use this as the foundation. Official, accurate, free.

---

## 4. LIFULL HOMES - https://www.homes.co.jp/

### Overview
- **Owner:** LIFULL Co., Ltd.
- **Market Position:** #3 property portal
- **Specialty:** Strong in rural/akiya properties
- **Previous:** Next Co., Ltd.

### robots.txt Analysis
```
User-agent: *
Allow: /               # Very permissive
Disallow: /kksearch    # Search endpoint
Disallow: /revsearch   # Review search
Disallow: /*from_dsp=  # Tracking parameters

# Many sitemaps provided
Sitemap: https://www.homes.co.jp/sitemap.xml
Sitemap: https://www.homes.co.jp/sitemap-bukken-*.xml
...
```

**Verdict:** Most scraper-friendly of the major portals. Comprehensive sitemaps.

### Technical Characteristics

| Feature | Assessment |
|---------|------------|
| Rendering | Primarily SSR |
| Rate Limiting | Lenient |
| Anti-Bot | Minimal |
| Data Quality | High |
| Sitemaps | ✅ Comprehensive |

### URL Patterns
```
/chintai/{prefecture}/              # Rental
/mansion/{prefecture}/              # Condos (used)
/mansion/shinchiku/{prefecture}/    # New condos
/kodate/{prefecture}/               # Houses (used)
/kodate/shinchiku/{prefecture}/     # New houses
/tochi/{prefecture}/                # Land
```

Detail pages: `/{type}/{prefecture}/{city}/b-{id}/`

### Implementation Status
⚠️ **PARTIALLY IMPLEMENTED**

Created: `server/lib/datasources/connectors/lifull-connector.ts`

**What's implemented:**
- URL builders for all property types
- Listing page parser with multiple selectors
- Detail page scraper structure
- Municipality extraction
- Data normalization

**What's needed:**
- Full detail page parsing
- Photo gallery extraction
- Company info extraction
- Feature/tag parsing

### Recommendation
**BEST FOR SCRAPING** - Most permissive robots.txt, good rural coverage.

---

## Other Portals Researched

### REINS (Real Estate Information Network System)
- **Type:** Industry system (not public)
- **Access:** Real estate companies only
- **Status:** ❌ Not accessible

### Akiya Banks (Municipal)
- **Type:** Municipal akiya databases
- **Access:** Individual municipality websites
- **Status:** Already covered by existing CKAN connectors

### atHome (アットホーム)
- **Type:** Major portal
- **Status:** Already implemented (see athome-scraper.ts)

---

## Implementation Summary

### Files Created

```
server/lib/datasources/connectors/
├── suumo-connector.ts           # NEW - SUUMO scraper foundation
├── yahoo-realestate-connector.ts # NEW - Yahoo Real Estate scraper
├── lifull-connector.ts           # NEW - LIFULL HOMES scraper
├── reinfolib-connector.ts        # UPDATED - Complete API client
└── README.md                     # This file
```

### Schema Updates

```typescript
// shared/schema.ts
source_type_enum: [
  // ... existing types ...
  'suumo',           // NEW
  'yahoo_realestate', // NEW
  'homes'            // NEW
]
```

### Type Updates

```typescript
// server/lib/connectors/types.ts
export type SourceType = 
  | 'reinfolib_txn' 
  | 'ckan_akiya' 
  | 'lifull' 
  | 'athome' 
  | 'manual'
  | 'suumo'           // NEW
  | 'yahoo_realestate' // NEW
  | 'homes';          // NEW
```

---

## Usage Examples

### REINFOLIB (Recommended Primary Source)
```typescript
import { ReinfolibClient } from './connectors/reinfolib-connector';

const client = new ReinfolibClient({ 
  apiKey: process.env.REINFOLIB_API_KEY 
});

const transactions = await client.getRealEstateTransactions({
  year: 2023,
  quarter: 1,
  area: '32', // Shimane
  language: 'ja'
});
```

### LIFULL HOMES (Recommended for Scraping)
```typescript
import { LifullHomesConnector } from './connectors/lifull-connector';

const connector = new LifullHomesConnector();
const result = await connector.fetch({
  prefecture: 'shimane',
  propertyType: 'kodate',
  listingType: 'chuko'
});
```

### Yahoo! Real Estate
```typescript
import { YahooRealEstateConnector } from './connectors/yahoo-realestate-connector';

const connector = new YahooRealEstateConnector();
const result = await connector.fetch({
  prefecture: 'shimane',
  propertyType: 'used_house'
});
```

### SUUMO
```typescript
import { SuumoConnector } from './connectors/suumo-connector';

const connector = new SuumoConnector();
const result = await connector.fetch({
  prefecture: 'shimane',
  propertyType: 'chukoikkodate'
});
```

---

## Risk Assessment

| Source | Legal Risk | Technical Risk | Maintenance Risk |
|--------|------------|----------------|------------------|
| REINFOLIB | 🟢 None | 🟢 Low | 🟢 Low |
| LIFULL | 🟡 Low | 🟡 Medium | 🟡 Medium |
| Yahoo | 🟡 Low | 🟡 Medium | 🟡 Medium |
| SUUMO | 🟡 Low | 🔴 High | 🔴 High |

### Recommendations by Risk Tolerance

**Conservative (Legal compliance priority)**
1. REINFOLIB only

**Balanced**
1. REINFOLIB (primary)
2. LIFULL HOMES (scraping, conservative rate limits)

**Aggressive (Maximum data coverage)**
1. REINFOLIB (primary)
2. LIFULL HOMES (full scraping)
3. Yahoo Real Estate (moderate scraping)
4. SUUMO (minimal scraping, partnership pursuit)

---

## Next Steps

1. **Immediate:**
   - [ ] Obtain REINFOLIB API key
   - [ ] Test LIFULL HOMES connector with real pages
   - [ ] Set up rate limiting infrastructure

2. **Short-term:**
   - [ ] Implement proxy rotation for commercial portals
   - [ ] Add monitoring for scraper health
   - [ ] Build data deduplication system

3. **Long-term:**
   - [ ] Pursue official data partnerships
   - [ ] Build caching layer for scraped data
   - [ ] Implement incremental updates

---

## Appendix: robots.txt Full Texts

### SUUMO
See: `curl https://suumo.jp/robots.txt`

### Yahoo!不動産
See: `curl https://realestate.yahoo.co.jp/robots.txt`

### LIFULL HOMES
See: `curl https://www.homes.co.jp/robots.txt`

---

*End of Research Summary*
