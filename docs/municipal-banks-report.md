# Municipal Akiya Banks (空き家バンク) Research Report

**Date:** March 16, 2026  
**Research Focus:** Municipal akiya bank websites in rural Japan  
**Target Regions:** Nagano, Tottori/Shimane, Kochi/Tokushima, Akita/Aomori

---

## Executive Summary

This research analyzed municipal akiya banks (vacant house banks) across rural Japan to understand their structure, URL patterns, and data formats. The findings reveal two major platform types:

1. **Custom Regional Platforms** (e.g., 楽園信州空き家バンク)
2. **Standardized National Platforms** (e.g., アットホーム空き家バンク)

---

## 1. Major Akiya Bank Platforms

### 1.1 楽園信州空き家バンク (Rakuen Shinshu Akiya Bank)
- **URL:** https://rakuen-akiya.jp/
- **Coverage:** Nagano Prefecture
- **Properties:** 923 listings (628 used homes, 33 rentals, 216 land plots, 46 shops)
- **Operator:** Nagano Prefecture + Nagano Real Estate Association

#### URL Patterns:
- Homepage: `https://rakuen-akiya.jp/`
- Search/Listings: `https://rakuen-akiya.jp/housesearch/all/`
- Property Detail: `https://rakuen-akiya.jp/bukken/{PROPERTY_ID}/`
  - Example: `/bukken/420374/`
- Vendor Page: `https://rakuen-akiya.jp/vendor/{VENDOR_ID}/`
- Area Search: `https://rakuen-akiya.jp/housesearch/area/?vender_jiscode[]={JIS_CODE}`
- Pagination: `?pg={PAGE_NUMBER}`

#### HTML Structure:
- Property listings use `<article>` or `<div>` containers with class names like `housesearch_item`
- Property title: `<h3>` with address
- Property type banner: `<h2>` (貸家, 売土地, 貸店舗)
- Images: Multiple thumbnails linking to detail pages
- Price display: Text element with "万円" suffix
- Detail table: `<table>` with rows for key-value pairs

#### Data Fields Available:
| Field | Type | Notes |
|-------|------|-------|
| Property ID | Numeric | Unique identifier (e.g., 420374) |
| Property Type | Enum | 中古住宅, 貸家, 売土地, 貸店舗 |
| Price | Numeric | In 万円 (10,000 JPY) |
| Address | String | Full Japanese address |
| Layout | String | e.g., 3DK, 2LDK |
| Building Age | Date | Construction year/month |
| Land Area | Numeric | m² |
| Building Area | Numeric | m² |
| Features | Array | Tags like "家庭菜園・畑付き", "ペット可" |
| Real Estate Agency | String | Contact information |
| Last Updated | Date | Update timestamp |

#### Special Features:
- Incentive programs: 市町村空き家バンク登録物件
- Feature tags: 週末暮らし物件, 古民家風, 温泉付き
- Area filtering by 10 regional categories

---

### 1.2 アットホーム空き家バンク (Akiya at Home)
- **URL:** https://www.akiya-athome.jp/
- **Coverage:** Nationwide (894 municipalities, 11,038 properties)
- **Operator:** At Home Co., Ltd.

#### URL Patterns:
- Prefecture Listings: `https://www.akiya-athome.jp/buy/{PREFECTURE_CODE}/`
  - Nagano: `/buy/20/`
  - Kochi: `/buy/39/`
- Municipal Subdomain: `https://{CITY_CODE}.akiya-athome.jp/`
  - Example: `https://nakano-c20211.akiya-athome.jp/`
- Property Detail: `https://{CITY_CODE}.akiya-athome.jp/bukken/detail/buy/{PROPERTY_ID}`
  - Example: `https://sakae-v20602.akiya-athome.jp/bukken/detail/buy/44144`
- Government List: `https://www.akiya-athome.jp/government/`

#### HTML Structure:
- Listing container: `<article>` with property cards
- Property type: Text label (売戸建, 売土地)
- Municipality label: e.g., "下水内郡栄村"
- Image gallery badge: "写真 {N}枚"
- Property title: Link with property name
- Data displayed as definition lists (`<dl>` with `<dt>`/`<dd>`)

#### Data Fields Available:
| Field | Type | Notes |
|-------|------|-------|
| Property ID | Numeric | Unique per municipality |
| Property Type | Enum | 売戸建, 売土地, マンション, 事業・投資物件 |
| Price | Numeric | In 万円 |
| Layout | String | e.g., 5LDK, 8DK |
| Building Area | Numeric | m² (建物面積) |
| Land Area | Numeric | m² (土地面積) |
| Private Road Area | Numeric | m² (私道負担面積) |
| Construction Date | Date | Year/month (築年月) |
| Address | String | Full address (所在地) |
| Transportation | String | Train stations, walking time |
| Image Count | Numeric | Number of photos available |

#### Municipal Subdomain Pattern:
- City: `{city-name}-c{jis-code}.akiya-athome.jp`
- Town: `{town-name}-t{jis-code}.akiya-athome.jp`
- Village: `{village-name}-v{jis-code}.akiya-athome.jp`

Examples:
- 中野市: `nakano-c20211.akiya-athome.jp`
- 栄村: `sakae-v20602.akiya-athome.jp`
- 飯綱町: `iizuna-t20590.akiya-athome.jp`

---

## 2. Municipal-Specific Akiya Banks

### 2.1 宿毛市空き家バンク (Sukumo City, Kochi)
- **URL:** https://www.city.sukumo.kochi.jp/akiya-bank/top.html
- **Type:** Custom municipal website

#### URL Patterns:
- Top page: `/akiya-bank/top.html`
- Property pages: `/akiya-bank/{PROPERTY_NUMBER}.html`
- PDF documents: `/pdf/ijyu/{FILENAME}.pdf`

#### Structure:
- Area-based sections with anchor links (`#su01`, `#su02`, etc.)
- Property cards with thumbnails
- Classification: 貸家 (rental), 売家 (sale), 売地 (land)
- Property numbering: No.#### or №####

#### Data Fields:
| Field | Example |
|-------|---------|
| Property Number | No.1013, №1068 |
| Location | 大島, 片島, 中央 |
| Type | 貸家・売家, 売物件 |
| Layout | 3K, 4DK, 5DK+納戸 |
| Price | 賃貸4千円/月, 売買50万円 |
| Features | ※新着※, ※移住者専用※ |

---

### 2.2 大月町空き家バンク (Otsuki Town, Kochi)
- **URL:** https://www.town.otsuki.kochi.jp/iju/info/akiya.php

### 2.3 本山町空き家バンク (Motoyama Town, Kochi)
- **URL:** https://www.town.motoyama.kochi.jp/soshikikarasagasu/seisakukikakuka/iju_teiju/427.html

### 2.4 佐川町空き家バンク (Sakawa Town, Kochi)
- **URL:** https://www.town.sakawa.lg.jp/life/dtl.php?hdnKey=1336
- **Pattern:** Query parameter-based (`?hdnKey={ID}`)

### 2.5 香南市空き家バンク (Konan City, Kochi)
- **URL:** https://www.city.kochi-konan.lg.jp/sumuzu/live/akiya-bank/index.html
- **Pattern:** Sequential property numbers (No.100, No.99, etc.)

---

## 3. Common URL Patterns Summary

### Pattern Type 1: Prefecture-Level Regional Sites
```
https://{region-name}-akiya.jp/
https://{region-name}-akiya.jp/housesearch/all/
https://{region-name}-akiya.jp/bukken/{id}/
```
Examples:
- 楽園信州: `rakuen-akiya.jp`
- 伊那地域: `ina-akiyabank.jp`

### Pattern Type 2: Municipal Custom Sites
```
https://www.city.{city-name}.{pref}.go.jp/akiya-bank/
https://www.town.{town-name}.{pref}.go.jp/iju/info/akiya.php
```

### Pattern Type 3: Akiya at Home Subdomains
```
https://{city-name}-c{jis}.akiya-athome.jp/
https://{town-name}-t{jis}.akiya-athome.jp/
https://{village-name}-v{jis}.akiya-athome.jp/
https://{code}.akiya-athome.jp/bukken/detail/buy/{property-id}
```

### Pattern Type 4: Prefecture Portal Sites
```
https://www.pref.{pref-name}.lg.jp/iju/sangyo/iju/akiya/
https://{pref-name}-iju.jp/house/
```
Examples:
- 高知家で暮らす: `kochi-iju.jp/house/`

---

## 4. Data Fields Analysis

### Core Fields (Present in >90% of sites)
1. **Property ID** - Unique identifier
2. **Property Type** - House, land, rental, sale
3. **Price** - Sale price or monthly rent
4. **Address** - Location including prefecture, city, district
5. **Layout** - Floor plan (e.g., 3DK, 2LDK)
6. **Building Age** - Year of construction
7. **Images** - Photo gallery
8. **Contact Information** - Real estate agency or city office

### Common Optional Fields
1. **Land Area** (土地面積) - m²
2. **Building Area** (建物面積) - m²
3. **Transportation** - Nearest station, walking time
4. **Features/Tags** - Special attributes
5. **Last Updated** - Information freshness
6. **School District** - For families
7. **Parking** - Availability
8. **Structure Type** - Wood, steel, etc.

### Feature Tags Observed
- 家庭菜園・畑付き (With garden/farm)
- ペット可 (Pet-friendly)
- 古民家風 (Traditional style)
- 温泉付き・温泉地 (Onsen/hot spring)
- 山が見える (Mountain view)
- 生活が便利 (Convenient location)
- 市町村空き家バンク登録物件 (Municipal registered)
- 週末暮らし物件 (Weekend home)

---

## 5. API and Data Feed Observations

### No Public APIs Found
- No municipalities offer public REST APIs
- No JSON/XML feeds discovered
- All data access requires HTML scraping

### Potential Data Sources
1. **RSS Feeds:** Some sites offer RSS for new listings
   - Example: `https://rakuen-akiya.jp/feed/`

2. **PDF Export:** Property details exportable as PDF
   - Example: `/pdf/pdf_bdata.php?bdata_id={ID}`

3. **CSV/Excel:** Some municipalities provide downloadable lists
   - Typically found on "Statistics" or "Data" pages

---

## 6. Regional Coverage Summary

### Nagano Prefecture (20)
- 楽園信州空き家バンク (Regional aggregator)
- 長野市空き家バンク
- 伊那地域空き家バンク
- 飯田市空き家バンク
- 安曇野市空き家バンク
- 飯山市空き家バンク
- 上田市, 茅野市, 佐久市, etc.

### Kochi Prefecture (Selected)
- 宿毛市空き家バンク
- 大月町空き家バンク
- 本山町空き家バンク
- 佐川町空き家バンク
- 香南市空き家バンク
- 室戸市 (むろとに住んでみる？)

### Akita Prefecture (18 municipalities on Akiya at Home)
- 秋田市, 能代市, 横手市, 大館市, etc.

### Aomori Prefecture (34 municipalities on Akiya at Home)
- 青森市, 弘前市, 八戸市, etc.

### Tottori/Shimane
- Available through アットホーム空き家バンク

---

## 7. Technical Recommendations for Scraping

### Approach 1: Akiya at Home (Recommended for breadth)
- **Pros:** Standardized structure, 894 municipalities, consistent HTML
- **Cons:** Subdomain-per-municipality requires crawling
- **Strategy:**
  1. Parse government list page for all subdomains
  2. Crawl each subdomain for property listings
  3. Extract detail pages using consistent selectors

### Approach 2: Regional Platforms (Recommended for depth)
- **Pros:** Rich feature data, additional metadata, regional context
- **Cons:** Custom HTML structure per platform
- **Targets:**
  - 楽園信州 (Nagano)
  - Similar regional portals in other prefectures

### Approach 3: Municipal Direct Sites
- **Pros:** Most detailed information, direct contact
- **Cons:** Highly variable structures, maintenance burden
- **Use case:** Specific high-value municipalities only

---

## 8. Data Quality Observations

### Strengths
- Consistent address formatting
- Standardized property type classification
- Image galleries common
- Regular updates (date stamps visible)

### Challenges
- Price sometimes listed as "要相談" (negotiable)
- Building age sometimes "不詳" (unknown)
- Area measurements not always available
- Feature tags not standardized across sites

---

## 9. Sample Property Data Structure

```json
{
  "property_id": "420374",
  "source": "rakuen-akiya.jp",
  "property_type": "貸家",
  "listing_type": "rental",
  "address": {
    "prefecture": "長野県",
    "city": "松本市",
    "district": "波田",
    "detail": "三溝１４３２－１"
  },
  "price": {
    "monthly_rent": 3.8,
    "currency": "JPY",
    "unit": "万円/月"
  },
  "layout": "3DK",
  "building_age": "1983-03",
  "features": ["家庭菜園・畑付き", "ペット可"],
  "agency": {
    "name": "アジア不動産（株）",
    "phone": "0263-86-7822"
  },
  "last_updated": "2026-03-06",
  "urls": {
    "detail": "https://rakuen-akiya.jp/bukken/420374/",
    "images": [
      "https://rakuen-akiya.jp/img/bukken/13/420374-BLVTndnnQX.jpg"
    ]
  }
}
```

---

## 10. Next Steps for Akiya Japan App

1. **Prioritize Akiya at Home** for nationwide coverage
2. **Integrate 楽園信州** for Nagano depth
3. **Target specific municipalities** in Kochi, Akita, Aomori for direct partnerships
4. **Consider RSS monitoring** for new listing alerts
5. **Design schema** to accommodate variable field availability

---

## Appendix: Municipal Akiya Bank URLs by Region

### Nagano
| Municipality | URL |
|--------------|-----|
| Nagano Prefecture (Regional) | https://rakuen-akiya.jp/ |
| Nagano City | https://nagano-akiyabank.jp/ |
| Ina Region | https://www.ina-akiyabank.jp/ |
| Iida City | https://www.city.iida.lg.jp/site/akiyabank/ |
| Azumino City | https://azumino-ijyu.jp/list/ |
| Iiyama City | https://furusato-iiyama.net/akiyabank/ |

### Kochi
| Municipality | URL |
|--------------|-----|
| Sukumo City | https://www.city.sukumo.kochi.jp/akiya-bank/top.html |
| Otsuki Town | https://www.town.otsuki.kochi.jp/iju/info/akiya.php |
| Motoyama Town | https://www.town.motoyama.kochi.jp/soshikikarasagasu/seisakukikakuka/iju_teiju/427.html |
| Sakawa Town | https://www.town.sakawa.lg.jp/life/dtl.php?hdnKey=1336 |
| Konan City | https://www.city.kochi-konan.lg.jp/sumuzu/live/akiya-bank/index.html |

### Akita (via Akiya at Home)
| Municipality | URL |
|--------------|-----|
| Akita City | https://akita-c05201.akiya-athome.jp |
| Noshiro City | https://noshiro-c05202.akiya-athome.jp |
| Yokote City | https://yokote-c05203.akiya-athome.jp |
| Odate City | http://odate-c05204.akiya-athome.jp |

---

*End of Report*
