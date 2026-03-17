# Japanese Real Estate Auction & Foreclosure Sites Research Report

**Date:** March 17, 2026  
**Research Focus:** Akiya ( vacant house) properties through auction and foreclosure channels  
**Target Audience:** Akiya Japan app development

---

## Executive Summary

This report documents major Japanese real estate auction (競売 - *keibai*), foreclosure, and REO (Real Estate Owned) sites that may provide cheap akiya (vacant/abandoned house) properties. Japan's aging population and rural depopulation have created a significant akiya problem, with over 8 million vacant homes nationwide. Auction and foreclosure properties often represent the most deeply discounted opportunities.

---

## 1. Court Auction Sites (不動産競売 - Fudosan Keibai)

### 1.1 KEIBAI.JP (keibai.jp)
- **Type:** Court auction information aggregator
- **Access:** Free browsing, subscription for detailed data
- **Coverage:** Nationwide (1都市7県 focus for Tokyo metro area)
- **Property Types:** Residential, commercial, land, mixed-use
- **Price Range:** 
  - Land only: ¥80,000 - ¥100M+
  - Residential: ¥5M - ¥1B+
  - Sample: 7 tsubo pathway in Yokohama - ¥80,000 base price
  - Sample: 5-story commercial building in Hiratsuka - ¥300M+ bid
- **Key Features:**
  - Statistical reports on auction trends
  - Individual property case studies
  - Bid results and winning bid analysis
  - Maps and location details
- **API Availability:** Unknown - likely screen scraping only
- **Akiya Relevance:** Medium - mostly urban/bank foreclosure properties

### 1.2 Court Auction Direct (裁判所競売)
- **Official Source:** Japanese court system
- **Access:** saibanin.courts.go.jp (for bidding registration)
- **Process:** 
  - Registration with courts required
  - Bid bond (保証金) typically 20% of bid price
  - In-person or online bidding
- **Key Characteristics:**
  - Sold "as-is" (現状有姿)
  - No warranty
  - May have occupants/tenants
  - Tax delinquency issues common
- **Price Range:** 30-70% below market value
- **Akiya Relevance:** HIGH - many rural properties with deferred maintenance

---

## 2. Bank REO Listings (担保不動産 - Tanpo Fudosan)

### 2.1 Major Bank Real Estate Portals

#### **MUFJ (Mitsubishi UFJ Financial Group)**
- **URL:** www.mufg.jp
- **Access:** Public listings, bank customer priority
- **Property Types:** Residential, commercial, development land
- **Notes:** REO properties from defaulted loans
- **API:** No public API known

#### **SMBC (Sumitomo Mitsui Banking Corporation)**
- **URL:** www.smbc.co.jp
- **Special Programs:** 
  - Housing loan support for REO purchases
  - Step-up program for auction properties
- **Property Types:** Primarily residential
- **Notes:** 50+ years in real estate, extensive portfolio

#### **Mizuho Bank**
- **URL:** www.mizuhobank.co.jp
- **Services:** Financing for auction/REO purchases
- **Notes:** Provides loans for keibai property acquisition

### 2.2 Regional Banks & Credit Unions
- Most regional banks maintain REO listings
- Often more rural/akiya properties
- Contact individual branches for inventory

---

## 3. Vacant House Banks (空き家バンク - Akiya Bank)

### 3.1 Akiya at Home (akiya-athome.jp) ⭐ PRIMARY RESOURCE
- **Operator:** At Home Co., Ltd. (major real estate portal)
- **Coverage:** 1,100+ municipalities, 11,000+ properties
- **Access:** Free search, direct contact with municipalities
- **Property Types:**
  - Vacant houses (空き家)
  - Farmland with residences (農地付き)
  - Traditional homes (古民家)
  - Renovated properties
  - Island properties (島暮らし)
  - Hot spring area properties (温泉地域)
- **Price Range:** 
  - ¥0 (free transfer) - ¥50M
  - Many properties under ¥1M
  - "Under 1 million yen" (100万円以下) special collection
- **Key Features:**
  - Direct municipal listings
  - Regional promotion videos
  - Local event information
  - Trial residency programs (おためし移住)
  - Regional revitalization coordinator info
- **Special Collections:**
  - 100万円以下 (Under ¥1M)
  - 古民家 (Traditional homes)
  - ペット可 (Pet-friendly rentals)
  - 田舎暮らし (Country living)
- **API Availability:** Unknown - possible partnership opportunity

### 3.2 Local Government Akiya Banks
- Over 1,100 municipalities operate akiya banks
- Properties often priced at ¥0 - ¥5M
- May include subsidies for renovation
- Contact individual city/town halls

---

## 4. Tax Delinquent Property Sales (不動産公売 - Fudosan Kosai)

### 4.1 Municipal Public Sales
- **Conducted by:** Local governments for unpaid property taxes
- **Timing:** Irregular, announced in local papers
- **Access:** Municipal websites, public notices
- **Price Range:** Often 50-80% below assessed value
- **Akiya Relevance:** HIGH - many long-vacant properties

### 4.2 National Tax Agency Sales
- For national tax delinquencies
- Less frequent, higher value properties
- Published on NTA website

---

## 5. General Real Estate Portals (with auction/REO sections)

### 5.1 HOMES (homes.co.jp)
- **Operator:** LIFULL
- **Coverage:** Nationwide
- **Features:** Search by price, location, property type
- **Akiya Search:** Filter by price range, rural areas

### 5.2 CHINTAI (chintai.net)
- **Focus:** Primarily rental
- **Note:** Some auction/REO sales listings

### 5.3 Mitsui Rehouse (rehouse.co.jp)
- **Operator:** Mitsui Fudosan Realty
- **Stats:** 39 consecutive years #1 in transactions
- **Coverage:** Nationwide
- **Features:** Premium properties, urban focus

---

## 6. Price Analysis Summary

| Channel | Typical Discount | Price Range | Rural Availability |
|---------|-----------------|-------------|-------------------|
| Court Auction (Keibai) | 30-50% | ¥5M - ¥1B+ | Low |
| Bank REO | 20-40% | ¥10M - ¥100M | Medium |
| Akiya Bank | 80-100% (some free) | ¥0 - ¥10M | HIGH |
| Tax Delinquent Sale | 50-80% | ¥1M - ¥50M | HIGH |
| Foreclosure | 40-60% | ¥5M - ¥500M | Medium |

---

## 7. API & Data Feed Assessment

### Confirmed APIs: None identified

### Potential Integration Approaches:
1. **Screen Scraping** - Most sites block or limit scraping
2. **RSS Feeds** - Some sites offer RSS for new listings
3. **Manual Partnership** - Contact operators for data sharing
4. **User Submissions** - Crowdsource akiya discoveries

### Recommended Priority for API Development:
1. **akiya-athome.jp** - Most comprehensive akiya data
2. **keibai.jp** - Auction statistics and results
3. **Individual municipal akiya banks** - Direct partnerships

---

## 8. Access Methods for Foreign Buyers

### Requirements:
- Japanese bank account
- Registered seal (印鑑 - inkan)
- Residence certificate (住民票 - juminhyo) or代理人
- Bid bond capability (typically 20%)

### Challenges:
- Language barrier
- Legal complexity
- Occupant eviction risks
- Hidden liabilities (taxes, liens)

### Recommended Support:
- Judicial scrivener (司法書士 - shiho shoshi)
- Real estate agent specializing in auctions
- Tax accountant for liability verification

---

## 9. Key Insights for Akiya App

### Opportunities:
1. **akiya-athome.jp** aggregates 11,000+ municipal properties
2. Rural properties increasingly available for ¥0 transfer
3. Renovation subsidies available in many municipalities
4. Trial residency programs reduce risk for buyers

### Gaps in Current Market:
1. No unified API for akiya data
2. Limited English-language resources
3. Complex legal process for foreign buyers
4. No standardized property condition reporting

### Recommended App Features:
1. **Map integration** with akiya bank locations
2. **Price alerts** for new auction listings
3. **Renovation cost estimator**
4. **Municipal subsidy database**
5. **Legal support marketplace**
6. **Community forums** for rural living

---

## 10. Site Contact List

| Site | URL | Type | Priority |
|------|-----|------|----------|
| Akiya at Home | akiya-athome.jp | Vacant house bank | HIGH |
| KEIBAI.JP | keibai.jp | Court auction info | HIGH |
| MUFG | mufg.jp | Bank REO | Medium |
| SMBC | smbc.co.jp | Bank REO | Medium |
| Mizuho | mizuhobank.co.jp | Bank REO | Medium |
| HOMES | homes.co.jp | General portal | Medium |
| MLIT | mlit.go.jp | Policy/Regulation | Reference |

---

## Appendix: Japanese Terminology

| Term | Reading | Meaning |
|------|---------|---------|
| 競売 | Keibai | Court auction |
| 空き家 | Akiya | Vacant house |
| 不動産 | Fudosan | Real estate |
| 公売 | Kosai | Public sale |
| 担保 | Tanpo | Collateral |
| 田舎暮らし | Inakagurashi | Country living |
| 古民家 | Kominka | Traditional house |
| 農地付き | Nochitsuki | With farmland |

---

*Report compiled for Akiya Japan app research. Data current as of March 2026.*
