# CKAN Search Japan Research Report

## Overview

**CKAN Search Japan** (データカタログ横断検索システム) is a meta-search portal that aggregates datasets from multiple CKAN instances across Japan. It provides a unified search interface for open data from various municipalities and organizations.

- **Portal URL**: https://search.ckan.jp
- **API Base URL**: https://search.ckan.jp/backend/api/
- **Total Datasets**: ~228,005+ datasets indexed
- **Sites Covered**: 40+ CKAN portals

---

## API Endpoints

### Core Search API
```
GET https://search.ckan.jp/backend/api/package_search
```

**Parameters:**
- `q` - Search query (supports Japanese text)
- `rows` - Number of results per page (default: 10)
- `start` - Offset for pagination
- `sort` - Sort order (e.g., "score desc")
- `fq` - Filter queries

### Example Queries

#### Search for Akiya (Vacant Houses)
```
https://search.ckan.jp/backend/api/package_search?q=%E7%A9%BA%E3%81%8D%E5%AE%B6&rows=20
```
**Result**: 47 datasets found

#### Search for Houses/Buildings
```
https://search.ckan.jp/backend/api/package_search?q=%E5%AE%B6%E5%B1%8B&rows=20
```
**Result**: 221 datasets found

---

## Key Data Sources (Sites)

| Site Name | Datasets | Focus |
|-----------|----------|-------|
| BODIK ODCS | 92 | Municipal data (Fukuoka area) |
| G空間情報センター | 51 | Geospatial data |
| 東京都オープンデータカタログ | 30 | Tokyo metropolitan data |
| 加古川市オープンデータ | 10 | Kakogawa city data |
| ふじのくにオープンデータ | 9 | Shizuoka prefecture |
| OpenData 那須 | 6 | Nasu region |

---

## Property-Related Datasets Found

### Vacant House (Akiya) Data
1. **石垣市 - 家屋（空き家を探す）**
   - Owner deceased, no heir determined
   - Owners living away (by construction year)
   - CSV format, regularly updated

2. **都城 - 築年数段階別相続人未決定家屋数**
   - Vacant houses by construction year
   - City-owned properties
   - Excel format

3. **各地方自治体の空き家データ**
   - Tax property status
   - Building structure data
   - Statistics by municipality

### Building/Housing Data Types
- **Fixed asset tax data** (固定資産税)
- **Building floor area** (床面積)
- **Building structure** (構造)
- **Construction year** (築年数)
- **Usage type** (用途別)

---

## Data Formats

| Format | Count | Notes |
|--------|-------|-------|
| CSV | 70 | Most common |
| XLSX | 36 | Excel files |
| PDF | 52 | Reports |
| SHP | 20 | Shapefiles (geospatial) |
| JSON | 3 | API responses |
| XML | 2 | Structured data |
| GeoJSON | 1 | Geospatial |
| KML | 1 | Google Earth |

---

## Search Patterns for Akiya Data

### Recommended Keywords (Japanese)
1. `空き家` - Vacant house (akiya)
2. `家屋` - House/building
3. `未相続` - No heir determined
4. `相続人未決定` - Heir undetermined
5. `所有者死亡` - Owner deceased
6. `住登外` - Not registered as residence
7. `課税家屋` - Taxable building
8. `固定資産` - Fixed asset

### Facet Fields Available
- `xckan_site_name` - Source portal
- `organization` - Publishing organization
- `res_format` - Resource format
- `tags` - Tags
- `groups` - Groups/categories

---

## Implementation Notes

### Rate Limiting
- No explicit rate limits documented
- Recommend: 1 request per second for politeness

### Authentication
- No API key required for read access
- All endpoints are public

### Pagination
- Use `rows` and `start` parameters
- Maximum recommended: 100 rows per request

### Language
- Search queries work best in Japanese
- UTF-8 encoding required

---

## Integration Strategy for Akiya Japan App

1. **Primary Search**: Use `q=%E7%A9%BA%E3%81%8D%E5%AE%B6` (空き家) for vacant houses
2. **Secondary Search**: Use `q=%E5%AE%B6%E5%B1%8B` (家屋) for broader building data
3. **Filter by Location**: Use organization or site name facets
4. **Format Priority**: CSV > XLSX > JSON for data processing
5. **Update Strategy**: Check `xckan_last_updated` field for freshness

---

## Sample Dataset Structure

```json
{
  "xckan_id": "data.bodik.jp__dataset:472077_kaokuakiyawosagasu",
  "xckan_title": "家屋（空き家を探す）",
  "xckan_site_name": "BODIK ODCS",
  "xckan_site_url": "https://data.bodik.jp/dataset/472077_kaokuakiyawosagasu",
  "xckan_last_updated": "2025-09-10T00:48:00Z",
  "organization": {
    "title": "石垣市",
    "name": "472077"
  },
  "resources": [
    {
      "format": "CSV",
      "url": "https://data.bodik.jp/.../download/1..csv",
      "name": "所有者が高齢の家屋"
    }
  ],
  "tags": [
    {"name": "家屋"},
    {"name": "家屋空き家"},
    {"name": "石垣市"}
  ]
}
```

---

## Conclusion

CKAN Search Japan provides a powerful meta-search capability for finding akiya (vacant house) data across multiple Japanese municipalities. The API is simple, requires no authentication, and returns structured JSON data that can be easily integrated into the Akiya Japan application.

**Key Takeaway**: With 47+ akiya-specific datasets and 221+ building datasets available, this portal is a valuable resource for the Akiya Japan app's data aggregation strategy.

---

*Report generated: March 17, 2026*
*Researcher: Sora (AI Assistant)*
