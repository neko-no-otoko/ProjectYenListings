# AkiyaFinder - Japan Akiya Real Estate Aggregator

## Overview

AkiyaFinder is a Zillow-like real estate aggregator web application for discovering affordable abandoned homes (akiya) with land in Japan. The platform aggregates listings from multiple third-party sources, providing English-first search, filtering, and detailed property information for homes priced under 150,000 JPY.

The application enables users to search properties by prefecture, island, municipality, price, size, condition, and other criteria. It displays results in both grid and map views with normalized property data including English translations, nearest airport distances, and condition assessments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Maps**: MapLibre GL with OpenStreetMap tiles
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (home, listing-detail, not-found)
- Reusable components in `client/src/components/`
- UI primitives in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`
- Utilities and constants in `client/src/lib/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api/`
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Schema Validation**: Zod with drizzle-zod integration

The server structure includes:
- `server/index.ts` - Express app setup and middleware
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Database access layer (IStorage interface pattern)
- `server/db.ts` - Database connection pool
- `server/seed.ts` - Sample data seeding for airports and listings
- `server/vite.ts` - Vite dev server integration
- `server/static.ts` - Production static file serving

### Data Model
Core entities defined in `shared/schema.ts`:
- **listings** - Property records with location, pricing, condition, photos (display layer)
- **sources** - Third-party data source configurations with crawl policies
- **airports** - Major Japanese airports for distance calculations

#### Ingestion Pipeline Tables (added January 2026)
- **property_entities** - Deduplicated property records with canonical addresses
- **listing_variants** - Source-specific listing data linked to property entities
  - Indexes: `(propertyEntityId, lastSeenAt DESC)`, `(status, lastSeenAt DESC)`
- **raw_captures** - Audit log of raw data fetched from sources
- **ckan_datasets** - Tracked CKAN datasets from municipal akiya banks
- **ckan_resources** - Individual resources (CSV/JSON files) within datasets
- **reinfolib_transactions** - MLIT real estate transaction data (comps)
- **partner_sources_config** - Configuration for B2B partner feeds
- **translation_cache** - Hash-based cache for JP→EN translations
- **ingestion_logs** - Job execution logs for monitoring
- **sync_cursors** - Cursor tracking for incremental sync jobs (name PK, cursorTs timestamptz)

#### Canonical Display Identity
- **listings.id == propertyEntities.id** - Same UUID links display layer to ingestion layer
- **listings.primaryVariantId** - Nullable UUID for debugging which variant was used

Key listing fields include prefecture, municipality, island, coordinates, price, LDK layout, house/land sizes, year built, condition score, and multilingual content (English + Japanese).

### Connector Architecture
The ingestion pipeline uses a unified connector interface pattern:

**Connector Types:**
- **CKAN Discovery** - Searches search.ckan.jp for akiya bank datasets
- **CKAN Resource Ingest** - Parses CSV/JSON from municipal open data portals
- **Reinfolib** - Fetches MLIT real estate transaction data
- **LIFULL** - OAuth2-authenticated B2B feed (requires credentials)
- **AtHome** - B2B feed via HTTP/S3/SFTP (requires credentials)

**Pipeline Flow:**
1. Raw capture → SHA256 hash for deduplication
2. Parse with encoding detection (Shift_JIS/UTF-8)
3. Extract Japanese text (wareki years, tsubo→m² conversion, LDK)
4. Normalize addresses and dedupe via haversine proximity (100m threshold)
5. Translate JP→EN via OpenAI/DeepL (cached by hash)
6. Link listing variants to canonical property entities
7. **sync_listings** - Materialize propertyEntities + listingVariants → listings table

**sync_listings Materialization Job:**
- Uses advisory lock "sync_listings" for concurrency control
- Tracks cursor via syncCursors table to process only changed entities
- Detects changes via propertyEntities.updatedAt and listingVariants.lastSeenAt
- Primary variant selection (deterministic order):
  - translateStatus: completed > pending > failed > skipped
  - hasLand: true > null > false
  - lastSeenAt: newest first
  - sourceType: lifull > athome > ckan_akiya > manual
- Field mapping: title/desc from primary, location from entity, price = MIN across variants
- Status: "delisted" when no active variants remain
- Scheduled every 30 minutes (after translation job)

**Files:**
- `server/lib/connectors/` - Connector implementations
- `server/lib/ingestion/` - Rate limiting, HTTP client, upsert, dedupe, syncListings
- `server/lib/translate/` - Translation provider interface
- `server/adminRoutes.ts` - Admin API for monitoring/triggers

### Build System
- Development: `tsx` runs TypeScript directly with Vite dev server
- Production: Custom build script using esbuild for server + Vite for client
- Output: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### Database
- **PostgreSQL** - Primary data store via `DATABASE_URL` environment variable
- **Drizzle Kit** - Schema migrations via `drizzle-kit push`

### Third-Party Services
**Production Connectors (implemented):**
- **search.ckan.jp** - Discovery layer for municipal CKAN portals
- **Municipal CKAN portals** - Akiya bank listings (CSV/JSON)
- **MLIT Reinfolib** - Real estate transaction data

**Partner Connectors (skeleton implemented, requires credentials):**
- **LIFULL (homes.co.jp)** - OAuth2 B2B API
- **AtHome** - HTTP/S3/SFTP feed

**Future Sources (design only):**
- Akiya Air, Nippon Tradings International, Akiyaz
- Zero Estate, AkiyaBanks, Akiya Japan
- AkiyaMart, All Akiyas, Old Houses Japan
- Koryoya, Akiyahopper, Cheap Japan Homes

### Environment Variables
**Required:**
- `DATABASE_URL` - PostgreSQL connection string

**Optional (connector configuration):**
- `OPENAI_API_KEY` / `DEEPL_API_KEY` - Translation provider
- `REINFOLIB_API_KEY` - MLIT API access
- `LIFULL_ENABLED`, `LIFULL_CLIENT_ID`, `LIFULL_CLIENT_SECRET` - LIFULL OAuth2
- `ATHOME_ENABLED`, `ATHOME_FEED_URL`, `ATHOME_FEED_FORMAT` - AtHome feed
- `INGESTION_RATE_LIMIT_PER_HOST` - Rate limit (default: 60 req/min)
- `INGESTION_CRON_*` - Cron expressions for scheduled jobs
- `ADMIN_API_TOKEN` - Bearer token for admin API access (required in production)

### Key NPM Packages
- `@tanstack/react-query` - Async state management
- `drizzle-orm` / `drizzle-zod` - Database ORM and validation
- `maplibre-gl` - Interactive maps
- `wouter` - Client-side routing
- `express` / `express-session` - HTTP server framework
- Radix UI components for accessible UI primitives

### Compliance Requirements
The data aggregation design includes:
- Per-source rate limiting configuration
- robots.txt and ToS respect
- Attribution for hotlinked images
- Audit logging capability
- Manual import fallback for restricted sources