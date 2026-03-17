# Akiya Japan App - Final Integration Roadmap

**Document Date:** March 17, 2026  
**Purpose:** Comprehensive integration plan for all researched data sources

---

## 1. Executive Summary

This roadmap synthesizes research on **20+ data sources** into a phased integration plan for the Akiya Japan app.

### Data Source Summary

| Category | Sources | Est. Properties | Priority |
|----------|---------|-----------------|----------|
| Major Akiya Portals | 4 | ~200,000 | Phase 1 |
| Municipal Banks | 100+ | ~50,000 | Phase 2 |
| MLIT/Government Data | 5 | N/A (stats) | Phase 1-2 |
| Specialized/Niche | 8 | ~10,000 | Phase 3 |
| Regional/Local | 50+ | ~20,000 | Phase 3-4 |

**Total Addressable Properties:** ~280,000+

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AKIYA JAPAN APP                              │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Mobile/Web)                                          │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  ├── Property Search API                                        │
│  ├── User Management API                                        │
│  └── Analytics API                                              │
├─────────────────────────────────────────────────────────────────┤
│  Data Integration Layer                                         │
│  ├── Scrapers (Puppeteer/Playwright)                           │
│  ├── API Connectors (REST/GraphQL)                             │
│  ├── File Processors (CSV/Excel/GIS)                           │
│  └── Queue System (Bull/BullMQ)                                │
├─────────────────────────────────────────────────────────────────┤
│  Data Storage                                                   │
│  ├── PostgreSQL (Primary DB)                                    │
│  ├── PostGIS (Geographic data)                                  │
│  ├── Redis (Cache/Queue)                                        │
│  └── S3/MinIO (Images/Documents)                                │
├─────────────────────────────────────────────────────────────────┤
│  External Data Sources                                          │
│  ├── AtHome Akiya Bank                                          │
│  ├── LIFULL HOMES                                               │
│  ├── REINFOLIB MLIT                                             │
│  ├── e-Stat                                                     │
│  ├── Municipal Akiya Banks                                      │
│  └── [Additional sources...]                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: Foundation (Months 1-3)

### 3.1 Core Infrastructure

**Tasks:**
- [ ] Set up PostgreSQL with PostGIS extension
- [ ] Implement Redis for caching and job queues
- [ ] Set up S3-compatible storage for images
- [ ] Deploy message queue system (BullMQ)
- [ ] Create base scraper framework (Puppeteer)

**Deliverables:**
- Infrastructure ready for data ingestion
- Scraper framework with retry logic
- Database schema for properties

### 3.2 Primary Data Sources

#### 3.2.1 AtHome Akiya Bank (Highest Priority)

**Source:** https://www.akiya-athome.jp/

**Stats:**
- 11,037 listings
- 894 municipalities
- 9,697 for sale / 1,340 for rent

**Integration Approach:**
```typescript
// Scraper Architecture
interface AtHomeScraper {
  // List pages: /buy/[prefecture_code]/
  listUrl: string;
  
  // Detail pages: /bukken/detail/buy/[id]
  detailUrl: string;
  
  // Pagination support
  pagination: boolean;
  
  // Rate limiting
  delayMs: 2000;
}
```

**Data Fields to Extract:**
- Property ID
- Price/Rent
- Location (prefecture, city, address)
- Property type
- Land area (m²)
- Building area (m²)
- Year built
- Images (URLs)
- Description
- Contact information

**Update Frequency:** Daily

#### 3.2.2 LIFULL HOMES Akiya Bank

**Source:** https://www.homes.co.jp/akiyabank/

**Stats:**
- 8,318 listings
- 780 municipalities

**Integration Approach:**
```typescript
interface LifullScraper {
  // List pages: /akiyabank/[region]/[prefecture]/?page=N
  listUrl: string;
  
  // Detail pages: /akiyabank/b-[id]/
  detailUrl: string;
  
  // Lifestyle tags (unique to LIFULL)
  tags: string[];
}
```

**Unique Data Fields:**
- Lifestyle theme tags (自然に囲まれた暮らし, etc.)
- Municipality features
- Support programs

**Update Frequency:** Daily

### 3.3 Government Data Integration

#### 3.3.1 REINFOLIB MLIT API

**Source:** https://www.reinfolib.mlit.go.jp/

**Implementation:**
1. Apply for API key
2. Implement XIT001 (Real Estate Price API)
3. Implement XKT013 (Population 250m Mesh)
4. Implement disaster risk APIs

**APIs to Integrate:**
| API ID | Purpose | Priority |
|--------|---------|----------|
| XIT001 | Transaction prices | High |
| XPT001 | Price points | High |
| XPT002 | Land prices | Medium |
| XKT013 | Population data | Medium |
| XKT016 | Disaster hazards | Medium |

#### 3.3.2 e-Stat Vacant House Survey

**Source:** https://www.e-stat.go.jp/stat-search/files?page=1&toukei=00600640

**Implementation:**
1. Download R6 (2024) datasets
2. Parse CSV/Excel files
3. Import into regional statistics table
4. Link to property data by prefecture

**Deliverables (Phase 1):**
- [ ] AtHome scraper operational
- [ ] LIFULL scraper operational
- [ ] REINFOLIB API connected
- [ ] e-Stat data imported
- [ ] ~20,000 properties in database

---

## 4. Phase 2: Expansion (Months 4-6)

### 4.1 Municipal Akiya Bank Network

**Approach:** Template-based scrapers for municipal sites

**Target Categories:**
1. Prefectural portals (e.g., 楽園信州)
2. City-level akiya banks
3. Town/village listings

**Scraper Templates:**
```typescript
interface MunicipalScraper {
  // Common patterns
  patterns: {
    list: string[];    // Common list page patterns
    detail: string[];  // Common detail page patterns
    pagination: string[];
  };
  
  // Municipality-specific configs
  configs: Map<string, MunicipalityConfig>;
}
```

**Priority Municipalities:**
| Prefecture | Portal URL | Priority |
|------------|------------|----------|
| Nagano | rakuen-akiya.jp | High |
| Fukuoka | akiyabank.f-takken.com | High |
| Tokyo | metro.tokyo.lg.jp | High |
| Kyoto | kyoto.akiyabank.jp | Medium |
| Hokkaido | hokkaido.akiyabank.jp | Medium |

### 4.2 Additional Major Sources

#### 4.2.1 Akiya Japan (English Portal)

**Source:** https://www.akiyajapan.com/

**Stats:**
- 168,135 listings
- 47 prefectures
- 44,108 under $50K

**Unique Value:**
- English language content
- International buyer focus
- Bilingual support through Teritoru

#### 4.2.2 SUUMO Inaka

**Source:** https://inaka.suumo.jp/

**Stats:** Nationwide coverage

**Integration Approach:**
- LIFULL Connect partnership (if approved)
- Alternative: Direct scraping

### 4.3 Geographic Data Integration

#### 4.3.1 National Land Numerical Information

**Source:** https://nlftp.mlit.go.jp/

**Datasets to Import:**
| Dataset | Purpose |
|---------|---------|
| Land Price Survey | Price benchmarking |
| Urban Planning | Zoning information |
| Flood Areas | Risk assessment |
| Landslide Areas | Risk assessment |
| Station Data | Transit access |

**Implementation:**
```sql
-- PostGIS schema for geographic data
CREATE TABLE geographic_data (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    prefecture_code VARCHAR(2),
    geometry GEOMETRY,
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_geo_type ON geographic_data(type);
CREATE INDEX idx_geo_pref ON geographic_data(prefecture_code);
CREATE INDEX idx_geo_geom ON geographic_data USING GIST(geometry);
```

**Deliverables (Phase 2):**
- [ ] 50+ municipal bank scrapers
- [ ] Geographic data integrated
- [ ] Akiya Japan integration
- [ ] SUUMO integration
- [ ] ~100,000 properties in database

---

## 5. Phase 3: Specialization (Months 7-9)

### 5.1 Niche Property Sources

#### 5.1.1 Sumai Akiya

**Source:** https://akiya.sumai.biz/

**Stats:** 3,122 properties

**Unique Features:**
- 薪風呂 (wood-fired baths)
- 囲炉裏 (hearths)
- 掘りごたつ (sunken hearths)
- Airbnb/short-term rental suitable

#### 5.1.2 Inaka Net

**Source:** https://www.inakanet.jp/

**Focus:** Self-sufficiency, farming lifestyle

**Categories:**
- 古民家 (kominka)
- ログハウス (log houses)
- 家庭菜園 (vegetable gardens)
- 畑 (farmland)

#### 5.1.3 Kominka Specialists

| Source | URL | Focus |
|--------|-----|-------|
| Kominka Sumairu | kominka.net | Certified kominka |
| Nihon Minka Saisei Kyokai | minka.or.jp | Traditional minka |

### 5.2 Auction and Alternative Sources

#### 5.2.1 Bitprise

**Source:** https://bitprise.com/

**Type:** Foreclosure auction listings

**Considerations:**
- Auction process complexity
- Legal requirements
- Cash payment typically required

#### 5.2.2 Direct Owner Sites

| Source | URL | Type |
|--------|-----|------|
| Ieichiba | ieichiba.com | Bulletin board |
| Jimoty | jmty.jp | Classifieds |

### 5.3 Advanced Features

#### 5.3.1 Disaster Risk Mapping

Integrate MLIT disaster data:
- Flood inundation zones
- Landslide risk areas
- Earthquake liquefaction zones
- Tsunami evacuation zones

#### 5.3.2 Price Analytics

Using REINFOLIB transaction data:
- Price per m² by region
- Historical trends
- Market heat maps

**Deliverables (Phase 3):**
- [ ] Niche property sources integrated
- [ ] Disaster risk mapping
- [ ] Price analytics dashboard
- [ ] ~150,000 properties in database

---

## 6. Phase 4: Optimization (Months 10-12)

### 6.1 Data Quality Improvements

**Tasks:**
- [ ] Address normalization (Japan Post + Google Geocoder)
- [ ] Duplicate detection across sources
- [ ] Image optimization pipeline
- [ ] Property status verification

### 6.2 Real-time Updates

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Scheduler  │────▶│    Queue    │────▶│  Scrapers   │
│   (Cron)    │     │   (Redis)   │     │  (Workers)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                       ┌────────────────────────┘
                       ▼
                ┌─────────────┐
                │  Database   │
                │  (Postgres) │
                └─────────────┘
```

**Update Frequencies:**
| Source Type | Frequency |
|-------------|-----------|
| Major portals | Daily |
| Municipal banks | Weekly |
| Niche sites | Weekly |
| Government data | Monthly/Quarterly |

### 6.3 User Experience Enhancements

**Features:**
- Saved searches with notifications
- Price drop alerts
- New listing alerts by region
- Comparison tools
- Favorites/bookmarks

### 6.4 API for Partners

**Public API Endpoints:**
```
GET /api/v1/properties/search
GET /api/v1/properties/{id}
GET /api/v1/regions/{prefecture}/stats
GET /api/v1/price-trends/{region}
```

**Deliverables (Phase 4):**
- [ ] Data quality pipeline complete
- [ ] Real-time update system
- [ ] User notification system
- [ ] Partner API launched
- [ ] ~200,000 properties in database

---

## 7. Technical Implementation Details

### 7.1 Database Schema

```sql
-- Core properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    
    -- Location
    prefecture VARCHAR(20),
    city VARCHAR(50),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Property details
    property_type VARCHAR(50),
    price DECIMAL(15, 2),
    land_area DECIMAL(10, 2),
    building_area DECIMAL(10, 2),
    year_built INTEGER,
    structure VARCHAR(50),
    
    -- Features (JSONB for flexibility)
    features JSONB DEFAULT '{}',
    
    -- Media
    images TEXT[],
    
    -- Metadata
    listing_url TEXT,
    contact_info JSONB,
    
    -- Timestamps
    listed_at TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Soft delete
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(source, source_id)
);

-- Indexes
CREATE INDEX idx_properties_source ON properties(source);
CREATE INDEX idx_properties_location ON properties(prefecture, city);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_features ON properties USING GIN(features);
```

### 7.2 Scraper Architecture

```typescript
// Base scraper interface
interface BaseScraper {
  name: string;
  baseUrl: string;
  
  // Configuration
  config: {
    rateLimitMs: number;
    maxRetries: number;
    timeoutMs: number;
  };
  
  // Methods
  fetchListings(options: SearchOptions): Promise<ListingSummary[]>;
  fetchDetail(id: string): Promise<PropertyDetail>;
  parseListing(element: Element): ListingSummary;
  parseDetail(document: Document): PropertyDetail;
}

// Example implementation
class AtHomeScraper implements BaseScraper {
  name = 'athome';
  baseUrl = 'https://www.akiya-athome.jp';
  
  async fetchListings(options: SearchOptions): Promise<ListingSummary[]> {
    // Implementation
  }
  
  async fetchDetail(id: string): Promise<PropertyDetail> {
    // Implementation
  }
}
```

### 7.3 Deployment Architecture

```yaml
# docker-compose.yml example
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/akiya
      - REDIS_URL=redis://redis:6379
  
  db:
    image: postgis/postgis:15-3.3
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
  
  scraper-worker:
    build: .
    command: npm run worker:scraper
    depends_on:
      - db
      - redis
  
  scheduler:
    build: .
    command: npm run scheduler
    depends_on:
      - redis
```

---

## 8. Risk Mitigation

### 8.1 Legal Compliance

| Risk | Mitigation |
|------|------------|
| robots.txt violations | Check before scraping; respect directives |
| Terms of Service | Review ToS for each source |
| Data copyright | Attribute sources; follow licenses |
| Personal information | Anonymize; GDPR/Japanese privacy law compliance |

### 8.2 Technical Risks

| Risk | Mitigation |
|------|------------|
| Site structure changes | Monitor for changes; alert on failures |
| Rate limiting | Implement exponential backoff |
| IP blocking | Use rotating proxies if needed |
| Data quality issues | Validation pipeline; manual review |

### 8.3 Business Risks

| Risk | Mitigation |
|------|------------|
| Sources shutting down | Diversify sources; cache data |
| Partnership rejections | Focus on public data first |
| Competition | Differentiate with UX, features |

---

## 9. Success Metrics

### 9.1 Data Coverage

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Properties | 20,000 | 100,000 | 150,000 | 200,000+ |
| Prefectures | 47 | 47 | 47 | 47 |
| Municipalities | 100 | 500 | 1,000+ | 1,500+ |
| Data freshness | Daily | Daily | Daily | Real-time |

### 9.2 Quality Metrics

- Duplicate rate: < 5%
- Address geocoding rate: > 95%
- Image availability: > 80%
- Data accuracy: > 98%

### 9.3 Performance Metrics

- Search response time: < 200ms
- Scraper success rate: > 95%
- API uptime: > 99.9%

---

## 10. Timeline Summary

```
Month 1-3:    [FOUNDATION] Core infrastructure + Major portals
Month 4-6:    [EXPANSION] Municipal banks + Geographic data
Month 7-9:    [SPECIALIZATION] Niche sources + Advanced features
Month 10-12:  [OPTIMIZATION] Quality + Real-time + API
```

---

## 11. Resource Requirements

### 11.1 Infrastructure (Estimated)

| Component | Specs | Monthly Cost |
|-----------|-------|--------------|
| App Server | 4 vCPU / 8GB RAM | ~$100 |
| Database | Managed Postgres + PostGIS | ~$200 |
| Cache/Queue | Managed Redis | ~$50 |
| Storage | 500GB (images) | ~$50 |
| Scraping | Proxy service (if needed) | ~$100 |
| **Total** | | **~$500/month** |

### 11.2 Development Effort

| Phase | Duration | Team Size | Effort |
|-------|----------|-----------|--------|
| Phase 1 | 3 months | 2 devs | 6 person-months |
| Phase 2 | 3 months | 2 devs | 6 person-months |
| Phase 3 | 3 months | 2 devs | 6 person-months |
| Phase 4 | 3 months | 2 devs | 6 person-months |
| **Total** | **12 months** | | **24 person-months** |

---

## 12. Next Steps

### Immediate Actions (Week 1)

1. **Finalize architecture decisions**
   - Confirm database choice (PostgreSQL + PostGIS)
   - Select scraping framework (Puppeteer vs Playwright)
   - Choose hosting platform

2. **Set up development environment**
   - Initialize repository
   - Set up CI/CD pipeline
   - Deploy staging environment

3. **Begin Phase 1 implementation**
   - Database schema creation
   - Base scraper framework
   - AtHome scraper development

### Short-term Goals (Month 1)

- [ ] Database schema implemented
- [ ] Scraper framework operational
- [ ] AtHome integration complete
- [ ] Basic search API functional

---

*Roadmap compiled March 2026 for Akiya Japan app development.*
