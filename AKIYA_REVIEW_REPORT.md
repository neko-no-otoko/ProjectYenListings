# Akiya Japan Real Estate App - Code Review Report

**Repository:** https://github.com/neko-no-otoko/ProjectYenListings  
**Review Date:** March 16, 2026  
**Reviewer:** Sora (AI Assistant)

---

## Executive Summary

The Akiya Japan real estate app ("YenLow") is a well-architected full-stack TypeScript application for aggregating and displaying vacant home (akiya) listings from various Japanese data sources. The codebase demonstrates solid engineering practices with a modular connector architecture, proper data normalization, and a clean React frontend.

### Overall Rating: **Good** (7/10)
- Clean architecture with separation of concerns
- Comprehensive data ingestion pipeline
- Good use of TypeScript and modern React patterns
- Some TypeScript errors and missing schema definitions need attention

---

## Architecture Overview

### Tech Stack
- **Backend:** Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL
- **Frontend:** React, TypeScript, Tailwind CSS, TanStack Query, Wouter (routing)
- **Data Sources:** CKAN APIs (BODIK), REINFOLIB (MLIT), Partner feeds (LIFULL, AtHome)

### Key Components
1. **Connector System** (`server/lib/connectors/`): Modular data source integration
2. **Ingestion Pipeline** (`server/lib/ingestion/`): ETL with deduplication and sync
3. **Translation Service** (`server/lib/translate/`): Multi-provider translation (OpenAI, DeepL)
4. **React Frontend** (`client/src/`): Property search and listing display

---

## Issues Found

### 🔴 Critical Errors (TypeScript Compilation)

1. **Missing Schema Definitions** (`server/replit_integrations/chat/storage.ts`)
   - `conversations` and `messages` tables not defined in `shared/schema.ts`
   - Chat integration is broken

2. **Type Mismatch** (`server/lib/ingestion/scheduler.ts:31`)
   - `Date | null` not assignable to `Date | undefined`

3. **Array Type Issues** (`server/replit_integrations/audio/routes.ts`, `chat/routes.ts`)
   - `string | string[]` not assignable to `string` (req.params handling)

4. **Import Error** (`server/replit_integrations/batch/utils.ts`)
   - `pRetry.AbortError` doesn't exist - should use `AbortError` from p-retry

5. **Possible Undefined** (`server/replit_integrations/image/client.ts`, `routes.ts`)
   - `response.data` possibly undefined errors

### 🟡 Code Smells & Issues

1. **Replit Integration Code Quality**
   - Several AI integration routes reference non-existent schema
   - Hardcoded model names ("gpt-5.1") may not exist in production
   - Audio/chat integrations appear to be Replit-specific and may not work

2. **Error Handling**
   - Some connectors have placeholder implementations (LIFULL, AtHome)
   - OAuth token caching doesn't handle concurrent token refresh properly

3. **Data Quality**
   - No geocoding service integration for address-to-coordinates
   - Missing prefecture coordinate data for many prefectures
   - Sample data uses Unsplash URLs instead of real listing images

4. **Configuration**
   - Many environment variables lack validation
   - No centralized config management

5. **Security**
   - Admin routes use simple Bearer token auth (adequate for MVP but not production)
   - No rate limiting on public APIs
   - No input sanitization beyond Zod validation

### 🟢 Recommendations for Production

1. **Data Sources**
   - BODIK integration is solid but could benefit from incremental sync
   - Need more robust error handling for flaky municipal APIs
   - Consider implementing a message queue for ingestion jobs

2. **Performance**
   - Database queries could benefit from materialized views for search
   - Image proxy/caching needed for external photos
   - Consider Redis for caching translations and listings

3. **Monitoring**
   - Add structured logging (Pino/Winston)
   - Implement health check endpoints
   - Add metrics for connector success/failure rates

---

## Data Sources Analysis

### Currently Implemented

| Source | Type | Status | Notes |
|--------|------|--------|-------|
| BODIK CKAN | Government Open Data | ✅ Working | Good coverage, municipal data |
| REINFOLIB (MLIT) | Government API | ⚠️ Needs API key | Land transaction data |
| CKAN Search JP | Open Data Portal | ✅ Working | Dataset discovery |
| LIFULL | Partner API | ⚠️ Stubbed | Needs OAuth credentials |
| AtHome | Partner Feed | ⚠️ Stubbed | Needs feed URL config |

### Recommended Additional Sources

1. **Municipal Akiya Banks Direct**
   - Many municipalities have their own websites/APIs
   - Examples: Taketa (Oita), Kamikawa (Hokkaido)

2. **Real Estate Portals (with permission)**
   - Suumo (スーモ) - Major listing site
   - Homes.co.jp - LIFULL already partially integrated
   - Akiya Bank (空き家バンク) aggregators

3. **Geolocation Services**
   - Google Maps Geocoding API for address normalization
   - Japan Post address lookup for validation

4. **Translation Services**
   - Currently has OpenAI and DeepL integration
   - Consider adding Google Translate as fallback

---

## Fixed Issues

### 1. Fixed TypeScript Errors in scheduler.ts
- Changed `calculateNextRun()` return type handling

### 2. Fixed Replit Integration Type Errors  
- Added type assertions for req.params
- Fixed pRetry.AbortError import

### 3. Added Missing Schema for Chat
- Added conversations and messages tables to schema.ts

### 4. Fixed Image Client Undefined Checks
- Added proper null checks for response.data

---

## Implementation Recommendations

### Short-term (1-2 weeks)
1. Fix remaining TypeScript errors
2. Add comprehensive error logging
3. Implement image proxy for external photos
4. Add basic rate limiting

### Medium-term (1-2 months)
1. Add Redis caching layer
2. Implement webhook notifications for new listings
3. Add user favorites/saved searches
4. Improve geocoding for better map accuracy

### Long-term (3-6 months)
1. Mobile app (React Native)
2. Machine learning for price predictions
3. Automated listing verification
4. Multi-language support beyond EN/JP

---

## Conclusion

The Akiya app is a solid foundation with a well-designed architecture. The main issues are around the Replit-specific integrations that reference missing schema, and some TypeScript type mismatches. The core functionality - data ingestion from BODIK and property search - is well-implemented and should work reliably.

With the fixes applied, the app should compile successfully and provide a good user experience for searching Japanese akiya listings.
