# Japan Local Government Open Data Portal Research Report
## Akiya/Vacant Home Datasets Survey

**Research Date:** March 16, 2026  
**Researcher:** OpenClaw Subagent  
**Scope:** National, prefectural, and city-level open data portals in Japan

---

## Executive Summary

This report surveys Japanese government open data portals to identify available akiya (空き家/vacant home) datasets. The research focused on finding actual downloadable datasets (CSV, JSON, API) rather than policy documents or PDF reports.

### Key Findings:
- **Tokyo Metropolitan Government** has the most comprehensive akiya data (295 resources)
- **National portal (data.go.jp)** has no direct akiya datasets - only housing market surveys
- Most prefectural portals have limited or no machine-readable akiya data
- Data formats vary: CSV, XLS/XLSX, PDF (with CSV being most machine-friendly)

---

## 1. National Portal: data.go.jp

**Portal URL:** https://www.data.go.jp  
**Platform:** CKAN-based e-Gov Data Portal  
**Search Results:**

| Search Term | Results | Notes |
|-------------|---------|-------|
| 空き家 (akiya) | 0 | No direct vacant home datasets found |
| 住宅 (housing) | 479 | Housing market surveys from MLIT |

### Available Housing Data (Not Akiya-Specific):
- **住宅市場動向調査** (Housing Market Trends Survey) - Annual PDF reports from MLIT
- **民間住宅ローンの実態に関する調査** (Private Housing Loan Survey) - PDF reports
- Data provider: Ministry of Land, Infrastructure, Transport and Tourism (MLIT)
- Formats: PDF, XLS, CSV (limited)

**Assessment:** ❌ No dedicated akiya/vacant home datasets. Housing data is mostly survey reports, not machine-readable vacancy data.

---

## 2. Prefectural Portals Survey

### 2.1 Tokyo Metropolitan Government ⭐ BEST

**Portal URL:** https://portal.data.metro.tokyo.lg.jp  
**Platform:** Custom CKAN implementation  
**Search Term:** 空き家  
**Results:** 295 resources found

#### Available Datasets:

| Dataset | Description | Format | Organization |
|---------|-------------|--------|--------------|
| 東京の土地20XX (土地関係資料集) | Tokyo Land Data Collection - annual | CSV, XLSX | 東京都都市整備局 |
| 表5-7-5 空き家数・空き家率（種類・建て方別） | Vacant homes by type/construction | CSV, XLSX | 東京都都市整備局 |
| 表5-7-6 空き家数・空き家率（種類・構造） | Vacant homes by type/structure | CSV, XLSX | 東京都都市整備局 |
| 表5-7-1 空き家数の内訳 | Vacant home breakdown | CSV, XLSX | 東京都都市整備局 |
| 表5-7-2 空き家率の内訳 | Vacant home rate breakdown | CSV, XLSX | 東京都都市整備局 |
| 住宅-1 総住宅数、空き家数及び空き家率の推移 | Trends in total/vacant homes | CSV | 東京都総務局 |
| くらしと統計2025 | Life & Statistics 2025 | CSV | 東京都総務局 |

#### Data Coverage:
- **Years:** 2017-2024 (annual releases)
- **Geographic granularity:** Tokyo overall, city districts (区部)
- **Metrics:**
  - Total vacant homes (空き家数)
  - Vacant home rate (空き家率 %)
  - By construction type (wooden, RC, steel)
  - By housing type (detached, row house, apartment)
  - By purpose (rental, sale, secondary residence, other)

#### Sample Data Points:
```
Tokyo 2023: 896,500 vacant homes (10.9% vacancy rate)
Breakdown by structure:
- Wooden: 72,600 / 434,000 (16.7%)
- Reinforced concrete: 480,400 / 3,651,900 (13.2%)
- Steel: 96,500 / 767,200 (12.6%)
```

**Assessment:** ✅ **EXCELLENT** - Most comprehensive akiya data found. Regular updates, multiple formats, historical trends.

---

### 2.2 Hokkaido Prefecture

**Portal URL:** https://ckan.hokkaido.opendata.jp (Not reachable)  
**Alternative:** https://www.pref.hokkaido.lg.jp/opendata/ (404 Error)

**Assessment:** ❌ Portal appears offline or URL changed. Could not access.

---

### 2.3 Kyoto Prefecture

**Portal URL:** https://data.pref.kyoto.lg.jp/  
**Status:** DNS not found

**Assessment:** ❌ Portal not found at expected URL.

---

### 2.4 Osaka Prefecture

**Portal URL:** https://opendata.pref.osaka.lg.jp/  
**Status:** DNS not found

**Assessment:** ❌ Portal not found at expected URL.

---

### 2.5 Kanagawa Prefecture

**Portal URL:** https://www.pref.kanagawa.jp/search.html  
**Search Term:** 空き家  
**Results:** ~1,280 results (mostly web pages, not datasets)

#### Available Documents:
| Document | Format | Notes |
|----------|--------|-------|
| 神奈川県内の空き家の現状 | PDF | Current status report |
| 神奈川県の市町村別その他の空き家数とその他の空き家率 | PDF | Municipal breakdown |
| 空き家施策 | HTML | Policy information |
| 管理不全空家等及び特定空家等の判断マニュアル | PDF | Assessment manual |
| 空き家所有者特定手法マニュアル | PDF | Owner identification manual |

**Assessment:** ⚠️ **LIMITED** - Only PDF reports, no downloadable datasets. Good policy information but not machine-readable.

---

### 2.6 Saitama Prefecture

**Portal URL:** https://opendata.pref.saitama.lg.jp/  
**Platform:** dataeye DASHBOARD  
**Search Term:** 空き家  
**Results:** 1 dataset

#### Available Dataset:
| Dataset | Description | Format | Municipality |
|---------|-------------|--------|--------------|
| 秩父市都市計画マスタープラン・立地適正化計画 | Chichibu City Urban Planning Master Plan | KML, XLS | 秩父市 (Chichibu City) |

**Assessment:** ❌ **MINIMAL** - Only 1 dataset related to urban planning, not specific akiya data.

---

## 3. City-Level Portals Survey

### 3.1 Yokohama City (Kanagawa)

**Portal URL:** https://data.city.yokohama.lg.jp/  
**Platform:** CKAN  
**Search Term:** 空き家  
**Results:** 4 datasets

#### Available Datasets:
| Dataset | Description | Format |
|---------|-------------|--------|
| 横浜市統計書 第10章 建物及び住宅 | Yokohama Statistical Book Ch.10 | CSV, XLSX |
| 令和2年度版 発見つるみ！～データでみる鶴見区～ | Discover Tsurumi! Reiwa 2 | CSV, XLSX |
| 令和3年度版 発見つるみ！～データでみる鶴見区～ | Discover Tsurumi! Reiwa 3 | CSV, XLSX |
| 横浜市中期4か年計画2018～2021 数値データ | 4-Year Plan Data | CSV, XLSX |

**Assessment:** ✅ **GOOD** - Has housing statistics including vacant home data. CSV/XLSX formats available.

---

### 3.2 Kyoto City

**Portal URL:** https://www.city.kyoto.lg.jp/  
**Status:** Page load issues

**Assessment:** ❌ Could not access open data portal.

---

### 3.3 Osaka City

**Portal URL:** https://data.city.osaka.lg.jp/  
**Status:** Connection refused

**Assessment:** ❌ Portal not accessible.

---

## 4. Data Format Analysis

### Available Formats by Portal:

| Portal | CSV | XLS/XLSX | JSON | API | PDF | KML |
|--------|-----|----------|------|-----|-----|-----|
| data.go.jp | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Tokyo | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Kanagawa (Pref) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Yokohama | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Saitama | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

### Standardized Formats:

#### CKAN (Comprehensive Knowledge Archive Network)
- Used by: data.go.jp, Tokyo, Yokohama
- Features: Dataset cataloging, API access, multiple format support
- API endpoint: `/api/3/` (standard CKAN API)

#### Sodan Format
- Not explicitly found in surveyed portals
- Many portals use custom CKAN implementations

---

## 5. Recommendations for Akiya App Development

### Best Data Sources:

1. **Tokyo Metropolitan Government** (Primary)
   - URL: https://portal.data.metro.tokyo.lg.jp
   - 295 resources, annual updates
   - CSV format available
   - API access via CKAN

2. **Yokohama City** (Secondary)
   - URL: https://data.city.yokohama.lg.jp
   - 4 datasets with housing statistics
   - CSV/XLSX formats

3. **Kanagawa Prefecture** (Reference)
   - PDF reports for policy context
   - Not machine-readable but good for background

### Data Integration Strategy:

```
Priority 1: Tokyo data (comprehensive, regular updates)
Priority 2: Yokohama data (city-level detail)
Priority 3: Other municipalities (as discovered)
```

### API Access:

Tokyo and Yokohama use standard CKAN API:
```
https://portal.data.metro.tokyo.lg.jp/api/3/action/package_search?q=空き家
```

---

## 6. Gaps and Limitations

### Major Gaps:
1. **No nationwide akiya dataset** - data.go.jp lacks consolidated national data
2. **Many prefectural portals offline** - Hokkaido, Kyoto, Osaka portals not accessible
3. **Inconsistent formats** - Mix of PDF, CSV, XLS across portals
4. **Limited granular data** - Most data is prefecture/city level, not property-level
5. **No real-time updates** - Data is annual at best

### What Would Be Ideal:
- Property-level vacant home registry (address, condition, contact info)
- Real-time or quarterly updates
- Standardized format across all municipalities
- API-first approach with JSON output
- Integration with akiya bank (空き家バンク) systems

---

## 7. Portal Contact Information

| Portal | Data Provider | Contact |
|--------|--------------|---------|
| data.go.jp | Digital Agency | https://www.data.go.jp/info/ja/contacts |
| Tokyo | 東京都都市整備局 | https://portal.data.metro.tokyo.lg.jp/contact |
| Yokohama | 横浜市 | https://data.city.yokohama.lg.jp/terms.html |

---

## Appendix: Portal URLs Reference

### National:
- https://www.data.go.jp

### Prefectural:
- Tokyo: https://portal.data.metro.tokyo.lg.jp
- Hokkaido: Not accessible
- Kanagawa: https://www.pref.kanagawa.jp/
- Saitama: https://opendata.pref.saitama.lg.jp/
- Kyoto: Not found
- Osaka: Not accessible

### City-Level:
- Yokohama: https://data.city.yokohama.lg.jp/
- Kyoto City: Not accessible
- Osaka City: Not accessible

---

*Report compiled on March 16, 2026*
