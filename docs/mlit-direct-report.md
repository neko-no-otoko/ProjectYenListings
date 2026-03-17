# MLIT Direct Data Sources Report for Akiya Japan App

**Research Date:** March 17, 2026  
**Purpose:** Identify direct MLIT data sources beyond REINFOLIB for Akiya Japan app

---

## Executive Summary

MLIT (国土交通省 - Ministry of Land, Infrastructure, Transport and Tourism) provides multiple direct data sources that can supplement REINFOLIB for the Akiya Japan app. These include statistical surveys, GIS data portals, APIs, and downloadable datasets.

---

## 1. Land and Building Registry Data

### 1.1 REINFOLIB (不動産情報ライブラリ)
- **URL:** https://www.reinfolib.mlit.go.jp/
- **Data Available:**
  - Real estate transaction prices (取引価格・成約価格)
  - Land price announcements (地価公示)
  - Prefectural land price surveys (都道府県地価調査)
  - Disaster prevention information
  - Urban planning data
  - Surrounding facilities information
- **Access:**
  - Web interface for searching
  - CSV downloads available
  - **API Available:** Yes - requires application
  - API Documentation: https://www.reinfolib.mlit.go.jp/help/apiManual/
- **Update Frequency:** Quarterly (real estate prices), Annual (land prices)

### 1.2 National Land Numerical Information (国土数値情報)
- **URL:** https://nlftp.mlit.go.jp/
- **Data Available:**
  - Topography, land use, public facilities
  - Transportation, disaster risk information
  - Urban planning data
  - Land prices (地価)
- **Format:** GIS data (GML, Shapefile compatible)
- **License:** CC-BY 4.0 (Open Data) for most datasets
- **Key Datasets for Akiya:**
  - Land price survey data (都道府県地価調査)
  - Urban planning decision information (都市計画決定情報)
  - Disaster risk areas

### 1.3 Land Comprehensive Information System (土地総合情報システム)
- **URL:** http://www.land.mlit.go.jp/webland/ (Note: Currently unavailable)
- Provides land transaction price information

---

## 2. Vacant House Statistics by Prefecture

### 2.1 Vacant House Owner Survey (空き家所有者実態調査) ⭐ KEY RESOURCE
- **Conducted by:** MLIT Housing Bureau
- **Frequency:** Every 5 years (since 1980)
- **Latest Survey:** Reiwa 6 (2024) - Results published August 2025
- **URL:** https://www.mlit.go.jp/jutakukentiku/house/R6_akiya_syoyuusya_jittaityousa.html
- **Data Available on e-Stat:**
  - 190 datasets available
  - R6 (2024): 55 datasets
  - R1 (2019): 45 datasets
  - H26 (2014): 41 datasets
  - H21 (2009): 48 datasets
- **e-Stat Portal:** https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00600640&result_page=1
- **Survey Details:**
  - Sample: ~13,000 households owning vacant houses
  - Links to Housing & Land Survey data
  - Covers: Basic info, acquisition history, management status, usage status, future intentions

### 2.2 Housing and Land Survey (住宅・土地統計調査)
- **Conducted by:** Statistics Bureau (総務省統計局)
- **Frequency:** Every 5 years
- **Latest:** 2023 Survey (2023年住宅・土地統計調査)
- **e-Stat Data Portal:** https://www.e-stat.go.jp/en/stat-search/files?tstat=000001207800
- **Datasets Available:** 672 files
  - Statistical Tables (Time Series): 55 datasets
  - Summary Tables: 62 datasets
  - Basic Tabulation on Dwellings and Households: 321 datasets
  - Land Tabulation: 34 datasets
  - Construction Material Tabulation: 194 datasets
- **Data Includes:**
  - Vacant house counts by prefecture
  - Housing structure data
  - Land usage by region
  - Prefecture-level breakdowns (都道府県単位)
  - City/ward/town/village level (市区町村単位)

---

## 3. Housing Survey Data

### 3.1 MLIT Housing Statistics List (建築・住宅関係統計)
- **URL:** https://www.mlit.go.jp/statistics/details/jutaku_list.html

| No | Survey Name | Type | Access |
|----|-------------|------|--------|
| 1 | Building Starts Statistics (建築着工統計調査) | Core | e-Stat |
| 2 | Housing Starts (住宅着工統計) | Core | e-Stat |
| 5 | Building Remodel/Renewal Survey (建築物リフォーム・リニューアル調査) | General | e-Stat |
| 7 | Housing Life Survey (住生活総合調査) | General | PDF/Excel |
| 8 | **Vacant House Owner Survey** (空き家所有者実態調査) | General | **e-Stat** |
| 9 | Housing Market Trends Survey (住宅市場動向調査) | General | e-Stat |
| 13 | Condominium Survey (マンション総合調査) | General | PDF |
| 14 | Building Condition Survey (建築物実態調査) | General | e-Stat |
| 15 | Building Stock Statistics (建築物ストック統計) | Processed | PDF |

### 3.2 e-Stat Government Statistics Portal
- **English:** https://www.e-stat.go.jp/en/
- **Japanese:** https://www.e-stat.go.jp/
- **Features:**
  - Database search (723 databases for Housing & Land Survey)
  - File downloads (672 files for 2023 survey)
  - Bulk download available
  - CSV, Excel formats
  - API access for developers

---

## 4. Bulk Data Downloads & XML Feeds

### 4.1 MLIT Statistics Release Schedule & XML Feeds
- **Base URL:** http://www.mlit.go.jp/toukei/yotei/
- **Available XML Feeds:**

| Feed | URL | Description |
|------|-----|-------------|
| Building Starts | e-stat_TYAKKOU.xml | Monthly/Yearly construction stats |
| Construction Orders | e-stat_JUTYUU.xml | Quick/complete reports |
| Related Industries | e-stat_KANRENGYO.xml | Construction-related businesses |
| Building Loss | e-stat_MESSHITSU.xml | Building destruction stats |
| Construction Composite | e-stat_SOUGOU.xml | Comprehensive construction stats |
| Deflators | e-stat_DEF.xml | Construction cost deflators |
| Equipment Orders | e-stat_SETUBI.xml | Equipment construction |
| Corporate Land/Building | e-stat_tochikihon.xml | Corporate real estate survey |

### 4.2 National Land Numerical Information Download
- **URL:** https://nlftp.mlit.go.jp/ksj/index.html
- **Format:** JPGIS 2.1 (GML), compatible with QGIS/Tableau
- **Data Includes:**
  - Administrative areas (行政区域)
  - Land price surveys (都道府県地価調査)
  - Urban planning (都市計画決定情報)
  - Disaster risk zones (洪水浸水想定区域, 土砂災害警戒区域, etc.)
  - Transportation (railways, stations, roads)

### 4.3 REINFOLIB API
- **URL:** https://www.reinfolib.mlit.go.jp/api/request/
- **Features:**
  - Real estate price API
  - Land price point API
  - National land information APIs
  - Urban planning APIs
  - Disaster prevention APIs
- **Format:** JSON, PBF, CSV
- **Access:** Free registration required

---

## 5. Additional Resources

### 5.1 Land Price Information (地価公示)
- **Land Price Announcement:** https://www.mlit.go.jp/totikensangyo/totikensangyo_fr4_000043.html
- **Prefectural Land Price Survey:** https://www.mlit.go.jp/totikensangyo/totikensangyo_fr4_000044.html
- **Land Price Look Report:** https://www.mlit.go.jp/totikensangyo/totikensangyo_fr4_000045.html

### 5.2 Land Registry Survey (地籍調査)
- **URL:** http://www.chiseki.go.jp/
- Provides cadastral survey data

### 5.3 GIS Data for Mapping
- **G-Spatial Information Center:** https://front.geospatial.jp/
  - Links to various open data including land registry maps
- **QGIS Manuals:** https://nlftp.mlit.go.jp/ksj/manual/manual.html

### 5.4 Regional Economic Analysis System (RESAS)
- **URL:** https://resas.go.jp/
- Regional demographic and economic data visualization

---

## 6. Data Integration Recommendations for Akiya App

### Priority 1: Core Data (Essential)
1. **Vacant House Owner Survey** (空き家所有者実態調査)
   - Download from e-Stat (190 datasets total)
   - Provides direct vacant house statistics by prefecture
   - Includes owner intentions and management status

2. **Housing and Land Survey** (住宅・土地統計調査)
   - 672 datasets from e-Stat
   - Vacant house counts at prefecture/municipality level
   - Updated every 5 years

### Priority 2: Supplementary Data
3. **REINFOLIB Real Estate Transaction Data**
   - API integration for current market prices
   - Quarterly updates
   - Transaction-level data

4. **National Land Numerical Information**
   - GIS layers for mapping
   - Land prices, urban planning zones
   - Disaster risk information

### Priority 3: Contextual Data
5. **MLIT XML Feeds**
   - For monitoring construction trends
   - Building starts data

6. **Land Price Survey Data**
   - Annual price trends by prefecture

---

## 7. Access Instructions

### e-Stat Bulk Download
1. Visit: https://www.e-stat.go.jp/en/stat-search/files
2. Filter by "Housing and Land Survey"
3. Select year (e.g., 2023)
4. Download CSV/Excel files

### REINFOLIB API
1. Register at: https://www.reinfolib.mlit.go.jp/api/request/
2. Wait for approval
3. Access API documentation: https://www.reinfolib.mlit.go.jp/help/apiManual/
4. Rate limits and usage terms apply

### National Land Numerical Info
1. Visit: https://nlftp.mlit.go.jp/ksj/index.html
2. Select data category
3. Download GML files
4. Convert to GeoJSON/Shapefile as needed

---

## 8. Data Update Cycles

| Data Source | Frequency | Next Expected Update |
|-------------|-----------|---------------------|
| Vacant House Owner Survey | Every 5 years | 2029 (R11) |
| Housing & Land Survey | Every 5 years | 2028 (latest: 2023) |
| Real Estate Transaction Prices | Quarterly | Ongoing |
| Land Price Announcement | Annual | March annually |
| Building Starts | Monthly | Monthly |

---

## 9. Contact Information

### MLIT Housing Bureau
- **Address:** 2-1-3 Kasumigaseki, Chiyoda-ku, Tokyo 100-8918
- **Phone:** 03-5253-8111
- **Vacant House Survey:** 住宅局住宅企画官付 調査係 (39-244)

### Statistics Bureau
- **Housing & Land Survey:** https://www.stat.go.jp/english/data/jyutaku/index.html

---

*Report compiled for Akiya Japan app development. Data sources verified March 2026.*
