#!/bin/bash
#
# Akiya Japan - Database Migration Script
# Handles export from Replit and import to Railway
#
# Usage:
#   ./scripts/migrate-database.sh export          # Export from current database
#   ./scripts/migrate-database.sh import          # Import to Railway database
#   ./scripts/migrate-database.sh verify          # Verify data integrity
#   ./scripts/migrate-database.sh full            # Full migration (export + import + verify)
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/akiya_backup_${TIMESTAMP}.sql"

# Tables to verify (in order of importance)
TABLES=(
  "sources"
  "airports"
  "listings"
  "property_entities"
  "raw_captures"
  "listing_variants"
  "ckan_datasets"
  "ckan_resources"
  "reinfolib_transactions"
  "partner_sources_config"
  "translation_cache"
  "ingestion_logs"
  "sync_cursors"
  "source_feeds"
)

# Print functions
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"
  
  # Check pg_dump
  if ! command -v pg_dump &> /dev/null; then
    print_error "pg_dump not found. Please install PostgreSQL client tools."
    echo "  macOS: brew install postgresql@16"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
  fi
  print_success "pg_dump found"
  
  # Check psql
  if ! command -v psql &> /dev/null; then
    print_error "psql not found. Please install PostgreSQL client tools."
    exit 1
  fi
  print_success "psql found"
  
  # Check railway CLI
  if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Some commands may fail."
    echo "  Install: npm install -g @railway/cli"
  else
    print_success "Railway CLI found"
  fi
  
  # Create backup directory
  mkdir -p "$BACKUP_DIR"
  print_success "Backup directory ready: $BACKUP_DIR"
}

# Get database URLs
get_source_db_url() {
  # Check for Replit DATABASE_URL
  if [ -n "$DATABASE_URL" ]; then
    echo "$DATABASE_URL"
  else
    print_error "DATABASE_URL not set"
    echo "Please set the source database URL:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
    exit 1
  fi
}

get_target_db_url() {
  # Check for Railway DATABASE_URL (should be set via railway run or environment)
  if [ -n "$DATABASE_URL" ]; then
    echo "$DATABASE_URL"
  else
    print_error "DATABASE_URL not set for target database"
    echo "Please run via Railway CLI:"
    echo "  railway run ./scripts/migrate-database.sh import"
    exit 1
  fi
}

# Export database
export_database() {
  print_header "Exporting Database from Source"
  
  local SOURCE_URL
  SOURCE_URL=$(get_source_db_url)
  
  print_info "Source: ${SOURCE_URL//@*/@***:***@}"
  print_info "Backup file: $BACKUP_FILE"
  
  # Create backup with pg_dump
  print_info "Running pg_dump (this may take a few minutes)..."
  
  pg_dump \
    --verbose \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --create \
    "$SOURCE_URL" > "$BACKUP_FILE"
  
  if [ $? -eq 0 ]; then
    local FILE_SIZE
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Export complete: $FILE_SIZE"
    
    # Show row counts
    print_info "Row counts from source:"
    get_row_counts "$SOURCE_URL"
  else
    print_error "Export failed"
    exit 1
  fi
}

# Import database
import_database() {
  print_header "Importing Database to Target"
  
  local TARGET_URL
  TARGET_URL=$(get_target_db_url)
  
  # Find latest backup file
  local LATEST_BACKUP
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/akiya_backup_*.sql 2>/dev/null | head -1)
  
  if [ -z "$LATEST_BACKUP" ]; then
    print_error "No backup file found in $BACKUP_DIR"
    print_info "Run export first: ./scripts/migrate-database.sh export"
    exit 1
  fi
  
  print_info "Target: ${TARGET_URL//@*/@***:***@}"
  print_info "Backup file: $LATEST_BACKUP"
  
  # Confirm before proceeding
  print_warning "This will DROP and recreate all tables. Continue? (y/N)"
  read -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    print_info "Import cancelled"
    exit 0
  fi
  
  # Import with psql
  print_info "Running psql import (this may take a few minutes)..."
  
  psql \
    --variable=ON_ERROR_STOP=1 \
    "$TARGET_URL" < "$LATEST_BACKUP"
  
  if [ $? -eq 0 ]; then
    print_success "Import complete"
    
    # Show row counts
    print_info "Row counts in target:"
    get_row_counts "$TARGET_URL"
  else
    print_error "Import failed"
    exit 1
  fi
}

# Get row counts for all tables
get_row_counts() {
  local DB_URL="$1"
  
  psql "$DB_URL" -t -c "
    SELECT 
      'listings' as table_name, COUNT(*) as count FROM listings
    UNION ALL SELECT 'property_entities', COUNT(*) FROM property_entities
    UNION ALL SELECT 'raw_captures', COUNT(*) FROM raw_captures
    UNION ALL SELECT 'ckan_datasets', COUNT(*) FROM ckan_datasets
    UNION ALL SELECT 'ckan_resources', COUNT(*) FROM ckan_resources
    UNION ALL SELECT 'reinfolib_transactions', COUNT(*) FROM reinfolib_transactions
    UNION ALL SELECT 'sources', COUNT(*) FROM sources
    UNION ALL SELECT 'translation_cache', COUNT(*) FROM translation_cache
    UNION ALL SELECT 'ingestion_logs', COUNT(*) FROM ingestion_logs
    ORDER BY count DESC;
  " 2>/dev/null | grep -v "^$" || echo "  (No data or connection error)"
}

# Verify data integrity
verify_migration() {
  print_header "Verifying Data Integrity"
  
  local TARGET_URL
  TARGET_URL=$(get_target_db_url)
  
  print_info "Checking table structure and data..."
  
  # Check if tables exist
  local TABLE_COUNT
  TABLE_COUNT=$(psql "$TARGET_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
  
  if [ "$TABLE_COUNT" -eq 0 ]; then
    print_error "No tables found in target database"
    exit 1
  fi
  
  print_success "Found $TABLE_COUNT tables"
  
  # Check row counts
  print_info "Row counts:"
  get_row_counts "$TARGET_URL"
  
  # Check for critical tables
  print_info "Checking critical tables..."
  
  for TABLE in "${TABLES[@]}"; do
    if psql "$TARGET_URL" -t -c "SELECT 1 FROM $TABLE LIMIT 1;" > /dev/null 2>&1; then
      print_success "Table '$TABLE' accessible"
    else
      print_error "Table '$TABLE' not accessible"
    fi
  done
  
  # Test database connectivity
  print_info "Testing database connectivity..."
  if psql "$TARGET_URL" -c "SELECT version();" > /dev/null 2>&1; then
    print_success "Database connectivity confirmed"
  else
    print_error "Database connectivity failed"
    exit 1
  fi
  
  print_success "Verification complete"
}

# Full migration process
full_migration() {
  print_header "Starting Full Migration"
  
  check_prerequisites
  export_database
  import_database
  verify_migration
  
  print_header "Migration Complete"
  print_success "Database successfully migrated!"
  print_info "Next steps:"
  echo "  1. Deploy application to Railway: railway up"
  echo "  2. Configure custom domain: railway domain add your-domain.com"
  echo "  3. Update DNS records to point to Railway"
  echo "  4. Test all functionality"
}

# List available backups
list_backups() {
  print_header "Available Backups"
  
  if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
    ls -lh "$BACKUP_DIR"/akiya_backup_*.sql 2>/dev/null | awk '{print $9, "("$5")", $6, $7, $8}'
  else
    print_info "No backups found"
  fi
}

# Clean old backups
cleanup_backups() {
  print_header "Cleaning Old Backups"
  
  # Keep last 5 backups
  local BACKUP_COUNT
  BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/akiya_backup_*.sql 2>/dev/null | wc -l)
  
  if [ "$BACKUP_COUNT" -gt 5 ]; then
    print_info "Removing old backups (keeping 5 most recent)..."
    ls -t "$BACKUP_DIR"/akiya_backup_*.sql | tail -n +6 | xargs rm -f
    print_success "Cleanup complete"
  else
    print_info "Only $BACKUP_COUNT backups found, nothing to clean"
  fi
}

# Show usage
show_usage() {
  echo "Akiya Japan - Database Migration Script"
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  export          Export database from current DATABASE_URL"
  echo "  import          Import database to Railway (run via 'railway run')"
  echo "  verify          Verify data integrity in target database"
  echo "  full            Run complete migration (export + import + verify)"
  echo "  list            List available backup files"
  echo "  cleanup         Remove old backup files (keeps 5 most recent)"
  echo "  help            Show this help message"
  echo ""
  echo "Environment Variables:"
  echo "  DATABASE_URL    PostgreSQL connection string"
  echo ""
  echo "Examples:"
  echo "  # Export from Replit"
  echo "  export DATABASE_URL='postgresql://...'"
  echo "  $0 export"
  echo ""
  echo "  # Import to Railway"
  echo "  railway run $0 import"
  echo ""
  echo "  # Full migration"
  echo "  $0 full"
}

# Main
main() {
  case "${1:-help}" in
    export)
      check_prerequisites
      export_database
      ;;
    import)
      check_prerequisites
      import_database
      ;;
    verify)
      verify_migration
      ;;
    full)
      full_migration
      ;;
    list)
      list_backups
      ;;
    cleanup)
      cleanup_backups
      ;;
    help|--help|-h)
      show_usage
      ;;
    *)
      print_error "Unknown command: $1"
      show_usage
      exit 1
      ;;
  esac
}

main "$@"
