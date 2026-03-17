# Akiya Data Sources - Implementation Guide

## Overview

This document provides guidance on integrating various data sources for akiya (vacant house) listings in Japan.

---

## Currently Implemented Sources

### 1. BODIK CKAN (政府オープンデータ)
**Status:** ✅ Fully Implemented  
**Type:** Government Open Data Portal  
**URL:** https://data.bodik.jp/api/3/action  
**Coverage:** Municipal data from various prefectures

**Features:**
- Multi-keyword search (空き家, 空き家バンク, 住宅一覧)
- CSV, XLSX, JSON resource support
- Automatic Japanese era year conversion (昭和/平成/令和 → Gregorian)
- Unit normalization (坪 → m²)
- Price normalization (万円 → integer JPY)

**Configuration:**
```python
BODIK_API_BASE = "https://data.bodik.jp/api/3/action"
SEARCH_KEYWORDS = ["空き家", "空き家バンク", "住宅一覧"]
```

**Implementation:** `scripts/bodik_ingestion.py`

---

### 2. CKAN Search Japan (search.ckan.jp)
**Status:** ✅ Fully Implemented  
**Type:** CKAN Data Portal Aggregator  
**URL:** https://search.ckan.jp/backend/api

**Features:**
- Dataset discovery across multiple CKAN instances
- Automatic resource ingestion
- Schema detection and field mapping
- SHA256-based change detection

**Configuration:**
```typescript
CKAN_SEARCH_BASE_URL = "https://search.ckan.jp/backend/api"
```

**Implementation:** `server/lib/connectors/ckan/`

---

### 3. REINFOLIB (MLIT - 国土交通省)
**Status:** ⚠️ Needs API Key  
**Type:** Government Real Estate Transaction API  
**URL:** https://www.reinfolib.mlit.go.jp/ex-api/external

**Features:**
- Land transaction data
- Price trends by area
- Historical transaction records

**Configuration:**
```env
REINFOLIB_API_KEY=your_api_key_here
REINFOLIB_BASE_URL=https://www.reinfolib.mlit.go.jp/ex-api/external
```

**Implementation:** `server/lib/connectors/reinfolib/`

---

### 4. LIFULL HOMES Partner API
**Status:** ⚠️ Stubbed (Needs OAuth Credentials)  
**Type:** Commercial Real Estate Feed  
**URL:** https://api.homes.co.jp/v1

**Features:**
- OAuth 2.0 authentication
- Property search by prefecture
- Detailed property information

**Configuration:**
```env
LIFULL_ENABLED=true
LIFULL_CLIENT_ID=your_client_id
LIFULL_CLIENT_SECRET=your_client_secret
LIFULL_TOKEN_URL=https://api.homes.co.jp/oauth/token
LIFULL_API_BASE=https://api.homes.co.jp/v1
```

**Implementation:** `server/lib/connectors/partners/lifull/`

---

### 5. AtHome Partner Feed
**Status:** ⚠️ Stubbed (Needs Feed URL)  
**Type:** XML/CSV Feed  
**URL:** Configurable

**Features:**
- CSV or JSON feed format
- HTTP or S3 feed sources

**Configuration:**
```env
ATHOME_ENABLED=true
ATHOME_FEED_URL=https://example.com/feed.json
ATHOME_FEED_FORMAT=json
```

**Implementation:** `server/lib/connectors/partners/athome/`

---

## Recommended Additional Sources

### 1. Municipal Akiya Banks Direct
Many municipalities maintain their own akiya bank websites. Consider scraping or API integration:

| Municipality | URL Pattern | Notes |
|--------------|-------------|-------|
| Taketa, Oita | City website | Popular akiya destination |
| Kamikawa, Hokkaido | City website | Rural properties |
| Nagano Prefecture | Prefecture site | Mountain properties |

**Implementation Approach:**
```typescript
// Create a new connector in server/lib/connectors/municipal/
export class MunicipalConnector implements Connector {
  readonly name = "municipal-taketa";
  readonly sourceType = "municipal" as const;
  
  async fetchListings(): Promise<FetchResult<unknown>> {
    // Implement scraping or API calls
  }
}
```

---

### 2. Suumo (スーモ)
**Status:** Not Implemented (requires partnership)  
**Type:** Major Real Estate Portal  
**URL:** https://suumo.jp

**Notes:**
- Requires business partnership for API access
- Has akiya-specific search filters
- Large inventory of properties

**Contact:** Recruit Sumai Company Ltd. (API partnership team)

---

### 3. Japan Post Address API
**Status:** Not Implemented  
**Type:** Address Validation/Geocoding  
**URL:** https://www.post.japanpost.jp/zipcode/dl/utf_zip.html

**Use Case:**
- Address normalization
- Prefecture/municipality extraction
- Postal code validation

**Implementation:**
```typescript
// Address normalization utility
export function normalizeAddress(address: string): {
  prefecture: string;
  municipality: string;
  street: string;
  postalCode?: string;
} {
  // Implement parsing logic
}
```

---

### 4. Google Maps Geocoding API
**Status:** Not Implemented  
**Type:** Geocoding Service  
**URL:** https://developers.google.com/maps/documentation/geocoding

**Use Case:**
- Convert addresses to lat/lon coordinates
- Validate location data
- Calculate distances to airports/amenities

**Configuration:**
```env
GOOGLE_MAPS_API_KEY=your_api_key
```

---

## Data Source Integration Checklist

When adding a new data source:

- [ ] Create connector in `server/lib/connectors/`
- [ ] Implement `Connector` interface
- [ ] Add configuration environment variables
- [ ] Create mapper for data normalization
- [ ] Add field patterns to `AKIYA_FIELD_PATTERNS` if needed
- [ ] Register connector in `server/index.ts`
- [ ] Add job to scheduler if periodic sync needed
- [ ] Document API limits and rate limiting
- [ ] Add tests for connector

---

## Field Mapping Reference

Standardized fields for akiya listings:

| Field | Japanese Examples | Type |
|-------|-------------------|------|
| address | 住所, 所在地, 物件所在地 | string |
| price | 価格, 売価, 販売価格, 希望価格 | number (JPY) |
| ldk | 間取り, 間取, LDK | string |
| landArea | 土地面積, 敷地面積 | number (m²) |
| buildingArea | 延床面積, 建物面積 | number (m²) |
| yearBuilt | 建築年, 築年 | number (Gregorian) |
| url | URL, リンク, 詳細URL | string |
| title | 物件名, 名称 | string |
| description | 備考, 説明, 概要 | string |
| prefecture | 都道府県 | string |
| municipality | 市区町村 | string |

---

## Rate Limiting Guidelines

| Source | Rate Limit | Notes |
|--------|------------|-------|
| BODIK CKAN | 60 req/min | Be respectful, cache results |
| REINFOLIB | 100 req/day | Check official documentation |
| CKAN Search | 60 req/min | Uses generic rate limiter |
| Partner APIs | Varies | Check partner documentation |

---

## Data Quality Considerations

1. **Deduplication:** Always use `resolvePropertyEntity()` to handle duplicates
2. **Validation:** Use Zod schemas for runtime validation
3. **Translation:** Queue Japanese text for translation via translate jobs
4. **Geocoding:** Normalize coordinates to 5 decimal places
5. **Price:** Store as integer JPY, convert from 万円 format

---

## Testing New Sources

```bash
# Test a connector manually
npm run dev

# In another terminal, test the endpoint
curl http://localhost:5000/api/admin/run/ckan-discovery

# Check logs for results
curl http://localhost:5000/api/admin/logs?connector=ckan-discovery
```

---

## Maintenance

- Monitor ingestion logs regularly
- Set up alerts for failed jobs
- Review data quality metrics
- Update field mappings as sources change
- Rotate API keys periodically
