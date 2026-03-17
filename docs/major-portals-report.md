# Major Japanese Real Estate Portals Research Report

## Research Date: March 16, 2026

---

## 1. YAHOO!不動産 (realestate.yahoo.co.jp)

### Overview
- **Operator**: LY Corporation (Line Yahoo)
- **Type**: General real estate portal (not specialized for akiya)
- **Akiya Focus**: Limited - no dedicated akiya bank section

### Search Filters Available
- Property type: 新築マンション, 中古マンション, 新築一戸建て, 中古一戸建て, 土地, 賃貸住宅
- Region/Area selection
- Price range
- Detailed conditions (詳細条件)

### URL Patterns
- Main: `https://realestate.yahoo.co.jp/`
- Used houses: `https://realestate.yahoo.co.jp/used/house/`
- By region: `https://realestate.yahoo.co.jp/used/house/03/13/` (03=region, 13=Tokyo)
- By city: `https://realestate.yahoo.co.jp/used/house/search/06/28/28201/`
- Listing detail: `https://realestate.yahoo.co.jp/new/mansion/dtl/00156496/`

### API Access
- **Status**: No public API found for akiya/vacant home data
- **Data Feed**: Not available for general use
- **Note**: Yahoo!不動産 does not have a dedicated akiya bank integration

### Data Fields (Standard Listings)
- Property name
- Price
- Location (address, station access)
- Property type
- Layout (間取り)
- Images
- Contact information

### Akiya/Vacant Home Search
- No specific "空き家" (akiya) search filter
- Users must search general listings and filter manually
- Limited akiya-specific content

---

## 2. SUUMO (suumo.jp)

### Overview
- **Operator**: Recruit (LIFULL Connect subsidiary)
- **Type**: General real estate portal (largest in Japan by property count)
- **Akiya Focus**: Limited - no dedicated akiya bank section

### Search Filters Available
- Property types: 新築マンション, 中古マンション, 新築一戸建て, 中古一戸建て, 土地, 賃貸
- Area/region search
- Station-based search
- Keyword search

### URL Patterns
- Main: `https://suumo.jp/`
- Used houses: `https://suumo.jp/chukoikkodate/`
- New houses: `https://suumo.jp/ikkodate/`
- Land: `https://suumo.jp/tochi/`
- By prefecture: `https://suumo.jp/tokyo/`

### API Access - LIFULL Connect
- **Program**: LIFULL Connect API (formerly Recruit Web Service)
- **Status**: Partnership required
- **Documentation**: `https://lifullconnect.com/partners/`
- **Access**: Application-based approval required
- **Data Available**: Property listings, images, details
- **Cost**: Commercial partnership terms

### Partnership Requirements
- Business registration required
- API usage agreement
- Technical integration review
- Revenue share or licensing fees may apply

### Data Fields (Standard Listings)
- Property ID
- Property name/type
- Price
- Location (address, nearest station, access time)
- Property specifications (size, age, layout)
- Images
- Real estate company information

### Akiya/Vacant Home Search
- No specific akiya bank section
- Can search for 中古一戸建て (used houses) with price filters
- Keywords like "古家" (old house) or "空き家" can be used in free text search

---

## 3. LIFULL HOMES (lifull-homes.co.jp)

### Overview
- **Operator**: LIFULL Co., Ltd.
- **Type**: Dedicated Akiya Bank portal (specialized for vacant homes)
- **Akiya Focus**: HIGH - Specialized service

### Akiya Bank Statistics
- **Total Properties**: 8,318 listings
- **Participating Municipalities**: 780
- **Government Partnership**: Ministry of Land, Infrastructure, Transport and Tourism (MLIT) model project

### URL Patterns
- Main Akiya Bank: `https://www.homes.co.jp/akiyabank/`
- By region: `https://www.homes.co.jp/akiyabank/tohoku/iwate/`
- By prefecture: `https://www.homes.co.jp/akiyabank/iwate/`
- By municipality: `https://www.homes.co.jp/akiyabank/iwate/morioka/`
- Property detail: `https://www.homes.co.jp/akiyabank/b-46585/`

### Search Filters
1. **Property Type**:
   - 売買居住用 (Sale - Residential)
   - 売買土地 (Sale - Land)
   - 売買事業用 (Sale - Commercial)
   - 賃貸居住用 (Rental - Residential)
   - 賃貸土地 (Rental - Land)
   - 賃貸事業用 (Rental - Commercial)

2. **Lifestyle Themes**:
   - 自然に囲まれた暮らし (Nature surrounded)
   - 山が見える暮らし (Mountain view)
   - 海が見える暮らし (Sea view)
   - 暖かい場所で暮らす (Warm climate)
   - 涼しい場所で暮らす (Cool climate)
   - 子どもと暮らす (Child-friendly)
   - 農のある暮らし (With farming)
   - テレワーク (Telework suitable)
   - お一人様の移住 (Single person relocation)
   - 車を持たない移住 (Car-free living)
   - 小商いをやりたい (Small business)

3. **Price Ranges**:
   - 応相談 (Negotiable)
   - 0〜100万円 (0-1M yen)
   - 101万円〜300万円
   - 301万円〜500万円
   - 501万円〜800万円
   - 801万円〜1,000万円
   - 1,001万円〜2,000万円
   - 2,001万円〜3,000万円
   - 3,001万円〜

4. **Special Features**:
   - 農地付き物件 (With farmland)
   - 店舗付き物件 (With shop)
   - 公的不動産 (Public real estate)

### Data Fields Available (Listing Detail)
- Property ID (物件番号)
- Property type (種別)
- Price (価格/賃料)
- Location (所在地) - Full address
- Land area (土地面積) in m²
- Building area (建物面積) - when applicable
- Structure (構造)
- Year built (築年数)
- Layout (間取り)
- Images (外観, 間取り, 内装)
- Description/Points (Point)
- Tags (lifestyle themes)
- Municipality contact information

### API Access
- **Status**: No public API documented
- **Data Source**: Municipal government feeds
- **Alternative**: Partnership through LIFULL Connect

### Related Services
- LIFULL 地方創生 (Regional Revitalization): `http://local.lifull.jp/`
- Case study database: `https://www.homes.co.jp/akiyabank/case-study/`

---

## 4. AtHome Akiya Bank (akiya-athome.jp)

### Overview
- **Operator**: At Home Co., Ltd.
- **Type**: Dedicated Akiya Bank portal
- **Akiya Focus**: HIGH - Specialized service

### Akiya Bank Statistics
- **Total Properties**: 11,037 listings
- **Participating Municipalities**: 894
- **Properties for Sale**: 9,697
- **Properties for Rent**: 1,340

### URL Patterns
- Main: `https://www.akiya-athome.jp/`
- Buy listings: `https://www.akiya-athome.jp/buy/`
- By prefecture: `https://www.akiya-athome.jp/buy/01/` (01=Hokkaido)
- Search by area: `https://www.akiya-athome.jp/bukken/search/index/?search_type=area&br_kbn=buy&sbt_kbn=house`
- Municipality page: `https://[city]-t[citycode].akiya-athome.jp`
- Property detail: `https://kirishima-c46218.akiya-athome.jp/bukken/detail/buy/45249`

### Search Filters
1. **Property Types**:
   - 空き家を買いたい (Buy vacant house)
   - 空き地を買いたい (Buy vacant land)
   - マンションを買いたい (Buy condominium)
   - 事業・投資物件を買いたい (Buy commercial/investment)
   - 空き家を借りたい (Rent vacant house)
   - 事業用物件を借りたい (Rent commercial)

2. **Search Methods**:
   - 地域から探す (By area)
   - 沿線から探す (By train line)
   - 地図から探す (By map)

### Special Features
- **100万円以下特集** (Under 1M yen feature)
- **古民家特集** (Old folk house feature)
- **農地付き特集** (With farmland feature)
- **田舎暮らし特集** (Country living feature)
- **島暮らし特集** (Island living feature)
- **温泉地域特集** (Hot spring area feature)

### Data Fields Available
- Property ID
- Property type
- Price/Rent
- Location (prefecture, city, address)
- Property size (m²)
- Distance to nearest station
- Images
- Property description
- Contact information

### API Access
- **Status**: No public API found
- **Data Source**: Municipal government partnerships

---

## 5. Data Comparison Summary

| Portal | Akiya Focus | Listings | Municipalities | API Access | Free Access |
|--------|-------------|----------|----------------|------------|-------------|
| Yahoo!不動産 | Low | N/A | N/A | No | Yes |
| SUUMO | Low | N/A | N/A | Partnership | Yes |
| LIFULL HOMES | High | 8,318 | 780 | No | Yes |
| AtHome Akiya | High | 11,037 | 894 | No | Yes |

---

## 6. API Integration Feasibility

### LIFULL Connect (SUUMO/LIFULL HOMES)
- **Feasibility**: Medium
- **Requirements**: Business entity, partnership agreement
- **Timeline**: Weeks to months for approval
- **Cost**: Commercial terms (revenue share or licensing)

### Direct Scraping
- **Feasibility**: Technically possible
- **Legal Concerns**: Check robots.txt and terms of service
- **Yahoo!不動産**: `robots.txt` - Check before scraping
- **LIFULL HOMES**: `robots.txt` - Check before scraping
- **AtHome**: Check terms of service

### Government Data Sources
- **国土交通省 (MLIT)**: National akiya bank data
- **Open Data**: Some municipalities provide open data
- **Standardization**: Varies by municipality

---

## 7. Recommendations for Akiya Japan App

### Short Term
1. **AtHome Akiya Bank**: Largest database (11,037 properties), good for initial data
2. **LIFULL HOMES Akiya Bank**: Second largest (8,318 properties), lifestyle filters useful

### Medium Term
1. **LIFULL Connect API**: Apply for partnership for programmatic access
2. **Direct Municipal Partnerships**: Connect directly to municipality APIs where available

### URL Pattern Summary for Scraping
```
LIFULL HOMES:
- List by prefecture: /akiyabank/[region]/[prefecture]/?page=N
- Detail: /akiyabank/b-[id]/

AtHome:
- List by prefecture: /buy/[prefecture_code]/
- Detail: /bukken/detail/buy/[id]

Yahoo!不動産:
- List: /used/house/search/[region]/[prefecture]/[city]/
- Detail: /used/house/dtl/[id]/

SUUMO:
- List: /chukoikkodate/[area]/
- Detail: /chukoikkodate/Detail?bknid=[id]
```

---

## 8. Notes on Data Fields

### Common Fields Across Portals
- Property ID
- Property type
- Price/Rent
- Location (Address, Prefecture, City)
- Land area (m²)
- Images

### Unique Fields by Portal
**LIFULL HOMES**:
- Lifestyle theme tags
- Municipality features
- Support programs

**AtHome**:
- Detailed property descriptions
- Owner guides
- Relocation guides

**Yahoo!不動産/SUUMO**:
- Station proximity
- Real estate company info
- Review/ratings

---

*Report generated: March 16, 2026*
