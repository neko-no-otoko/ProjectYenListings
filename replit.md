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
- **listings** - Property records with location, pricing, condition, photos
- **sources** - Third-party data source configurations with crawl policies
- **airports** - Major Japanese airports for distance calculations

Key listing fields include prefecture, municipality, island, coordinates, price, LDK layout, house/land sizes, year built, condition score, and multilingual content (English + Japanese).

### Build System
- Development: `tsx` runs TypeScript directly with Vite dev server
- Production: Custom build script using esbuild for server + Vite for client
- Output: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### Database
- **PostgreSQL** - Primary data store via `DATABASE_URL` environment variable
- **Drizzle Kit** - Schema migrations via `drizzle-kit push`

### Third-Party Services
The application is designed to aggregate from these akiya listing sources (implementation pending):
- Akiya Air, Nippon Tradings International, Akiyaz
- Zero Estate, AkiyaBanks, Akiya Japan
- AkiyaMart, All Akiyas, Old Houses Japan
- Koryoya, Akiyahopper, Cheap Japan Homes

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