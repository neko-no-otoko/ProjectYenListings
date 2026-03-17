# Project Yen Listings - Akiya Japan App

A comprehensive platform for discovering akiya (vacant houses) in Japan.

## Data Sources

This application aggregates akiya listings from multiple sources:

| Source | Status | Type |
|--------|--------|------|
| BODIK CKAN | ✅ Active | Government Open Data |
| CKAN Search Japan | ✅ Active | CKAN Aggregator |
| REINFOLIB (MLIT) | ⚠️ Needs API Key | Government API |
| LIFULL Homes | ⚠️ Needs OAuth | Commercial Feed |
| AtHome | ⚠️ Needs Feed URL | XML/CSV Feed |

See [DATA_SOURCES_GUIDE.md](./DATA_SOURCES_GUIDE.md) for detailed integration documentation.

## Development

This project uses:
- React + TypeScript frontend
- Express.js backend
- PostgreSQL database with Drizzle ORM
- Python scripts for data ingestion

## Git Workflow

See [WORKFLOW.md](./WORKFLOW.md) for development and deployment procedures.

---
*Last updated: March 17, 2026*
