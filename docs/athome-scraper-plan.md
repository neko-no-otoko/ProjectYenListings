# AtHome Akiya Bank Scraper Plan

## Executive Summary

AtHome Akiya Bank (アットホーム 空き家バンク) is the largest akiya (vacant house) database in Japan with **11,034 listings** across **894 municipalities**. This document outlines a respectful, robust scraping strategy.

---

## 1. Site Architecture Analysis

### 1.1 Base Domain
- **Primary**: `https://www.akiya-athome.jp` (must use www subdomain)
- **Direct access to**: `akiya-athome.jp` fails with DNS error

### 1.2 URL Patterns

#### Prefecture Listings
```
/buy/[PREFECTURE_CODE]/
```
- Example: `/buy/01/` (Hokkaido)
- Example: `/buy/13/` (Tokyo)
- Returns 241 properties for Hokkaido

**Prefecture Codes (Standard JIS X 0401):**
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

#### Municipality Filtering
```
/buy/[PREFECTURE_CODE]/?gyosei_cd[]=[MUNICIPALITY_CODE]&proc_search=
```
- Example: `/buy/01/?gyosei_cd[]=01202&proc_search=` (Hakodate)

#### Property Detail Pages
```
https://[MUNICIPALITY]-[CODE].akiya-athome.jp/bukken/detail/buy/[PROPERTY_ID]
```
- Example: `https://tsukigata-t01430.akiya-athome.jp/bukken/detail/buy/44927`
- Pattern: `[municipality_name]-t[city_code]` or `[municipality_name]-c[city_code]`

#### Search URLs
```
/bukken/search/index/?search_type=area&br_kbn=buy&sbt_kbn=house
```
Parameters:
- `search_type`: `area`, `rail`, `map`
- `br_kbn`: `buy` (purchase), `rent` (rental)
- `sbt_kbn`: `house`, `land`, `mansion`, `invest`, `live`, `business`

#### Thematic Search URLs
```
/bukken/search/list/?freeword=[QUERY]&search_type=freeword&br_kbn=buy&sbt_kbn=house
```

---

## 2. Page Structure Analysis

### 2.1 Listing Page Structure

**HTML Structure:**
```html
<article>
  <h2>北海道の売買物件</h2>
  
  <!-- Municipality Filter -->
  <dl>
    <dt>北海道_その他</dt>
    <dd>
      <a href="/buy/01/?gyosei_cd[]=01202&proc_search=">函館市(1)</a>
    </dd>
  </dl>
  
  <!-- Sort Controls -->
  <select> <!-- 並び順 -->
    <option value="new">新着順</option>
    <option value="price_asc">価格が安い順</option>
    <option value="price_desc">価格が高い順</option>
    <option value="address">住所別</option>
  </select>
  
  <!-- Items Per Page -->
  <select> <!-- 表示件数 -->
    <option>20件</option>
    <option>50件</option>
    <option>100件</option>
  </select>
  
  <!-- Result Count -->
  <span>241件中1～20件を表示</span>
  
  <!-- Property Cards -->
  <div class="property-card">
    <a href="https://[subdomain].akiya-athome.jp/bukken/detail/buy/[ID]">
      No.96
    </a>
    <dl>
      <dt>価格</dt><dd>330万円</dd>
      <dt>間取</dt><dd>6LDK</dd>
      <dt>建物面積</dt><dd>113.4㎡</dd>
      <dt>土地面積</dt><dd>409.53㎡</dd>
      <dt>物件種目</dt><dd>売戸建</dd>
      <dt>築年月</dt><dd>1978年9月</dd>
      <dt>所在地</dt><dd>北海道樺戸郡月形町字赤川</dd>
      <dt>交通</dt><dd>ＪＲ札沼線 北海道医療大学駅...</dd>
    </dl>
  </div>
  
  <!-- Pagination -->
  <div class="pagination">
    <a href="#">1</a>
    <a href="#">2</a>
    <a href="#">次へ ></a>
  </div>
</article>
```

### 2.2 Property Detail Page Structure

**Key Fields Available:**

| Field | Selector Hint | Notes |
|-------|---------------|-------|
| Property ID | URL path | Extract from `/bukken/detail/buy/[ID]` |
| Title | `h1` or nearby text | Usually "No.XX" + description |
| Price | `dt:contains("価格") + dd` | Format: "330万円" or "相談" |
| Layout | `dt:contains("間取") + dd` | Format: "6LDK", "不明" |
| Building Area | `dt:contains("建物面積") + dd` | Format: "113.4㎡", "面積不明" |
| Land Area | `dt:contains("土地面積") + dd` | Format: "409.53㎡" |
| Property Type | `dt:contains("物件種目") + dd` | "売戸建", "売土地" |
| Build Date | `dt:contains("築年月") + dd` | Format: "1978年9月(築47年)" |
| Address | `dt:contains("所在地") + dd` | Full Japanese address |
| Transportation | `dt:contains("交通") + dd` | Train lines and walk time |
| Structure | `dt:contains("建物構造") + dd` | "木造", etc. |
| Floors | `dt:contains("階建") + dd` | "2階建" |
| Parking | `dt:contains("駐車場") + dd` | "空有", "-" |
| Current Status | `dt:contains("現況") + dd` | "空" (vacant) |
| Handover | `dt:contains("引渡し") + dd` | "即時" (immediate) |
| Land Rights | `dt:contains("土地権利") + dd` | |
| Land Use | `dt:contains("用途地域") + dd` | Zoning |
| Building Coverage | `dt:contains("建ぺい率") + dd` | Percentage |
| Floor Area Ratio | `dt:contains("容積率") + dd` | Percentage |
| Land Type | `dt:contains("地目") + dd` | "宅地" |
| Features | `dt:contains("こだわり") + dd` | Tags list |
| Info Date | `dt:contains("情報公開日") + dd` | "2026年2月18日" |
| Next Update | `dt:contains("次回更新予定日") + dd` | "随時" |
| Photos | Image gallery | URLs extractable |
| Surrounding Facilities | Nearby amenities | School, hospital distances |

**Surrounding Facilities Structure:**
```html
<section>
  <h4>周辺施設</h4>
  <ul>
    <li>
      <span>小学校</span>
      <h5>月形小学校</h5>
      <p>550m</p>
    </li>
  </ul>
</section>
```

---

## 3. Anti-Bot Measures Analysis

### 3.1 Detected Measures

| Measure | Status | Details |
|---------|--------|---------|
| robots.txt | ❌ None | No robots.txt file present |
| Rate Limiting | ⚠️ Unknown | Not observed during research |
| CAPTCHA | ❌ None | Not observed |
| Cloudflare | ❌ None | No CF challenges seen |
| Session Cookies | ⚠️ Likely | Standard session management |
| User-Agent Check | ⚠️ Likely | Standard practice |
| IP Blocking | ⚠️ Unknown | Use respectful delays |
| JavaScript Rendering | ⚠️ Partial | Pagination uses JS (#) |

### 3.2 Technical Notes

1. **Pagination is JavaScript-driven**: Links use `href="#"` with click handlers
   - Likely uses AJAX/fetch to load next pages
   - May need to intercept API calls or use headless browser

2. **No robots.txt** means no explicit restrictions, but:
   - Still bound by Terms of Service
   - Copyright notice on every page
   - "無断転載を禁止します" (Unauthorized reproduction prohibited)

3. **Subdomain Structure**:
   - Each municipality has its own subdomain
   - Example: `tsukigata-t01430.akiya-athome.jp`
   - This suggests distributed architecture

---

## 4. Scraper Architecture Plan

### 4.1 Recommended Approach: Hybrid Strategy

Given the JavaScript pagination, a **hybrid approach** is recommended:

```
┌─────────────────────────────────────────────────────────┐
│                    AtHome Scraper                        │
├─────────────────────────────────────────────────────────┤
│  Phase 1: Discovery (HTTP Requests)                     │
│    └── Fetch prefecture pages                           │
│    └── Extract municipality codes                       │
│    └── Build URL index                                  │
│                                                         │
│  Phase 2: Listing Extraction (Headless Browser)         │
│    └── Use Playwright/Puppeteer for JS pagination       │
│    └── Extract all property IDs from listings           │
│                                                         │
│  Phase 3: Detail Extraction (HTTP Requests preferred)   │
│    └── Fetch property detail pages                      │
│    └── Parse with Cheerio/BeautifulSoup                 │
│    └── Fallback to headless if needed                   │
│                                                         │
│  Phase 4: Data Persistence                              │
│    └── Store in database                                │
│    └── Export to JSON/CSV                               │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Respectful Crawling Guidelines

```javascript
const CRAWL_CONFIG = {
  // Delay between requests (milliseconds)
  REQUEST_DELAY: 2000,        // 2 seconds base
  JITTER: 1000,               // ±1 second random jitter
  
  // Concurrent requests
  MAX_CONCURRENT: 2,          // Conservative
  
  // Rate limiting
  REQUESTS_PER_MINUTE: 20,    // ~3 second average
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
  
  // Session management
  SESSION_DURATION: 300000,   // 5 minutes per session
  SESSION_BREAK: 60000,       // 1 minute break between sessions
};
```

### 4.3 Data Models

```typescript
// Property Listing (from search results)
interface PropertyListing {
  id: string;                    // Property ID from URL
  externalId: string;            // Display ID (e.g., "No.96")
  title: string;                 // Property title
  price: {
    value: number | null;        // Numeric value or null if "相談"
    raw: string;                 // Original text
    currency: 'JPY';
  };
  propertyType: 'house' | 'land' | 'mansion' | 'invest';
  listingType: 'buy' | 'rent';
  layout: string | null;         // "6LDK", etc.
  buildingArea: number | null;   // Square meters
  landArea: number | null;       // Square meters
  address: string;
  prefecture: string;
  municipality: string;
  transportation: string;
  buildDate: string | null;      // ISO date or null
  thumbnailUrl: string | null;
  detailUrl: string;
  municipalitySubdomain: string;
  scrapedAt: string;             // ISO timestamp
}

// Property Detail (full information)
interface PropertyDetail extends PropertyListing {
  // Additional fields
  floorCount: number | null;
  structure: string | null;      // "木造", etc.
  parking: string | null;
  currentStatus: string | null;  // "空" = vacant
  handover: string | null;       // "即時" = immediate
  landRights: string | null;
  landUse: string | null;        // Zoning
  buildingCoverage: number | null;  // 建ぺい率
  floorAreaRatio: number | null;    // 容積率
  landType: string | null;
  features: string[];            // Array of feature tags
  remarks: string | null;        // 備考
  publicationDate: string | null;
  nextUpdate: string | null;
  
  // Surrounding facilities
  facilities: {
    type: string;                // "小学校", etc.
    name: string;
    distance: number | null;     // meters
  }[];
  
  // Photos
  photos: {
    url: string;
    caption: string | null;
  }[];
  
  // Contact
  contactInfo: {
    phone: string | null;
    department: string | null;
    inquiryNumber: string | null;
  };
}

// Municipality
interface Municipality {
  code: string;                  // JIS code
  name: string;
  prefectureCode: string;
  prefectureName: string;
  subdomain: string | null;
  listingCount: number;
  hasDedicatedSite: boolean;     // Some have their own subdomain
  siteUrl: string | null;
}
```

### 4.4 Extraction Strategy by Page Type

#### Prefecture Listings Page (`/buy/XX/`)
1. Parse municipality list with counts
2. Extract gyosei_cd values
3. Note which municipalities have dedicated subdomains

#### Search Results (with pagination)
1. **Option A - API Interception** (preferred):
   - Monitor network requests for JSON API
   - Replicate API calls directly
   
2. **Option B - Browser Automation**:
   - Use Playwright to click pagination
   - Extract property cards from DOM
   - Handle 20/50/100 per page options

3. **Option C - Direct URL manipulation**:
   - Investigate if `?page=X` or offset parameters work
   - Check for hidden form data

#### Property Detail Pages
1. Static HTML parsing preferred
2. Extract all `<dt>/<dd>` pairs
3. Parse facility distances
4. Extract image URLs from gallery

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up TypeScript project with Playwright
- [ ] Implement respectful request wrapper with delays
- [ ] Create data models and types
- [ ] Build database schema (PostgreSQL/SQLite)
- [ ] Implement basic HTTP client with retries

### Phase 2: Discovery (Week 1-2)
- [ ] Scrape all prefecture codes
- [ ] Build municipality index
- [ ] Store municipality metadata
- [ ] Validate URL patterns

### Phase 3: Listing Extraction (Week 2-3)
- [ ] Implement pagination handling
- [ ] Extract property IDs from listings
- [ ] Queue property detail URLs
- [ ] Handle rate limiting and errors

### Phase 4: Detail Extraction (Week 3-4)
- [ ] Parse full property details
- [ ] Extract photos and media
- [ ] Parse surrounding facilities
- [ ] Validate and clean data

### Phase 5: Production (Week 4+)
- [ ] Implement incremental updates
- [ ] Add monitoring and alerting
- [ ] Create data export pipelines
- [ ] Document API for app integration

---

## 6. Risk Mitigation

### 6.1 Legal Considerations

1. **Terms of Service**: Review athome.co.jp/help/kiyaku.html
2. **Copyright**: All content © At Home Co.,Ltd. - attribution required
3. **Data Usage**: Personal use/research vs. commercial redistribution

### 6.2 Technical Safeguards

1. **Respect robots.txt**: Even though none exists, be conservative
2. **User-Agent**: Identify scraper with contact info
3. **Rate Limiting**: Never exceed 1 request per second
4. **Caching**: Cache responses to minimize repeat requests
5. **Error Handling**: Graceful degradation on failures

### 6.3 Detection Avoidance (Ethical)

```javascript
const SCRAPER_IDENTITY = {
  userAgent: 'AkiyaResearchBot/1.0 (Research Project; Contact: research@example.com)',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
  }
};
```

---

## 7. API Investigation Notes

### 7.1 Potential API Endpoints to Explore

Based on the JavaScript pagination, there may be internal APIs:

```
# Potential endpoints to test
/api/bukken/search
/api/bukken/list
/ajax/bukken/search
/bukken/search/ajax
```

### 7.2 Form Data Inspection

When filtering by municipality, the form submits:
- `gyosei_cd[]`: Array of municipality codes
- `proc_search`: Empty or search token

### 7.3 Cookie Analysis

Monitor for:
- Session cookies
- CSRF tokens
- Search state cookies

---

## 8. Testing Checklist

- [ ] Verify all 47 prefecture codes work
- [ ] Test municipality filtering
- [ ] Verify pagination extraction
- [ ] Test property detail parsing
- [ ] Validate data completeness
- [ ] Test rate limiting behavior
- [ ] Verify error recovery
- [ ] Test incremental update logic

---

## 9. References

- **Site**: https://www.akiya-athome.jp
- **Terms**: https://www.athome.co.jp/help/kiyaku.html
- **Privacy**: https://www.athome.co.jp/help/pdh/
- **Prefecture Codes**: JIS X 0401 standard

---

*Document Version: 1.0*
*Last Updated: 2026-03-17*
*Author: AI Research Assistant*
