#!/usr/bin/env python3
"""
BODIK CKAN Data Ingestion Tool (Enhanced)

Connects to the BODIK CKAN API (https://data.bodik.jp/api/3/action/)
to fetch akiya (vacant house) listings using wide-search logic.

Features:
- Multi-keyword search: 空き家, 空き家バンク, 住宅一覧
- Full pagination through all results
- Handles CSV, XLSX, JSON resources
- Uses datastore_search for active datastores
- Downloads and parses static files via pandas
- SQLite storage with deduplication
- Resilient error handling
- Japanese era year conversion (昭和/平成/令和)
- Unit normalization (Tsubo → m², price cleanup)
- Field mapping from Japanese to English
"""

import sqlite3
import requests
import json
import hashlib
import logging
import io
import re
from datetime import datetime
from typing import Optional, Dict, List, Any, Set, Union
from pathlib import Path

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None  # type: ignore
    PANDAS_AVAILABLE = False
    print("Warning: pandas not available. Static file parsing disabled.")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# DATA TRANSFORMATION CONSTANTS AND FUNCTIONS
# =============================================================================

# Japanese era start years (Gregorian)
ERA_START_YEARS = {
    "明治": 1868,  # Meiji
    "大正": 1912,  # Taisho
    "昭和": 1926,  # Showa
    "平成": 1989,  # Heisei
    "令和": 2019,  # Reiwa
}

# Tsubo to square meters conversion factor
TSUBO_TO_SQM = 3.30579  # 1 tsubo = 3.30579 m²

# Japanese field name mappings to standardized English field names
FIELD_MAPPINGS = {
    # Price fields
    "price": ["価格", "希望価格", "売却価格", "金額", "売買価格", "賃料", "販売価格", "売出価格", "譲渡価格"],
    
    # Location fields
    "full_location": ["所在地", "住所", "位置", "物件所在地", "物件住所", "所在", "地番", "住所地番"],
    
    # House size fields
    "house_size": ["延床面積", "建物面積", "床面積", "建築面積", "専有面積", "延べ床面積"],
    
    # Land size fields
    "land_size": ["土地面積", "敷地面積", "宅地面積", "地積"],
    
    # Year built fields
    "year_built": ["築年", "建築年", "建築時期", "築年月", "建築年月", "建築年次", "竣工年"],
    
    # Listing type fields
    "listing_type": ["取引形態", "物件区分", "取引態様", "種別", "物件種別", "取引種別"],
    
    # Layout/rooms fields
    "layout": ["間取り", "部屋数", "間取", "LDK", "部屋構成"],
    
    # Structure fields
    "structure": ["構造", "建物構造", "主要構造", "主構造"],
    
    # Title/name fields
    "title": ["名称", "物件名", "title", "name", "タイトル", "施設名", "物件番号"],
}

# Photo/image field keys to search in CSV columns
PHOTO_KEYS = ["画像", "外観写真", "写真1", "写真2", "写真3", "image_url", "thumbnail", 
              "photo", "photo_url", "image", "写真", "外観", "物件写真"]

# Structure type categories (ordered from most specific to least specific)
STRUCTURE_CATEGORIES = [
    ("src", ["鉄骨鉄筋コンクリート", "SRC造", "SRC"]),
    ("rc", ["鉄筋コンクリート", "RC造", "コンクリート造"]),
    ("steel", ["鉄骨造", "S造", "鉄骨", "軽量鉄骨", "重量鉄骨", "スチール"]),
    ("wood", ["木造", "木質", "W造", "在来工法", "木構造"]),
]


def convert_era_to_year(date_str: Optional[str]) -> Optional[int]:
    """
    Convert Japanese era dates to Gregorian year.
    
    Examples:
        '昭和56年' -> 1981
        '平成元年' -> 1989
        '令和3年' -> 2021
        '1985年' -> 1985
        '昭和56年3月' -> 1981
    
    Args:
        date_str: Japanese date string with era or Gregorian year
        
    Returns:
        Gregorian year as integer, or None if cannot parse
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    date_str = date_str.strip()
    
    # Try direct Gregorian year extraction (e.g., "1985年" or "1985")
    gregorian_match = re.search(r'(19\d{2}|20\d{2})', date_str)
    if gregorian_match and not any(era in date_str for era in ERA_START_YEARS.keys()):
        return int(gregorian_match.group(1))
    
    # Try Japanese era conversion
    for era, start_year in ERA_START_YEARS.items():
        if era in date_str:
            # Match patterns like "昭和56年" or "昭和元年"
            era_pattern = rf'{era}(\d+|元)年?'
            match = re.search(era_pattern, date_str)
            if match:
                year_part = match.group(1)
                if year_part == "元":
                    # 元年 means Year 1
                    era_year = 1
                else:
                    era_year = int(year_part)
                return start_year + era_year - 1
    
    return None


def normalize_area_to_sqm(value: Optional[Union[str, float, int]]) -> Optional[float]:
    """
    Normalize area values to square meters.
    
    Handles:
        - Tsubo (坪) -> multiply by 3.30579
        - Plain numeric values assumed to be m²
        - Strings with units like "100㎡", "30坪", "50m2"
    
    Args:
        value: Area value as string or number
        
    Returns:
        Area in square meters, or None if cannot parse
    """
    if value is None:
        return None
    
    # Handle numeric types directly
    if isinstance(value, (int, float)):
        if PANDAS_AVAILABLE:
            try:
                if pd.isna(value):
                    return None
            except (TypeError, ValueError):
                pass
        return float(value) if value > 0 else None
    
    if not isinstance(value, str):
        return None
    
    value = value.strip()
    if not value:
        return None
    
    # Check for Tsubo (坪)
    is_tsubo = "坪" in value
    
    # Remove units and extract numeric value
    # Clean up common patterns - use specific patterns to avoid removing digits
    cleaned = value.replace(",", "").replace("，", "")
    # Remove unit patterns (order matters: m2 before m)
    cleaned = re.sub(r'㎡|m²|m2|平方メートル|平米|坪', '', cleaned)
    cleaned = re.sub(r'[約程度以上以下未満]', '', cleaned)
    cleaned = cleaned.strip()
    
    # Extract numeric part (handle ranges like "100-120" by taking first value)
    numeric_match = re.search(r'(\d+(?:\.\d+)?)', cleaned)
    if not numeric_match:
        return None
    
    try:
        area = float(numeric_match.group(1))
        if is_tsubo:
            area *= TSUBO_TO_SQM
        return area if area > 0 else None
    except (ValueError, TypeError):
        return None


def normalize_price_to_int(value: Optional[Union[str, float, int]]) -> Optional[int]:
    """
    Normalize price values to integer (Japanese Yen).
    
    Handles:
        - Strings with commas: "1,000,000円" -> 1000000
        - Strings with 万 (10,000 units): "100万円" -> 1000000
        - Strings with 億 (100,000,000 units): "1億円" -> 100000000
        - Plain numbers
        - "無料", "0円", etc. -> 0
    
    Args:
        value: Price value as string or number
        
    Returns:
        Price in JPY as integer, or None if cannot parse
    """
    if value is None:
        return None
    
    # Handle numeric types
    if isinstance(value, (int, float)):
        if PANDAS_AVAILABLE:
            try:
                if pd.isna(value):
                    return None
            except (TypeError, ValueError):
                pass
        return int(value) if value >= 0 else None
    
    if not isinstance(value, str):
        return None
    
    value = value.strip()
    if not value:
        return None
    
    # Free / no charge patterns (use regex for exact matching)
    free_patterns = [r'^無料', r'^無償', r'^0円$', r'^譲渡$', r'^要相談']
    if any(re.search(pattern, value) for pattern in free_patterns):
        return 0
    
    # Remove currency symbols and common suffixes
    cleaned = value.replace(",", "").replace("，", "")
    cleaned = re.sub(r'[円¥]', '', cleaned)
    cleaned = re.sub(r'税[込別]?', '', cleaned)
    cleaned = cleaned.strip()
    
    total = 0
    
    # Handle 億 (100 million)
    oku_match = re.search(r'(\d+(?:\.\d+)?)\s*億', cleaned)
    if oku_match:
        total += float(oku_match.group(1)) * 100_000_000
        cleaned = cleaned.replace(oku_match.group(0), '')
    
    # Handle 万 (10 thousand)
    man_match = re.search(r'(\d+(?:\.\d+)?)\s*万', cleaned)
    if man_match:
        total += float(man_match.group(1)) * 10_000
        cleaned = cleaned.replace(man_match.group(0), '')
    
    # Handle remaining plain numbers (after stripping 万/億 patterns)
    # If no 万/億 were found, try to parse the entire cleaned string as a number
    if total == 0:
        plain_match = re.search(r'(\d+(?:\.\d+)?)', cleaned)
        if plain_match:
            total = float(plain_match.group(1))
    
    # Return the total, or None if we couldn't parse anything meaningful
    if total > 0:
        return int(total)
    elif total == 0:
        # Only return 0 if explicitly free/no charge, otherwise None
        return 0 if any(re.search(p, value) for p in free_patterns) else None
    else:
        return None


def extract_structure_category(value: Optional[str]) -> Optional[str]:
    """
    Extract structure category from Japanese structure description.
    
    Args:
        value: Structure description in Japanese
        
    Returns:
        Standardized category: "wood", "steel", "rc", "src", or None
    """
    if not value or not isinstance(value, str):
        return None
    
    value = value.strip()
    
    # STRUCTURE_CATEGORIES is ordered from most specific to least specific
    for category, patterns in STRUCTURE_CATEGORIES:
        for pattern in patterns:
            if pattern in value:
                return category
    
    return None


def extract_field_value(record: Dict[str, Any], field_name: str) -> Optional[str]:
    """
    Extract a field value from a record using the field mappings.
    
    Args:
        record: Raw data record dictionary
        field_name: Standardized field name (e.g., "price", "full_location")
        
    Returns:
        Field value as string, or None if not found
    """
    if field_name not in FIELD_MAPPINGS:
        return None
    
    for japanese_key in FIELD_MAPPINGS[field_name]:
        if japanese_key in record:
            value = record[japanese_key]
            if value is not None:
                if PANDAS_AVAILABLE:
                    try:
                        if pd.isna(value):
                            continue
                    except (TypeError, ValueError):
                        pass
                return str(value).strip() if str(value).strip() else None
    
    return None


def extract_photos(row: Dict[str, Any], package_metadata: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Extract photo URLs from a record and optionally from package metadata.
    
    Searches for photos in:
    1. CSV column fields (画像, 外観写真, 写真1, image_url, etc.)
    2. Dataset resources with image formats (JPG, JPEG, PNG)
    
    Args:
        row: Raw record dictionary from CKAN source
        package_metadata: Optional CKAN package metadata with resources list
        
    Returns:
        List of photo URLs found
    """
    photos: List[str] = []
    
    # 1. Check CSV Columns for photo URLs
    for key in PHOTO_KEYS:
        value = row.get(key)
        if value:
            if PANDAS_AVAILABLE:
                try:
                    if pd.isna(value):
                        continue
                except (TypeError, ValueError):
                    pass
            url = str(value).strip()
            if url and url.startswith(('http://', 'https://')):
                photos.append(url)
    
    # 2. Check Dataset Resources for image files (if no photos in columns)
    if not photos and package_metadata:
        for res in package_metadata.get('resources', []):
            res_format = res.get('format', '').upper()
            if res_format in ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP']:
                res_url = res.get('url', '')
                if res_url:
                    photos.append(res_url)
    
    return photos


def transform_listing(raw_data: Dict[str, Any], package_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Transform raw Japanese CKAN listing data into standardized database format.
    
    Takes a raw JSON dictionary from BODIK and returns a cleaned, normalized
    version ready for SQL database insertion.
    
    Args:
        raw_data: Raw record dictionary from CKAN source
        package_metadata: Optional CKAN package metadata for photo extraction
        
    Returns:
        Standardized dictionary with the following fields:
            - title: str or None
            - full_location: str or None (original Japanese address)
            - price_jpy: int or None (normalized to integer JPY)
            - house_size_sqm: float or None (normalized to m²)
            - land_size_sqm: float or None (normalized to m²)
            - year_built: int or None (Gregorian year)
            - layout: str or None (e.g., "3LDK")
            - listing_type: str or None
            - structure: str or None ("wood", "steel", "rc", "src")
            - photos: list of photo URLs
            - raw_data: str (original JSON preserved)
    """
    # Extract raw field values
    title_raw = extract_field_value(raw_data, "title")
    location_raw = extract_field_value(raw_data, "full_location")
    price_raw = extract_field_value(raw_data, "price")
    house_size_raw = extract_field_value(raw_data, "house_size")
    land_size_raw = extract_field_value(raw_data, "land_size")
    year_built_raw = extract_field_value(raw_data, "year_built")
    layout_raw = extract_field_value(raw_data, "layout")
    listing_type_raw = extract_field_value(raw_data, "listing_type")
    structure_raw = extract_field_value(raw_data, "structure")
    
    # Extract photos from row and package metadata
    photos = extract_photos(raw_data, package_metadata)
    
    # Transform and normalize values
    transformed = {
        "title": title_raw,
        "full_location": location_raw,
        "price_jpy": normalize_price_to_int(price_raw),
        "house_size_sqm": normalize_area_to_sqm(house_size_raw),
        "land_size_sqm": normalize_area_to_sqm(land_size_raw),
        "year_built": convert_era_to_year(year_built_raw),
        "layout": layout_raw,
        "listing_type": listing_type_raw,
        "structure": extract_structure_category(structure_raw),
        "photos": photos if photos else None,
        "raw_data": json.dumps(raw_data, ensure_ascii=False, default=str),
    }
    
    return transformed


# =============================================================================
# INGESTION CONSTANTS
# =============================================================================

BODIK_API_BASE = "https://data.bodik.jp/api/3/action"
SEARCH_KEYWORDS = ["空き家", "空き家バンク", "住宅一覧"]
ROWS_PER_PAGE = 100
DB_PATH = Path(__file__).parent.parent / "data" / "bodik_akiya.db"

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "ja,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

SUPPORTED_FORMATS = {"CSV", "XLSX", "JSON", "XLS"}

# Legacy field keys (kept for backward compatibility)
ADDRESS_FIELD_KEYS = ["所在地", "住所", "address", "location", "所在", "地番", "物件所在地", "物件住所"]
PRICE_FIELD_KEYS = ["価格", "金額", "売買価格", "賃料", "price", "希望価格", "販売価格", "売却価格"]
TITLE_FIELD_KEYS = ["名称", "物件名", "title", "name", "タイトル", "施設名", "物件番号"]


class BodikIngestion:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.session = requests.Session()
        self.session.headers.update(BROWSER_HEADERS)
        self.seen_dataset_ids: Set[str] = set()
        self._init_database()

    def _init_database(self):
        """Initialize SQLite database with enhanced schema."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DROP TABLE IF EXISTS listings")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS listings (
                id TEXT PRIMARY KEY,
                source_municipality TEXT NOT NULL,
                dataset_title TEXT,
                property_address TEXT,
                price TEXT,
                listing_url TEXT,
                resource_id TEXT,
                last_updated TIMESTAMP,
                raw_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_source_municipality ON listings(source_municipality)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_resource_id ON listings(resource_id)
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {self.db_path}")

    def _is_valid_json(self, response: requests.Response) -> bool:
        """Validate that response is JSON before parsing."""
        content_type = response.headers.get("Content-Type", "")
        
        if "text/html" in content_type:
            return False
        
        try:
            text = response.text.strip()
            if text.startswith("<") or text.startswith("<!"):
                return False
        except Exception:
            pass
        
        return True

    def _safe_request(self, url: str, params: Optional[Dict] = None, stream: bool = False) -> Optional[requests.Response]:
        """Make a request with error handling."""
        try:
            response = self.session.get(url, params=params, timeout=60, stream=stream)
            
            if response.status_code == 404:
                logger.debug(f"404 Not Found: {url}")
                return None
            
            if response.status_code != 200:
                logger.warning(f"HTTP {response.status_code}: {url}")
                return None
            
            return response
                
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout: {url}")
            return None
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return None

    def _safe_json_request(self, url: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make a JSON API request with validation."""
        response = self._safe_request(url, params)
        
        if not response:
            return None
        
        if not self._is_valid_json(response):
            logger.warning(f"Non-JSON response from {url}")
            return None
        
        try:
            return response.json()
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return None

    def search_all_packages(self) -> List[Dict]:
        """Search for packages across all keywords with full pagination."""
        all_packages = []
        
        for keyword in SEARCH_KEYWORDS:
            logger.info(f"Searching for keyword: '{keyword}'")
            start = 0
            
            while True:
                url = f"{BODIK_API_BASE}/package_search"
                params = {
                    "q": keyword,
                    "rows": ROWS_PER_PAGE,
                    "start": start,
                }
                
                result = self._safe_json_request(url, params)
                
                if not result or not result.get("success"):
                    logger.warning(f"Failed to search at offset {start}")
                    break
                
                results_data = result.get("result", {})
                packages = results_data.get("results", [])
                total_count = results_data.get("count", 0)
                
                if not packages:
                    break
                
                for pkg in packages:
                    pkg_id = pkg.get("id")
                    if pkg_id and pkg_id not in self.seen_dataset_ids:
                        self.seen_dataset_ids.add(pkg_id)
                        all_packages.append(pkg)
                
                logger.info(f"  Fetched {start + len(packages)}/{total_count} packages for '{keyword}'")
                
                start += ROWS_PER_PAGE
                if start >= total_count:
                    break
        
        logger.info(f"Total unique packages found: {len(all_packages)}")
        return all_packages

    def get_datastore_records(self, resource_id: str, limit: int = 32000) -> List[Dict]:
        """Fetch records from a resource using datastore_search with pagination."""
        all_records = []
        offset = 0
        page_size = 1000
        
        while True:
            url = f"{BODIK_API_BASE}/datastore_search"
            params = {
                "resource_id": resource_id,
                "limit": page_size,
                "offset": offset,
            }
            
            result = self._safe_json_request(url, params)
            
            if not result or not result.get("success"):
                break
            
            records = result.get("result", {}).get("records", [])
            if not records:
                break
            
            all_records.extend(records)
            offset += len(records)
            
            if len(records) < page_size or len(all_records) >= limit:
                break
        
        return all_records

    def download_and_parse_static_file(self, url: str, format_type: str, max_rows: int = 10) -> List[Dict]:
        """Download and parse static CSV/XLSX/JSON files using pandas."""
        if not PANDAS_AVAILABLE:
            logger.debug("Pandas not available, skipping static file")
            return []
        
        try:
            response = self._safe_request(url, stream=True)
            if not response:
                return []
            
            content = response.content
            
            if format_type.upper() == "CSV":
                for encoding in ["utf-8", "shift_jis", "cp932", "utf-8-sig"]:
                    try:
                        df = pd.read_csv(io.BytesIO(content), encoding=encoding, nrows=max_rows)
                        return df.to_dict(orient="records")
                    except (UnicodeDecodeError, pd.errors.ParserError):
                        continue
                logger.warning(f"Failed to parse CSV with any encoding: {url}")
                return []
            
            elif format_type.upper() in ("XLSX", "XLS"):
                try:
                    df = pd.read_excel(io.BytesIO(content), nrows=max_rows)
                    return df.to_dict(orient="records")
                except Exception as e:
                    logger.warning(f"Failed to parse Excel: {e}")
                    return []
            
            elif format_type.upper() == "JSON":
                try:
                    data = json.loads(content.decode("utf-8"))
                    if isinstance(data, list):
                        return data[:max_rows]
                    elif isinstance(data, dict):
                        if "records" in data:
                            return data["records"][:max_rows]
                        elif "results" in data:
                            return data["results"][:max_rows]
                        return [data]
                    return []
                except Exception as e:
                    logger.warning(f"Failed to parse JSON: {e}")
                    return []
            
            return []
            
        except Exception as e:
            logger.warning(f"Error downloading/parsing file {url}: {e}")
            return []

    def _extract_field(self, record: Dict, field_keys: List[str]) -> Optional[str]:
        """Extract a field value trying multiple possible keys."""
        for key in field_keys:
            if key in record and record[key]:
                value = record[key]
                if PANDAS_AVAILABLE:
                    try:
                        if pd.isna(value):
                            continue
                    except (TypeError, ValueError):
                        pass
                return str(value).strip()
        return None

    def _generate_id(self, resource_id: str, address: Optional[str], record: Dict) -> str:
        """Generate unique ID using resource_id and address hash."""
        if address:
            hash_input = f"{resource_id}:{address}"
        else:
            record_str = json.dumps(record, sort_keys=True, ensure_ascii=False)
            hash_input = f"{resource_id}:{record_str}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:32]

    def save_listing(self, listing: Dict) -> bool:
        """Save a listing to the database with deduplication."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO listings (id, source_municipality, dataset_title, property_address, 
                                      price, listing_url, resource_id, last_updated, raw_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    source_municipality = excluded.source_municipality,
                    dataset_title = excluded.dataset_title,
                    property_address = excluded.property_address,
                    price = excluded.price,
                    listing_url = excluded.listing_url,
                    last_updated = excluded.last_updated,
                    raw_data = excluded.raw_data
            """, (
                listing["id"],
                listing["source_municipality"],
                listing["dataset_title"],
                listing["property_address"],
                listing["price"],
                listing["listing_url"],
                listing["resource_id"],
                listing["last_updated"],
                listing["raw_data"],
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving listing: {e}")
            conn.close()
            return False

    def process_resource(self, resource: Dict, package: Dict) -> int:
        """Process a single resource and extract listings."""
        resource_id = resource.get("id", "")
        resource_url = resource.get("url", "")
        resource_format = resource.get("format", "").upper()
        datastore_active = resource.get("datastore_active", False)
        resource_name = resource.get("name", "")
        
        if resource_format not in SUPPORTED_FORMATS:
            return 0
        
        org = package.get("organization") or {}
        source_municipality = org.get("title") or org.get("name") or "BODIK"
        dataset_title = package.get("title", "Unknown Dataset")
        last_updated = resource.get("last_modified") or package.get("metadata_modified")
        
        records = []
        
        if datastore_active:
            logger.info(f"    [Datastore] {resource_name or resource_id}")
            records = self.get_datastore_records(resource_id)
        else:
            logger.info(f"    [Static {resource_format}] {resource_name or resource_id}")
            records = self.download_and_parse_static_file(resource_url, resource_format, max_rows=100)
        
        if not records:
            return 0
        
        saved_count = 0
        for record in records:
            try:
                address = self._extract_field(record, ADDRESS_FIELD_KEYS)
                price = self._extract_field(record, PRICE_FIELD_KEYS)
                title = self._extract_field(record, TITLE_FIELD_KEYS)
                
                listing_id = self._generate_id(resource_id, address, record)
                
                listing = {
                    "id": listing_id,
                    "source_municipality": source_municipality,
                    "dataset_title": title or dataset_title,
                    "property_address": address,
                    "price": price,
                    "listing_url": resource_url,
                    "resource_id": resource_id,
                    "last_updated": last_updated,
                    "raw_data": json.dumps(record, ensure_ascii=False, default=str),
                }
                
                if self.save_listing(listing):
                    saved_count += 1
                    
            except Exception as e:
                logger.debug(f"Error processing record: {e}")
                continue
        
        return saved_count

    def process_package(self, package: Dict) -> int:
        """Process a single package and all its resources."""
        package_title = package.get("title", "Unknown")
        resources = package.get("resources", [])
        
        supported_resources = [
            r for r in resources 
            if r.get("format", "").upper() in SUPPORTED_FORMATS
        ]
        
        if not supported_resources:
            return 0
        
        logger.info(f"Processing: {package_title} ({len(supported_resources)} resources)")
        
        total_saved = 0
        for resource in supported_resources:
            try:
                saved = self.process_resource(resource, package)
                total_saved += saved
            except Exception as e:
                logger.warning(f"Error processing resource: {e}")
                continue
        
        if total_saved > 0:
            logger.info(f"  -> Saved {total_saved} listings")
        
        return total_saved

    def run(self) -> Dict[str, int]:
        """Run the full ingestion process."""
        logger.info("=" * 70)
        logger.info("BODIK CKAN Wide-Search Ingestion Starting")
        logger.info(f"Keywords: {', '.join(SEARCH_KEYWORDS)}")
        logger.info("=" * 70)
        
        stats = {
            "packages_found": 0,
            "packages_with_data": 0,
            "total_records": 0,
            "errors": 0,
        }
        
        packages = self.search_all_packages()
        stats["packages_found"] = len(packages)
        
        for package in packages:
            try:
                saved = self.process_package(package)
                if saved > 0:
                    stats["packages_with_data"] += 1
                    stats["total_records"] += saved
            except Exception as e:
                logger.error(f"Error processing package: {e}")
                stats["errors"] += 1
                continue
        
        logger.info("=" * 70)
        logger.info("Ingestion Complete")
        logger.info(f"  Packages searched: {stats['packages_found']}")
        logger.info(f"  Packages with data: {stats['packages_with_data']}")
        logger.info(f"  Total records saved: {stats['total_records']}")
        logger.info(f"  Errors: {stats['errors']}")
        logger.info("=" * 70)
        
        return stats

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics from the database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM listings")
        total = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT source_municipality, COUNT(*) as count 
            FROM listings 
            GROUP BY source_municipality 
            ORDER BY count DESC
        """)
        by_municipality = cursor.fetchall()
        
        cursor.execute("SELECT COUNT(*) FROM listings WHERE property_address IS NOT NULL")
        with_address = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM listings WHERE price IS NOT NULL")
        with_price = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_listings": total,
            "with_address": with_address,
            "with_price": with_price,
            "by_municipality": by_municipality,
        }

    def get_sample_listings(self, limit: int = 10) -> List[Dict]:
        """Get sample listings with addresses."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT source_municipality, dataset_title, property_address, price, listing_url
            FROM listings
            WHERE property_address IS NOT NULL
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
    
    summary = ingestion.get_summary()
    
    logger.info("\n" + "=" * 70)
    logger.info("DATABASE SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Total listings: {summary['total_listings']}")
    logger.info(f"With address: {summary['with_address']}")
    logger.info(f"With price: {summary['with_price']}")
    
    logger.info("\nListings by municipality:")
    for municipality, count in summary["by_municipality"][:15]:
        logger.info(f"  {municipality}: {count}")
    
    sample = ingestion.get_sample_listings(5)
    if sample:
        logger.info("\nSample listings with addresses:")
        for listing in sample:
            addr = listing["property_address"][:40] if listing["property_address"] else "N/A"
            price = listing["price"][:20] if listing["price"] else "N/A"
            logger.info(f"  [{listing['source_municipality']}] {addr}... | {price}")
    
    return stats


if __name__ == "__main__":
    main()
