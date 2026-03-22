# BODIK CKAN Integration - Implementation Status

**Date:** March 22, 2026  
**Status:** ✅ **FULLY IMPLEMENTED**

---

## Overview

The BODIK (Big Data & Open Data Initiative Kyushu) CKAN data source has been fully integrated into the Akiya app with a complete end-to-end pipeline.

---

## Implementation Checklist

### Core Connector ✅
- [x] BODIK connector class (`bodik-connector.ts`)
- [x] TypeScript interfaces for all CKAN responses
- [x] Error handling and timeout configuration
- [x] Rate limiting support
- [x] Exported in `connectors/index.ts`

### Pipeline ✅
- [x] Bodik ingestion pipeline (`bodik-pipeline.ts`)
- [x] Data transformation and normalization
- [x] Japanese field mapping (住所 → address, 価格 → price, etc.)
- [x] Price normalization (万円 → integer JPY)
- [x] Area normalization (坪 → m²)
- [x] Year built parsing (昭和/平成/令和 → Gregorian)
- [x] Deduplication via SHA256 hashing
- [x] Database upsert operations

### Database Integration ✅
- [x] CKAN dataset metadata storage
- [x] CKAN resource metadata storage
- [x] Raw capture storage
- [x] Listing variant creation
- [x] Property entity resolution
- [x] Ingestion logging

### Testing ✅
- [x] Unit tests for connector
- [x] Integration tests for pipeline
- [x] Data parsing tests (price, area, year)
- [x] Job locking tests
- [x] Manual verification completed

### Documentation ✅
- [x] BODIK report (`bodik-report.md`)
- [x] DATA_SOURCES_GUIDE.md updated
- [x] Connector JSDoc comments
- [x] README for datasources module

---

## File Locations

```
akiya-app/
├── server/
│   ├── lib/
│   │   ├── datasources/
│   │   │   ├── connectors/
│   │   │   │   ├── bodik-connector.ts    # Main connector
│   │   │   │   └── index.ts              # Exports updated
│   │   │   └── README.md
│   │   └── ingestion/
│   │       └── bodik-pipeline.ts         # Ingestion pipeline
│   └── index.ts                          # Connectors registered
├── tests/
│   └── bodik-ingestion.test.ts           # Test suite
└── scripts/
    └── bodik_ingestion.py                # Python reference
```

---

## API Verification

### Connector Test Results:
```
✓ searchAkiyaDatasets() - Found 5+ datasets
✓ listOrganizations() - Found 378 organizations
✓ Kyushu region orgs - 119 municipalities
✓ Sample dataset: 空き家率・空き家件数 - 長浜市
```

### Pipeline Features:
- Searches keywords: 空き家, 空き家バンク, 住宅一覧
- Processes CSV/XLSX/JSON resources
- Uses datastore_search for active datastores
- Handles pagination (1000 records per batch)
- Stores metadata and raw captures

---

## Data Coverage

### Municipalities: 378 organizations
- Kyushu region: 119 (primary focus)
- Other prefectures: 259

### Akiya Datasets: 14+ found
- Vacant house rates by district
- Properties with elderly owners
- Housing statistics
- Management data

### Data Fields Mapped:
| Japanese | English | Type |
|----------|---------|------|
| 住所 | address | string |
| 価格 | price | integer JPY |
| 間取り | ldk | string |
| 土地面積 | landArea | m² |
| 建物面積 | buildingArea | m² |
| 建築年 | yearBuilt | integer year |
| 物件名 | title | string |
| 備考 | description | string |
| 緯度/経度 | lat/lon | float |

---

## Configuration

### Environment Variables:
```env
# No API key required for BODIK (public API)
# Optional configuration:
BODIK_BASE_URL=https://data.bodik.jp
BODIK_RATE_LIMIT=60  # requests per minute
```

### Pipeline Config:
```typescript
interface BodikPipelineConfig {
  maxDatasets?: number;           // default: 50
  maxRecordsPerDataset?: number;  // default: 1000
  organizationId?: string;        // filter by municipality
  onlyAkiyaDatasets?: boolean;    // default: true
  dryRun?: boolean;               // test without saving
}
```

---

## Usage Examples

### Run Pipeline:
```typescript
import { runBodikPipeline } from './server/lib/ingestion/bodik-pipeline';

// Full run
const result = await runBodikPipeline({
  maxDatasets: 10,
  maxRecordsPerDataset: 100,
  dryRun: false
});

// Dry run (test only)
const testResult = await runBodikPipeline({
  maxDatasets: 2,
  dryRun: true
});
```

### Use Connector Directly:
```typescript
import { BODIKConnector } from './server/lib/datasources/connectors';

const connector = new BODIKConnector();

// Search for akiya datasets
const datasets = await connector.searchAkiyaDatasets(10);

// Search by municipality
const cityData = await connector.searchByMunicipality('401307'); // Fukuoka City

// Get datastore records
const records = await connector.getAkiyaData('resource-id', 100);
```

---

## Rate Limits

| Endpoint | Limit | Notes |
|----------|-------|-------|
| package_search | 60/min | Be respectful |
| datastore_search | 60/min | Use pagination |
| resource_download | 30/min | For static files |

---

## Next Steps

### Completed ✅
1. BODIK connector implementation
2. Pipeline with data transformation
3. Database integration
4. Test suite
5. Documentation

### Future Enhancements:
- [ ] Schedule regular ingestion jobs
- [ ] Add monitoring/alerting for failures
- [ ] Expand to Tokyo Metro data source
- [ ] Cross-reference with other sources

---

## Verification Commands

```bash
# Test connector
cd akiya-app && npx tsx -e "
const { BODIKConnector } = require('./server/lib/datasources/connectors');
const c = new BODIKConnector();
c.searchAkiyaDatasets(5).then(d => console.log('Found:', d.length));
"

# Check database (if running)
curl http://localhost:5000/api/admin/status
```

---

*Implementation completed: March 22, 2026*
