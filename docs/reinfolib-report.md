# REINFOLIB MLIT API Research Report

## Overview
**REINFOLIB** (不動産情報ライブラリ - Real Estate Information Library) is the Ministry of Land, Infrastructure, Transport and Tourism (MLIT) real estate data portal providing access to property transaction data, land prices, disaster prevention information, urban planning data, and surrounding facility information.

**Portal URL:** https://www.reinfolib.mlit.go.jp

---

## 1. API Access Information

### API Key Application (APIキー発行)

To use the REINFOLIB API, you must apply for an API key:

**Application URL:** https://www.reinfolib.mlit.go.jp/api/request/

**Required Information:**
- User type (法人/Corporation, 法人以外の団体/Non-corporate organization, 個人/Individual)
- Contact person name (担当者氏名)
- Email address (メールアドレス)
- Corporation name (法人名) - if applicable
- Corporation number (法人番号) - 13 digits, if applicable
- Affiliation (所属)
- Address (所在地)
- Purpose of use (利用目的):
  - Data-driven service development (データを活用したサービスの開発・提供)
  - Research using data (データを活用した調査・研究)
  - Other (そのほか)
- Agreement to terms of use (利用約款に同意)
- Confirmation of not being an anti-social force (反社会的勢力に該当しません)

**Processing Time:**
- Review results are sent via email within approximately **5 business days** (5営業日)

---

## 2. Authentication

### API Key Header
Once approved, include your API key in the request header:

```
Ocp-Apim-Subscription-Key: {YOUR_API_KEY}
```

### HTTPS Required
All API requests must use HTTPS. Do not send API requests from browsers to avoid CORS errors.

---

## 3. Available APIs

### Price Information APIs

| ID | Name | Description | Data Range |
|----|------|-------------|------------|
| **XIT001** | Real Estate Price (Transaction/Contract Price) Information API | 不動産価格（取引価格・成約価格）情報取得API | Transaction prices from Q3 2005; Contract prices from Q1 2021 |
| **XCT001** | Real Estate Appraisal Report Information API | 鑑定評価書情報API | Last 5 years of appraisal reports |
| **XPT001** | Real Estate Price Points API | 不動産価格（取引価格・成約価格）情報のポイント (点) API | Same as XIT001 |
| **XPT002** | Land Price Publication/Research Points API | 地価公示・地価調査のポイント (点) API | Published land prices from 1995; Research prices from 1997 |

### Municipal Information APIs

| ID | Name | Description |
|----|------|-------------|
| **XIT002** | Municipalities List API | 都道府県内市区町村一覧取得API - Returns list of cities/towns in a prefecture |

### Urban Planning APIs

| ID | Name | Description |
|----|------|-------------|
| **XKT001** | Urban Planning Area/District GIS Data API | 都市計画決定GISデータ（都市計画区域/区域区分）API |
| **XKT002** | Land Use District GIS Data API | 都市計画決定GISデータ（用途地域）API |
| **XKT003** | Location Optimization Plan GIS Data API | 都市計画決定GISデータ（立地適正化計画）API |
| **XKT014** | Fire/Quasi-Fire District GIS Data API | 都市計画決定GISデータ（防火・準防火地域）API |
| **XKT023** | District Plan GIS Data API | 都市計画決定GISデータ（地区計画）API |
| **XKT024** | High-Density District GIS Data API | 都市計画決定GISデータ（高度利用地区）API |
| **XKT030** | Urban Planning Road GIS Data API | 都市計画決定GISデータ（都市計画道路）API |

### Surrounding Facilities APIs

| ID | Name | Description |
|----|------|-------------|
| **XKT004** | Elementary School District API | 国土数値情報（小学校区）API |
| **XKT005** | Junior High School District API | 国土数値情報（中学校区）API |
| **XKT006** | Schools API | 国土数値情報（学校）API |
| **XKT007** | Nurseries/Kindergartens API | 国土数値情報（保育園・幼稚園等）API |
| **XKT010** | Medical Institutions API | 国土数値情報（医療機関）API |
| **XKT011** | Welfare Facilities API | 国土数値情報（福祉施設）API |
| **XKT017** | Libraries API | 国土数値情報（図書館）API |
| **XKT018** | City Hall/Assembly Facilities API | 国土数値情報（市区町村役場及び集会施設等）API |
| **XKT019** | Natural Park Areas API | 国土数値情報（自然公園地域）API |

### Population/Demographic APIs

| ID | Name | Description |
|----|------|-------------|
| **XKT013** | Future Population 250m Mesh API | 国土数値情報（将来推計人口250mメッシュ）API |
| **XKT015** | Station Passenger Volume API | 国土数値情報（駅別乗降客数）API |
| **XKT031** | Population Concentration Areas API | 国土数値情報（人口集中地区）API |

### Disaster Prevention APIs

| ID | Name | Description |
|----|------|-------------|
| **XKT016** | Disaster Hazard Areas API | 国土数値情報（災害危険区域）API |
| **XKT020** | Large-Scale Embankment Map API | 国土数値情報（大規模盛土造成地マップ）API |
| **XKT021** | Landslide Prevention Areas API | 国土数値情報（地すべり防止地区）API |
| **XKT022** | Steep Slope Collapse Hazard Areas API | 国土数値情報（急傾斜地崩壊危険区域）API |
| **XKT025** | Liquefaction Occurrence Tendency Map API | 国土交通省都市局（地形区分に基づく液状化の発生傾向図）API |
| **XKT026** | Flood Inundation Assumed Areas API | 国土数値情報（洪水浸水想定区域（想定最大規模））API |
| **XKT027** | Storm Surge Inundation Assumed Areas API | 国土数値情報（高潮浸水想定区域）API |
| **XKT028** | Tsunami Inundation Assumed Areas API | 国土数値情報（津波浸水想定）API |
| **XKT029** | Sediment Disaster Warning Areas API | 国土数値情報（土砂災害警戒区域）API |
| **XGT001** | Designated Emergency Evacuation Sites API | 国土地理院GISデータ（指定緊急避難場所）API |
| **XST001** | Disaster History API | 国土調査（災害履歴）API |

---

## 4. Data Formats

The APIs support two output formats:

### PBF (Protocol Buffer Binary Format)
- Binary vector tile format
- Small data size, fast transfer
- Ideal for WebGIS tile rendering
- Can be imported into GIS tools (QGIS/MapLibre)

### GeoJSON
- JSON format for easy data processing/analysis
- Supports dynamic style control (color, selection)
- Can be imported into GIS tools (QGIS/MapLibre)

**Note:** Output is gzip-encoded and may require client-side decoding.

---

## 5. Akiya (Vacant Home) Data Availability

**IMPORTANT FINDING:** REINFOLIB does **NOT** provide specific akiya (空き家/vacant home) data through its APIs. 

The available data that could be relevant for akiya research includes:

1. **Real Estate Transaction Data (XIT001/XPT001)** - Shows property transactions which could indicate market activity in rural areas
2. **Land Price Data (XPT002/XCT001)** - Shows land values which may correlate with vacant properties
3. **Population Data (XKT013/XKT031)** - Shows population decline areas which often correlate with akiya concentration
4. **Disaster Risk Data (Multiple XKT APIs)** - Important for evaluating akiya properties

**For dedicated akiya data**, you may need to:
- Contact individual municipalities directly
- Use the "Akiya Bank" (空き家バンク) systems maintained by local governments
- Consider other data sources like the National Land Image Database

---

## 6. Rate Limits

The terms of service do **NOT specify exact rate limits** in the documentation reviewed. However, the API Terms of Use state:

- The provider may restrict or stop API access if inappropriate use is detected
- API keys may be suspended after 3 years of inactivity
- The provider may conduct surveys about API usage

**Best practices:**
- Implement reasonable request throttling in your application
- Cache responses when appropriate
- Contact MLIT if you anticipate high-volume usage

---

## 7. Credit Requirements

When using the API in a service, you must display the following credit:

> 「このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません」

Translation: "This service uses the API function of the Real Estate Information Library of the Ministry of Land, Infrastructure, Transport and Tourism, but the freshness, accuracy, completeness, etc. of the provided information are not guaranteed."

The credit must be displayed where end users can see it (no specific location required).

---

## 8. Terms of Use Highlights

### Allowed Uses
- Free use of the API and data
- Commercial and non-commercial applications
- Service development and research

### Prohibited Uses
- Uses that threaten national safety
- Violations of laws or public order
- Actions that interfere with API operation or third-party use
- Reverse engineering of systems
- Transferring API keys to third parties

### Attribution
When using content, cite the source as:
> 出典：国土交通省 不動産情報ライブラリ (https://www.reinfolib.mlit.go.jp/)

---

## 9. Sample API Request

### Base URL
```
https://www.reinfolib.mlit.go.jp/ex-api/external/{API_ID}?{parameters}
```

### Example: Get Real Estate Transaction Data (XIT001)
```bash
curl -H "Ocp-Apim-Subscription-Key:{YOUR_API_KEY}" \
     --compressed \
     "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?year=2015&quarter=2&city=13102&priceClassification=01"
```

### Parameters for XIT001:
| Parameter | Description | Example |
|-----------|-------------|---------|
| `priceClassification` | Price info type (01=transaction, 02=contract) | 01 |
| `year` | Transaction year (YYYY) | 2015 |
| `quarter` | Quarter (1-4) | 2 |
| `area` | Prefecture code (2 digits) | 13 |
| `city` | Municipality code (5 digits) | 13102 |
| `station` | Station code (6 digits) | - |
| `language` | Output language (ja/en) | ja |

**Note:** At least one of `area`, `city`, or `station` is required.

---

## 10. Key Data Fields (XIT001 Example)

| Field | Description |
|-------|-------------|
| `Type` | Transaction type (e.g., 宅地(土地と建物) = Residential land with building) |
| `Region` | Area type (e.g., 商業地 = Commercial, 住宅地 = Residential) |
| `Prefecture` | Prefecture name |
| `Municipality` | City/town name |
| `DistrictName` | District name |
| `TradePrice` | Transaction price (total) |
| `PricePerUnit` | Price per tsubo |
| `Area` | Area (square meters) |
| `UnitPrice` | Price per square meter |
| `FloorPlan` | Floor plan |
| `LandShape` | Land shape |
| `TotalFloorArea` | Total floor area |
| `BuildingYear` | Year built |
| `Structure` | Building structure (e.g., RC = Reinforced Concrete) |
| `Use` | Current use |
| `Purpose` | Future use purpose |
| `CityPlanning` | Urban planning designation |
| `CoverageRatio` | Building coverage ratio (%) |
| `FloorAreaRatio` | Floor area ratio (%) |
| `Period` | Transaction period |
| `Renovation` | Renovation status |
| `Remarks` | Transaction circumstances |
| `PriceCategory` | Price info category |

---

## 11. Municipality Code Lookup

To get municipality codes, use the XIT002 API or refer to:
- https://www.soumu.go.jp/denshijiti/code.html (Ministry of Internal Affairs)

Example prefecture codes:
- 01 = Hokkaido
- 13 = Tokyo
- 27 = Osaka
- 40 = Fukuoka

---

## 12. Recommendations for Akiya App

Since REINFOLIB does not have direct akiya data:

1. **Use transaction data (XIT001)** to identify low-activity areas
2. **Use population data (XKT013)** to find declining population areas
3. **Use land price data (XPT002)** to identify undervalued areas
4. **Use disaster risk data** to evaluate property safety
5. **Combine with other data sources** for akiya-specific listings
6. **Contact local municipalities** directly for akiya bank data

---

## 13. Resources

- **Portal:** https://www.reinfolib.mlit.go.jp
- **API Manual:** https://www.reinfolib.mlit.go.jp/help/apiManual/
- **API Application:** https://www.reinfolib.mlit.go.jp/api/request/
- **Terms of Use:** https://www.reinfolib.mlit.go.jp/help/termsOfUse/
- **Contact:** https://www.reinfolib.mlit.go.jp/help/contact/

---

*Research conducted: March 16, 2026*
*API Version: As documented on REINFOLIB portal*
