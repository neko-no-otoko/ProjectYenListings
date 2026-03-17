# BODIK CKAN API Research Report

## Executive Summary

BODIK (官民データ活用推進協議会 - Big Data & Open Data Initiative Kyushu) operates a CKAN-based open data platform called **BODIK ODCS** (Open Data Catalog Site). This report documents the API structure, available akiya (vacant home) datasets, and integration patterns for the Akiya Japan app.

---

## 1. Portal Overview

| Attribute | Value |
|-----------|-------|
| **Portal Name** | BODIK ODCS |
| **Base URL** | https://data.bodik.jp/ |
| **Site URL** | https://odcs.bodik.jp/ |
| **Platform** | CKAN 2.10 |
| **Total Datasets** | 17,192 |
| **Participating Municipalities** | 343 (15 prefectures, 328 cities/towns/villages) |
| **Operator** | 公益財団法人九州先端科学技術研究所 (Kyushu Institute of Advanced Science) |

---

## 2. CKAN API Endpoints

### Base API URL
```
https://data.bodik.jp/api/3/action/
```

### Core Endpoints

| Action | Endpoint | Description |
|--------|----------|-------------|
| `package_list` | `/api/3/action/package_list` | List all dataset IDs |
| `package_search` | `/api/3/action/package_search?q={query}` | Search datasets |
| `organization_list` | `/api/3/action/organization_list` | List all organizations |
| `resource_search` | `/api/3/action/resource_search?query={field}:{value}` | Search resources |
| `datastore_search` | `/api/action/datastore_search?resource_id={id}` | Access data content |
| `tag_list` | `/api/3/action/tag_list` | List all tags |

### Query Parameters

- `rows` - Number of results (default: 10)
- `start` / `offset` - Pagination offset
- `sort` - Sort field (e.g., `score desc`, `metadata_modified desc`)
- `fq` - Filter query

---

## 3. Akiya (Vacant Home) Datasets

### Search Query
```
https://data.bodik.jp/api/3/action/package_search?q=空き家&rows=20
```

### Dataset Summary (14 datasets found)

| Dataset | Municipality | Format | Description |
|---------|-------------|--------|-------------|
| 空き家率・空き家件数 | 長浜市 (Nagahama) | XLSX | District-level vacant house rates |
| 空き家率 | 生駒市 (Ikoma) | CSV | Vacant house rates by elementary school district |
| 家屋（空き家を探す） | 石垣市 (Ishigaki) | CSV | Properties with elderly owners, non-resident owners, inheritance issues |
| 空き家管理戸数一覧 | 四日市市 (Yokkaichi) | XLS | Municipal housing vacancy status |
| 都市政策（空き家を探す） | 石垣市 (Ishigaki) | CSV | Urban policy vacant house data |
| 空き家利活用調査結果 | 生駒市 (Ikoma) | DOCX | Vacant house utilization survey results |
| 相続・空き家対策セミナー | 三田市 (Sanda) | HTML | Inheritance & akiya seminars |
| 空き家の種類別統計 | 泉佐野市 (Izumisano) | HTML | Vacant house types by condition/structure |
| 所有者または納税管理人が高齢の家屋 | 都城市 (Miyakonojo) | XLSX | Properties with elderly owners/tax managers |
| 住宅・土地統計調査（腐朽・破損） | 福岡市 (Fukuoka) | XLS | Housing statistics - deterioration damage |
| 住宅・土地統計調査（居住世帯なし） | 福岡市 (Fukuoka) | XLS | Housing without resident households |

### Key Data Fields (Typical)

- 所有者年齢 (Owner age)
- 納税管理人年齢 (Tax manager age)
- 建築年数 (Building age)
- 腐朽・破損状況 (Deterioration status)
- 空き家種類 (Vacant house type)
- 構造 (Structure)
- 地域・行政区 (District)

---

## 4. Organization/Municipality IDs

Organization IDs follow the format `{prefecture_code}{city_code}` (e.g., `401307` = Fukuoka City).

### Sample Organization IDs
```
401307 - 福岡市 (Fukuoka City)
252034 - 長浜市 (Nagahama City)
292095 - 生駒市 (Ikoma City)
472077 - 石垣市 (Ishigaki City)
242021 - 四日市市 (Yokkaichi City)
282197 - 三田市 (Sanda City)
272132 - 泉佐野市 (Izumisano City)
452025 - 都城市 (Miyakonojo City)
```

### Query by Organization
```
https://data.bodik.jp/api/3/action/package_search?q=organization:401307
```

---

## 5. Data Access Patterns

### 5.1 Search for Akiya Datasets
```bash
curl "https://data.bodik.jp/api/3/action/package_search?q=空き家&rows=20"
```

### 5.2 Get Dataset Details
```bash
curl "https://data.bodik.jp/api/3/action/package_show?id={dataset_id}"
```

### 5.3 Access Datastore (for CSV/Excel data)
```bash
curl "https://data.bodik.jp/api/action/datastore_search?resource_id={resource_id}&limit=10"
```

### 5.4 Search by Prefecture
```bash
# Fukuoka Prefecture organizations (40*)
curl "https://data.bodik.jp/api/3/action/package_search?q=organization:(40*)"
```

---

## 6. Data Freshness & Coverage

### Update Frequency
- **Varies by municipality**: Some data is updated annually, others less frequently
- **Metadata timestamps**: Available in `metadata_created` and `metadata_modified` fields
- **Datastore resources**: Have `last_modified` timestamps

### Geographic Coverage
- **Primary focus**: Kyushu region (7 prefectures)
- **Extended coverage**: 15 prefectures nationwide
- **Major cities**: Fukuoka, Kitakyushu, Kumamoto, Kagoshima, etc.

### Data Quality Notes
- Timestamps are in **UTC** - convert to JST (+9:00) for display
- Not all datasets have datastore enabled (some are external links)
- License varies: primarily CC-BY-4.0 and CC-BY

---

## 7. Group & Tag Structure

### Relevant Groups
- `gr_0800` - 住宅・土地・建設 (Housing, Land, Construction)
- `gr_9400` - くらしの情報 (Living Information)

### Relevant Tags
- `空き家` (vacant house)
- `家屋` (house/building)
- `相続` (inheritance)
- `住宅土地統計調査` (housing/land statistics)
- `都市計画` (urban planning)
- `統計` (statistics)

---

## 8. API Response Structure

### Package Search Response
```json
{
  "success": true,
  "result": {
    "count": 14,
    "results": [
      {
        "id": "dataset_uuid",
        "title": "Dataset Title",
        "notes": "Description",
        "organization": { "id": "org_id", "title": "Org Name" },
        "resources": [
          {
            "id": "resource_uuid",
            "format": "CSV",
            "datastore_active": true,
            "url": "download_url"
          }
        ],
        "tags": [...],
        "metadata_modified": "2025-01-07T03:21:56.996100"
      }
    ]
  }
}
```

---

## 9. Limitations & Considerations

1. **Granularity**: Most data is aggregated at district/ward level, not individual properties
2. **Coverage gaps**: Not all municipalities publish akiya data
3. **Update delays**: Some datasets may be several years old
4. **Format inconsistency**: XLS, XLSX, CSV, HTML - requires format handling
5. **No standardized schema**: Field names vary by municipality
6. **Rate limiting**: Not documented; implement reasonable request spacing

---

## 10. Integration Recommendations

### For Akiya Japan App

1. **Use connector class** (see bodik-connector.ts) for standardized API access
2. **Implement caching** - data doesn't change frequently
3. **Handle multiple formats** - CSV parsing, Excel reading
4. **Geocode addresses** - many datasets lack coordinates
5. **Cross-reference** with other data sources for completeness
6. **Monitor updates** - check `metadata_modified` for changes

### Priority Datasets for Initial Integration
1. 長浜市 - Vacant house rates by district
2. 生駒市 - Vacant house rates and survey results
3. 石垣市 - Properties with elderly owners (at-risk properties)
4. 都城市 - Elderly owner properties
5. 福岡市 - Housing statistics (largest city coverage)

---

## References

- [CKAN API Documentation](https://docs.ckan.org/en/2.10/api/)
- [BODIK ODCS Developer Page](https://odcs.bodik.jp/developers/)
- [DataStore API](https://docs.ckan.org/en/2.9/maintaining/datastore.html#the-datastore-api)

---

*Report generated: 2026-03-16*
*Researcher: Sub-agent for Akiya Japan Project*
