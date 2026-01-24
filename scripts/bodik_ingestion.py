#!/usr/bin/env python3
"""
BODIK CKAN Data Ingestion Tool

Connects to the BODIK CKAN API (https://data.bodik.jp/api/3/action/)
to fetch akiya (vacant house) listings and store them in SQLite.

Features:
- Browser-like headers to avoid HTML error responses
- Drills down into CSV resources using datastore_search API
- Robust error handling for HTML responses and 404s
- JSON validation before parsing
- SQLite storage with deduplication
"""

import sqlite3
import requests
import json
import hashlib
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BODIK_API_BASE = "https://data.bodik.jp/api/3/action"
SEARCH_KEYWORD = "空き家"
DB_PATH = Path(__file__).parent.parent / "data" / "bodik_akiya.db"

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "ja,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


class BodikIngestion:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.session = requests.Session()
        self.session.headers.update(BROWSER_HEADERS)
        self._init_database()

    def _init_database(self):
        """Initialize SQLite database with listings table."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS listings (
                id TEXT PRIMARY KEY,
                source_portal TEXT NOT NULL,
                title TEXT,
                price TEXT,
                location TEXT,
                resource_url TEXT,
                raw_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_source_portal ON listings(source_portal)
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {self.db_path}")

    def _is_valid_json(self, response: requests.Response) -> bool:
        """Validate that response is JSON before parsing."""
        content_type = response.headers.get("Content-Type", "")
        
        if "text/html" in content_type:
            logger.warning("Received HTML response instead of JSON")
            return False
        
        if "application/json" not in content_type and "text/json" not in content_type:
            try:
                text = response.text.strip()
                if text.startswith("<") or text.startswith("<!"):
                    logger.warning("Response appears to be HTML/XML")
                    return False
            except Exception:
                pass
        
        return True

    def _safe_request(self, url: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make a request with error handling and JSON validation."""
        try:
            response = self.session.get(url, params=params, timeout=30)
            
            if response.status_code == 404:
                logger.warning(f"404 Not Found: {url}")
                return None
            
            if response.status_code != 200:
                logger.warning(f"HTTP {response.status_code}: {url}")
                return None
            
            if not self._is_valid_json(response):
                logger.error(f"Invalid JSON response from {url}")
                return None
            
            try:
                data = response.json()
                return data
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error: {e}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout: {url}")
            return None
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return None

    def search_packages(self) -> List[Dict]:
        """Search for akiya packages using package_search."""
        url = f"{BODIK_API_BASE}/package_search"
        params = {
            "q": SEARCH_KEYWORD,
            "rows": 100,
        }
        
        logger.info(f"Searching for '{SEARCH_KEYWORD}' packages...")
        result = self._safe_request(url, params)
        
        if not result:
            logger.error("Failed to search packages")
            return []
        
        if not result.get("success"):
            logger.error(f"API returned error: {result.get('error', 'Unknown')}")
            return []
        
        packages = result.get("result", {}).get("results", [])
        logger.info(f"Found {len(packages)} packages")
        return packages

    def get_datastore_records(self, resource_id: str) -> List[Dict]:
        """Fetch records from a resource using datastore_search."""
        url = f"{BODIK_API_BASE}/datastore_search"
        params = {
            "resource_id": resource_id,
            "limit": 1000,
        }
        
        result = self._safe_request(url, params)
        
        if not result:
            return []
        
        if not result.get("success"):
            error = result.get("error", {})
            if isinstance(error, dict) and error.get("__type") == "Validation Error":
                logger.debug(f"Resource {resource_id} not in datastore")
            else:
                logger.warning(f"Datastore error for {resource_id}: {error}")
            return []
        
        records = result.get("result", {}).get("records", [])
        return records

    def _extract_listing_fields(self, record: Dict, package: Dict, resource: Dict) -> Dict:
        """Extract standardized fields from a raw record."""
        title = None
        price = None
        location = None
        
        title_keys = ["名称", "物件名", "title", "name", "タイトル", "施設名"]
        for key in title_keys:
            if key in record and record[key]:
                title = str(record[key])
                break
        
        price_keys = ["価格", "金額", "売買価格", "賃料", "price", "希望価格"]
        for key in price_keys:
            if key in record and record[key]:
                price = str(record[key])
                break
        
        location_keys = ["所在地", "住所", "address", "location", "所在", "地番"]
        for key in location_keys:
            if key in record and record[key]:
                location = str(record[key])
                break
        
        if not title:
            title = package.get("title", "Unknown")
        
        return {
            "title": title,
            "price": price,
            "location": location,
        }

    def _generate_id(self, source_portal: str, record: Dict) -> str:
        """Generate a unique ID for a record."""
        record_str = json.dumps(record, sort_keys=True, ensure_ascii=False)
        hash_input = f"{source_portal}:{record_str}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:32]

    def save_listing(self, listing: Dict):
        """Save a listing to the database with upsert."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO listings (id, source_portal, title, price, location, resource_url, raw_data, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                price = excluded.price,
                location = excluded.location,
                resource_url = excluded.resource_url,
                raw_data = excluded.raw_data,
                updated_at = CURRENT_TIMESTAMP
        """, (
            listing["id"],
            listing["source_portal"],
            listing["title"],
            listing["price"],
            listing["location"],
            listing["resource_url"],
            listing["raw_data"],
        ))
        
        conn.commit()
        conn.close()

    def process_package(self, package: Dict) -> int:
        """Process a single package and its resources."""
        package_id = package.get("id", "unknown")
        package_title = package.get("title", "Unknown")
        org_title = package.get("organization", {}).get("title", "BODIK")
        
        logger.info(f"Processing package: {package_title}")
        
        resources = package.get("resources", [])
        csv_resources = [r for r in resources if r.get("format", "").upper() == "CSV"]
        
        if not csv_resources:
            logger.debug(f"No CSV resources in {package_title}")
            return 0
        
        records_saved = 0
        
        for resource in csv_resources:
            resource_id = resource.get("id")
            resource_url = resource.get("url", "")
            resource_name = resource.get("name", "")
            
            logger.info(f"  Fetching datastore for: {resource_name or resource_id}")
            records = self.get_datastore_records(resource_id)
            
            if not records:
                logger.debug(f"  No records found in datastore for {resource_id}")
                continue
            
            logger.info(f"  Found {len(records)} records")
            
            for record in records:
                try:
                    fields = self._extract_listing_fields(record, package, resource)
                    listing_id = self._generate_id(org_title, record)
                    
                    listing = {
                        "id": listing_id,
                        "source_portal": org_title,
                        "title": fields["title"],
                        "price": fields["price"],
                        "location": fields["location"],
                        "resource_url": resource_url,
                        "raw_data": json.dumps(record, ensure_ascii=False),
                    }
                    
                    self.save_listing(listing)
                    records_saved += 1
                    
                except Exception as e:
                    logger.error(f"Error saving record: {e}")
                    continue
        
        return records_saved

    def run(self) -> Dict[str, int]:
        """Run the full ingestion process."""
        logger.info("=" * 60)
        logger.info("BODIK CKAN Ingestion Starting")
        logger.info("=" * 60)
        
        stats = {
            "packages_found": 0,
            "packages_processed": 0,
            "records_saved": 0,
            "errors": 0,
        }
        
        packages = self.search_packages()
        stats["packages_found"] = len(packages)
        
        for package in packages:
            try:
                records_saved = self.process_package(package)
                stats["records_saved"] += records_saved
                stats["packages_processed"] += 1
            except Exception as e:
                logger.error(f"Error processing package: {e}")
                stats["errors"] += 1
                continue
        
        logger.info("=" * 60)
        logger.info("Ingestion Complete")
        logger.info(f"  Packages found: {stats['packages_found']}")
        logger.info(f"  Packages processed: {stats['packages_processed']}")
        logger.info(f"  Records saved: {stats['records_saved']}")
        logger.info(f"  Errors: {stats['errors']}")
        logger.info("=" * 60)
        
        return stats

    def get_listings(self, limit: int = 100) -> List[Dict]:
        """Retrieve listings from the database."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT source_portal, title, price, location, resource_url, created_at
            FROM listings
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]


def main():
    """Main entry point."""
    ingestion = BodikIngestion()
    stats = ingestion.run()
    
    if stats["records_saved"] > 0:
        logger.info("\nSample listings:")
        listings = ingestion.get_listings(limit=5)
        for listing in listings:
            logger.info(f"  - {listing['title'][:50]}... | {listing['location'] or 'N/A'} | {listing['price'] or 'N/A'}")
    
    return stats


if __name__ == "__main__":
    main()
