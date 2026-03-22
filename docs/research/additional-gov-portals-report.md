# Additional Local Government Open Data Portals Research

**Research Date:** March 22, 2026  
**Focus:** Open data portals providing akiya/vacant home datasets  
**Scope:** National and regional CKAN-based portals

---

## Summary

Found **5+ additional local government open data portals** with varying levels of akiya data availability:

| Portal | Region | Platform | Akiya Data | Status |
|--------|--------|----------|------------|--------|
| BODIK | Kyushu + 15 prefectures | CKAN | ✅ Yes | **Active** |
| search.ckan.jp | National aggregator | CKAN | ✅ Discovery | **Active** |
| Portal.data.metro.tokyo | Tokyo | CKAN | ✅ Comprehensive | **Active** |
| data.city.yokohama | Yokohama | CKAN | ✅ Limited | **Active** |
| data.go.jp | National | CKAN | ❌ Minimal | **Active** |

---

## 1. BODIK ODCS (Primary Source)

**URL:** https://data.bodik.jp/api/3/action  
**Type:** CKAN 2.10 API  
**Coverage:** 343 municipalities across 15 prefectures  
**Status:** ✅ Fully operational

### Akiya Datasets Available: 14+
- 空き家率・空き家件数 (Vacant house rates/counts)
- 空き家率 by district
- 家屋（空き家を探す）- Properties with elderly owners
- 空き家管理戸数一覧
- 所有者または納税管理人が高齢の家屋

### API Endpoints:
```
package_search?q=空き家
package_show?id={dataset_id}
datastore_search?resource_id={resource_id}
```

### Integration Status:
- ✅ Connector implemented: `bodik-connector.ts`
- ✅ Pipeline implemented: `bodik-pipeline.ts`
- ✅ Tests written: `bodik-ingestion.test.ts`
- ✅ Added to exports: `connectors/index.ts`

---

## 2. CKAN Search Japan (Aggregator)

**URL:** https://search.ckan.jp/backend/api  
**Type:** CKAN Backend API  
**Coverage:** Multiple CKAN instances across Japan  
**Status:** ✅ Fully operational

### Features:
- Aggregates datasets from multiple CKAN portals
- Backend API for programmatic access
- Dataset discovery across instances

### Implementation:
- ✅ Client: `ckanClient.ts`
- ✅ Discovery connector: `searchCkanJp.ts`
- ✅ Registered in admin routes

---

## 3. Tokyo Metropolitan Government

**URL:** https://portal.data.metro.tokyo.lg.jp  
**Type:** Custom CKAN implementation  
**Coverage:** Tokyo Metropolitan area  
**Status:** ✅ Comprehensive data available

### Akiya Datasets: 295 resources
| Dataset | Description | Format |
|---------|-------------|--------|
| 表5-7-5 空き家数・空き家率 | Vacant homes by type/construction | CSV, XLSX |
| 表5-7-6 空き家数・空き家率 | Vacant homes by type/structure | CSV, XLSX |
| 表5-7-1 空き家数の内訳 | Vacant home breakdown | CSV, XLSX |
| 表5-7-2 空き家率の内訳 | Vacant home rate breakdown | CSV, XLSX |
| 住宅-1 総住宅数、空き家数及び空き家率の推移 | Trends in total/vacant homes | CSV |

### Data Quality:
- **Years:** 2017-2024 (annual releases)
- **Granularity:** Tokyo overall, city districts (区部)
- **Metrics:** Vacant home counts, rates by type/structure

### API Access:
```
https://portal.data.metro.tokyo.lg.jp/api/3/action/package_search?q=空き家
```

---

## 4. Yokohama City Open Data Portal

**URL:** https://data.city.yokohama.lg.jp  
**Type:** CKAN  
**Coverage:** Yokohama City  
**Status:** ✅ Limited housing data available

### Datasets Found: 4
| Dataset | Description | Format |
|---------|-------------|--------|
| 横浜市統計書 第10章 建物及び住宅 | Statistical Book Ch.10 | CSV, XLSX |
| 令和2年度版 発見つるみ！ | Discover Tsurumi! Reiwa 2 | CSV, XLSX |
| 令和3年度版 発見つるみ！ | Discover Tsurumi! Reiwa 3 | CSV, XLSX |
| 横浜市中期4か年計画 | 4-Year Plan Data | CSV, XLSX |

---

## 5. National Portal (data.go.jp)

**URL:** https://www.data.go.jp  
**Type:** CKAN-based e-Gov Data Portal  
**Coverage:** National government datasets  
**Status:** ⚠️ No direct akiya datasets

### Search Results:
| Search Term | Results | Notes |
|-------------|---------|-------|
| 空き家 | 0 | No direct vacant home datasets |
| 住宅 | 479 | Housing market surveys (PDF) |

### Available Data:
- 住宅市場動向調査 (Housing Market Trends Survey) - Annual PDFs
- 民間住宅ローンの実態に関する調査 - PDF reports
- Data provider: MLIT (国土交通省)

### Assessment:
❌ Not suitable for akiya app - only survey reports, not machine-readable vacancy data

---

## Additional Portals (Requires Further Investigation)

### 6. Hokkaido Prefecture
- **URL:** https://ckan.hokkaido.opendata.jp (Status: Unknown)
- **Alternative:** https://www.pref.hokkaido.lg.jp/opendata/
- **Status:** Needs verification

### 7. Kyoto Prefecture
- **URL:** https://data.pref.kyoto.lg.jp/
- **Status:** DNS not found - may have moved

### 8. Osaka Prefecture
- **URL:** https://opendata.pref.osaka.lg.jp/
- **Status:** DNS not found - may have moved

### 9. Saitama Prefecture
- **URL:** https://opendata.pref.saitama.lg.jp/
- **Platform:** dataeye DASHBOARD
- **Status:** Limited datasets found

---

## Recommendations

### For Immediate Integration:
1. **BODIK** - Already fully implemented ✅
2. **search.ckan.jp** - Already implemented ✅
3. **Tokyo Metropolitan** - High-quality data, recommend next integration

### For Future Research:
4. **Yokohama City** - City-level detail for Kanagawa
5. **Other prefectural portals** - Need to verify URLs and data availability

### Data Integration Priority:
```
Priority 1: BODIK (implemented) - Municipal data from 15 prefectures
Priority 2: Tokyo Metro - Comprehensive stats for capital region
Priority 3: Yokohama - City-level housing data
Priority 4: Other portals as discovered
```

---

## Technical Notes

### Common API Patterns:
Most portals use standard CKAN API:
```
/api/3/action/package_search?q={query}&rows={limit}
/api/3/action/package_show?id={dataset_id}
/api/action/datastore_search?resource_id={resource_id}
```

### Authentication:
- BODIK: None required (public API)
- Tokyo: None required (public API)
- CKAN Search: None required (public API)

### Rate Limiting:
- BODIK: ~60 req/min (recommended)
- Others: Not documented - use conservative limits

---

*Report generated: March 22, 2026*
