# Additional MLIT Data Sources Beyond REINFOLIB

**Research Date:** March 17, 2026  
**Purpose:** Identify additional MLIT (国土交通省) data sources not covered in the primary REINFOLIB integration

---

## 1. Executive Summary

While REINFOLIB provides the most comprehensive real estate transaction APIs, MLIT offers several **additional direct data sources** that provide unique value for the Akiya Japan app:

| Source | Data Type | Access | Value for Akiya App |
|--------|-----------|--------|---------------------|
| e-Stat Vacant House Survey | Statistical | Download/API | Direct akiya ownership data |
| National Land Numerical Info | GIS Layers | Download | Mapping & risk assessment |
| Housing & Land Survey | Statistical | Download/API | Vacant house counts by region |
| MLIT XML Feeds | Statistical | RSS/XML | Construction trends |
| Land Price Data | Statistical | Download | Price benchmarking |

---

## 2. e-Stat Government Statistics Portal

### 2.1 Vacant House Owner Survey (空き家所有者実態調査) ⭐ KEY RESOURCE

**Portal:** https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00600640

**Survey Details:**
- **Conducted by:** MLIT Housing Bureau (住宅局)
- **Frequency:** Every 5 years (since 1980)
- **Latest:** Reiwa 6 (2024) - Results published August 2025
- **Total Datasets Available:** 190 files

**Survey Years Available:**
| Year | Japanese Era | Files | Publication Date |
|------|--------------|-------|------------------|
| 2024 | 令和6年 | 55件 | 2025-08-29 |
| 2019 | 令和元年 | 45件 | 2020-12-16 |
| 2014 | 平成26年 | 41件 | 2015-11-20 |
| 2009 | 平成21年 | 48件 | 2016-11-09 |
| 2003 | 空家実態調査 | 1件 | 2008-05-15 |

**Data Includes:**
- Sample: ~13,000 households owning vacant houses
- Links to Housing & Land Survey data
- Covers:
  - Basic owner information (基本属性)
  - Acquisition history (取得経緯)
  - Management status (管理状況)
  - Usage status (利用状況)
  - Future intentions (将来の利用意向)

**Access Methods:**
1. **Web Download:** CSV/Excel via portal
2. **API Access:** e-Stat API for programmatic access
3. **Statistical Dashboard:** https://dashboard.e-stat.go.jp/

### 2.2 Housing and Land Survey (住宅・土地統計調査)

**Portal:** https://www.e-stat.go.jp/en/stat-search/files?tstat=000001207800

**Survey Details:**
- **Conducted by:** Statistics Bureau (総務省統計局)
- **Frequency:** Every 5 years
- **Latest:** 2023 Survey (令和5年)

**Datasets Available:** 672 files
- Statistical Tables (Time Series): 55 datasets
- Summary Tables: 62 datasets
- Basic Tabulation on Dwellings: 321 datasets
- Land Tabulation: 34 datasets
- Construction Material: 194 datasets

**Data Includes:**
- Vacant house counts by prefecture (都道府県単位)
- City/ward/town/village level (市区町村単位)
- Housing structure data
- Land usage by region

---

## 3. National Land Numerical Information (国土数値情報)

**Portal:** https://nlftp.mlit.go.jp/

**Data Format:** GIS data (GML, Shapefile compatible)
**License:** CC-BY 4.0 (Open Data) for most datasets

### Key Datasets for Akiya App:

| Dataset | Code | Format | Update Frequency |
|---------|------|--------|------------------|
| Administrative Areas | A002005 | GML | Annual |
| Land Price Survey | L01 | GML | Annual |
| Urban Planning Decision | A002003 | GML | Quarterly |
| Flood Inundation Areas | A35 | GML | As needed |
| Landslide Warning Areas | A38 | GML | As needed |
| Station Passenger Volume | N02 | GML | Annual |

**Download Portal:** https://nlftp.mlit.go.jp/ksj/index.html

---

## 4. MLIT Statistics XML Feeds

**Base URL:** http://www.mlit.go.jp/toukei/yotei/

### Available XML Feeds:

| Feed | URL | Description |
|------|-----|-------------|
| Building Starts | e-stat_TYAKKOU.xml | Monthly/Yearly construction stats |
| Construction Orders | e-stat_JUTYUU.xml | Quick/complete reports |
| Related Industries | e-stat_KANRENGYO.xml | Construction-related businesses |
| Building Loss | e-stat_MESSHITSU.xml | Building destruction stats |
| Construction Composite | e-stat_SOUGOU.xml | Comprehensive construction stats |
| Deflators | e-stat_DEF.xml | Construction cost deflators |

**Usage:** RSS/XML polling for monitoring construction trends in target regions

---

## 5. Land Price Information (地価公示・地価調査)

### 5.1 Land Price Announcement (地価公示)
**URL:** https://www.mlit.go.jp/totikensangyo/totikensangyo_fr4_000043.html

### 5.2 Prefectural Land Price Survey (都道府県地価調査)
**URL:** https://www.mlit.go.jp/totikensangyo/totikensangyo_fr4_000044.html

### 5.3 Land Price Look Report (地価Lookレポート)
**URL:** https://www.mlit.go.jp/totikensangyo/totikensangyo_fr4_000045.html

**Format:** PDF reports with price trends by prefecture
**Update:** Annual (March publication)

---

## 6. Additional MLIT Resources

### 6.1 Housing Statistics List (建築・住宅関係統計)
**URL:** https://www.mlit.go.jp/statistics/details/jutaku_list.html

Complete list of 14 housing-related statistics with access information.

### 6.2 Land Registry Survey (地籍調査)
**URL:** http://www.chiseki.go.jp/

Provides cadastral survey data for property boundary verification.

### 6.3 GIS Data Resources

**G-Spatial Information Center:** https://front.geospatial.jp/
- Links to various open data including land registry maps
- Compatible with QGIS and other GIS tools

**QGIS Manuals:** https://nlftp.mlit.go.jp/ksj/manual/manual.html

### 6.4 RESAS (Regional Economic Analysis System)
**URL:** https://resas.go.jp/

Regional demographic and economic data visualization platform.

---

## 7. e-Stat API for Developers

**Developer Portal:** https://www.e-stat.go.jp/developer

### Features:
- Statistical data automatic retrieval
- JSON/CSV output formats
- API key registration required
- Rate limits apply

### Use Cases for Akiya App:
1. **Populate Regional Statistics:** Pull vacant house counts by prefecture
2. **Trend Analysis:** Compare data across survey years
3. **Demographic Context:** Link with population data

---

## 8. Integration Recommendations

### Priority 1: Essential Data
1. **e-Stat Vacant House Owner Survey**
   - Download R6 (2024) datasets
   - Provides direct akiya ownership statistics
   - Links to demographic data

2. **Housing & Land Survey**
   - 672 datasets for comprehensive housing stock data
   - Vacant house counts at municipality level

### Priority 2: Supplementary Data
3. **National Land Numerical Information**
   - GIS layers for mapping integration
   - Disaster risk zones for property evaluation
   - Land prices for benchmarking

4. **MLIT XML Feeds**
   - Monitor construction trends in target areas
   - Building starts data for market analysis

### Priority 3: Contextual Data
5. **Land Price Survey Data**
   - Annual price trends by prefecture
   - Market context for akiya listings

---

## 9. Data Access Instructions

### e-Stat Bulk Download
1. Visit: https://www.e-stat.go.jp/stat-search/files
2. Filter by "空き家所有者実態調査"
3. Select survey year (e.g., 令和6年)
4. Download CSV/Excel files

### National Land Numerical Info Download
1. Visit: https://nlftp.mlit.go.jp/ksj/index.html
2. Select data category (e.g., 土地価格)
3. Select prefecture
4. Download GML files
5. Convert to GeoJSON/Shapefile as needed

### e-Stat API Access
1. Register at: https://www.e-stat.go.jp/developer
2. Obtain API key
3. Follow API documentation for queries

---

## 10. Data Update Cycles

| Data Source | Frequency | Next Expected Update |
|-------------|-----------|---------------------|
| Vacant House Owner Survey | Every 5 years | 2029 (R11) |
| Housing & Land Survey | Every 5 years | 2028 (latest: 2023) |
| Land Price Survey | Annual | March annually |
| National Land Numerical Info | Varies | Check portal |
| Building Starts (XML) | Monthly | Monthly |

---

## 11. Summary: MLIT Data Beyond REINFOLIB

| Category | Best Source | Access | Key Value |
|----------|-------------|--------|-----------|
| Vacant House Statistics | e-Stat | Download/API | Direct akiya data |
| Geographic Data | National Land Info | GIS Download | Mapping & risk |
| Housing Stock | Housing & Land Survey | Download | Vacant counts |
| Price Trends | Land Price Survey | Download | Market context |
| Construction Trends | MLIT XML Feeds | RSS | Market indicators |

---

*Report compiled for Akiya Japan app development. Data sources verified March 2026.*
