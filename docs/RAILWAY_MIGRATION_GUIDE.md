# Akiya Japan - Railway Migration Guide

**Date:** March 22, 2026  
**Status:** Ready for Implementation  
**Estimated Migration Time:** 2-4 hours  
**Downtime:** ~30 minutes (during DNS cutover)

---

## Table of Contents

1. [Pre-Migration Checklist](#1-pre-migration-checklist)
2. [Railway Project Setup](#2-railway-project-setup)
3. [Database Migration](#3-database-migration)
4. [Application Deployment](#4-application-deployment)
5. [Domain & SSL Configuration](#5-domain--ssl-configuration)
6. [Post-Migration Tasks](#6-post-migration-tasks)
7. [Rollback Plan](#7-rollback-plan)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Pre-Migration Checklist

### 1.1 Audit Current Environment

#### Current Replit Configuration
| Setting | Value |
|---------|-------|
| **Runtime** | Node.js 20 + Python 3.11 |
| **Database** | PostgreSQL 16 |
| **Build Command** | `npm run build` |
| **Start Command** | `node ./dist/index.cjs` |
| **Port** | 5000 |
| **Deployment** | Autoscale |

#### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...

# API Keys (required for production)
OPENAI_API_KEY=sk-...
REINFOLIB_API_KEY=...
LIFULL_PARTNER_ID=...
ATHOME_API_KEY=...

# Session/Security
SESSION_SECRET=...

# Optional: External Services
SENTRY_DSN=...
LOG_LEVEL=info
```

### 1.2 Document Database Schema

Current tables (from Drizzle schema):
- `sources` - Data source configurations
- `airports` - Airport reference data
- `listings` - Property listings
- `property_entities` - Canonical property records
- `raw_captures` - Raw data ingestion logs
- `listing_variants` - Property listing variants
- `ckan_datasets` - CKAN dataset metadata
- `ckan_resources` - CKAN resource metadata
- `reinfolib_transactions` - Transaction data
- `partner_sources_config` - Partner feed configs
- `translation_cache` - Translation cache
- `ingestion_logs` - Ingestion job logs
- `sync_cursors` - Sync state
- `source_feeds` - Feed configurations

### 1.3 List External Dependencies

| Service | Purpose | Required? |
|---------|---------|-----------|
| OpenAI API | Translation | ✅ Yes |
| ReinfoLib API | Transaction data | ✅ Yes |
| LIFULL API | Partner listings | ⚠️ Optional |
| AtHome API | Partner listings | ⚠️ Optional |
| GitHub API | Repository operations | ⚠️ Optional |

### 1.4 Pre-Migration Tasks

- [ ] Create Railway account (https://railway.app)
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login to CLI: `railway login`
- [ ] Backup current Replit database
- [ ] Notify stakeholders of maintenance window
- [ ] Prepare DNS access for domain updates

---

## 2. Railway Project Setup

### 2.1 Create New Project

```bash
# Navigate to project directory
cd /Users/openclaw/.openclaw/workspace/akiya-app

# Initialize Railway project
railway init --name akiya-japan

# Link to GitHub repository (if not already linked)
railway link
```

### 2.2 Add PostgreSQL Service

```bash
# Add PostgreSQL database
railway add --database postgres

# Get database connection URL
railway variables --service postgres
```

The `DATABASE_URL` will be automatically added to your project's environment variables.

### 2.3 Configure Environment Variables

Set all required environment variables in Railway dashboard or via CLI:

```bash
# Database (auto-populated from postgres service)
# DATABASE_URL=postgresql://...

# API Keys
railway variables set OPENAI_API_KEY="sk-..."
railway variables set REINFOLIB_API_KEY="..."
railway variables set LIFULL_PARTNER_ID="..."
railway variables set ATHOME_API_KEY="..."

# Session
railway variables set SESSION_SECRET="$(openssl rand -hex 32)"

# App Configuration
railway variables set PORT="5000"
railway variables set NODE_ENV="production"
railway variables set LOG_LEVEL="info"
```

**Note:** Railway automatically sets `PORT` but we override to 5000 for consistency.

---

## 3. Database Migration

### 3.1 Export Data from Replit

```bash
# In Replit Shell, create database dump
pg_dump $DATABASE_URL > akiya_backup_$(date +%Y%m%d_%H%M%S).sql

# Or use the migration script
./scripts/migrate-database.sh export
```

### 3.2 Prepare Database Schema

```bash
# Push Drizzle schema to new Railway database
railway run npm run db:push

# Verify tables created
railway run psql $DATABASE_URL -c "\dt"
```

### 3.3 Import Data

```bash
# Import data dump to Railway PostgreSQL
./scripts/migrate-database.sh import

# Or manually:
psql $DATABASE_URL < akiya_backup_YYYYMMDD_HHMMSS.sql
```

### 3.4 Verify Data Integrity

```bash
# Check table row counts
railway run psql $DATABASE_URL -c "
SELECT 'listings' as table_name, COUNT(*) as count FROM listings
UNION ALL
SELECT 'property_entities', COUNT(*) FROM property_entities
UNION ALL
SELECT 'raw_captures', COUNT(*) FROM raw_captures
UNION ALL
SELECT 'ckan_datasets', COUNT(*) FROM ckan_datasets
UNION ALL
SELECT 'reinfolib_transactions', COUNT(*) FROM reinfolib_transactions;
"

# Compare with Replit counts (should match)
```

---

## 4. Application Deployment

### 4.1 Deployment Configuration

Railway uses **Nixpacks** by default for Node.js projects. The configuration is in `railway.yaml`:

```yaml
# railway.yaml
build:
  builder: nixpacks
  config:
    nodeVersion: "20"
    
deploy:
  startCommand: "npm run start"
  healthcheckPath: "/api/health"
  healthcheckTimeout: 300
  restartPolicy:
    maxRetries: 3
```

### 4.2 Deploy Application

```bash
# Deploy to Railway
railway up

# Or with specific service
railway up --service akiya-japan

# View logs
railway logs --follow
```

### 4.3 Verify Deployment

```bash
# Get deployment URL
railway domain

# Test health endpoint
curl https://your-app.up.railway.app/api/health

# Test API endpoints
curl https://your-app.up.railway.app/api/listings?limit=5
```

---

## 5. Domain & SSL Configuration

### 5.1 Add Custom Domain

```bash
# Add custom domain via CLI
railway domain add akiya.example.com

# Or via Dashboard:
# Settings → Domains → Generate Domain / Custom Domain
```

### 5.2 Update DNS Records

| Record Type | Name | Value | TTL |
|-------------|------|-------|-----|
| CNAME | @ | your-app.up.railway.app | 300 |
| CNAME | www | your-app.up.railway.app | 300 |

**Note:** Railway automatically provisions SSL certificates via Let's Encrypt.

### 5.3 Verify SSL

```bash
# Check SSL certificate
curl -vI https://akiya.example.com 2>&1 | grep -i ssl

# Test HTTPS
curl https://akiya.example.com/api/health
```

---

## 6. Post-Migration Tasks

### 6.1 Enable Auto-Deploy

```bash
# Configure auto-deploy from GitHub
railway github

# Enable deploy on push
railway settings set deploy-on-push true
```

### 6.2 Set Up Monitoring

```bash
# Railway provides built-in metrics
# View at: https://railway.app/project/[id]/metrics

# Configure alerts (Pro plan)
railway alerts add --metric cpu --threshold 80
```

### 6.3 Configure Backups

Railway PostgreSQL includes:
- ✅ Automatic daily backups (retained for 7 days)
- ✅ Point-in-time recovery (Pro plan)
- ✅ Manual backup on demand

```bash
# Create manual backup
railway backup create --service postgres

# List backups
railway backup list --service postgres
```

### 6.4 Performance Testing

```bash
# Run load test (requires k6 or similar)
k6 run --vus 10 --duration 30s https://akiya.example.com

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://akiya.example.com/api/listings
```

### 6.5 Final Checklist

- [ ] All API endpoints responding correctly
- [ ] Database queries returning expected data
- [ ] External API integrations working
- [ ] Session/auth functioning
- [ ] Static assets loading
- [ ] Custom domain resolving
- [ ] SSL certificate valid
- [ ] Logs showing no errors
- [ ] Monitoring dashboard accessible

### 6.6 Decommission Replit

After 48 hours of stable operation:

1. Cancel Replit subscription
2. Export final data backup
3. Archive Replit project
4. Update documentation

---

## 7. Rollback Plan

### 7.1 Immediate Rollback

If critical issues arise:

1. **Revert DNS** - Point domain back to Replit
2. **Re-enable Replit** - Ensure Replit deployment is still running
3. **Investigate** - Check Railway logs for errors

### 7.2 Data Rollback

If data corruption occurs:

```bash
# Restore from pre-migration backup
# On Replit:
psql $DATABASE_URL < pre_migration_backup.sql
```

### 7.3 Rollback Triggers

Roll back immediately if:
- ❌ Database corruption detected
- ❌ Data loss confirmed
- ❌ Critical API endpoints failing
- ❌ Unable to serve traffic after 15 minutes

---

## 8. Troubleshooting

### Common Issues

#### Database Connection Failures
```bash
# Test connection
railway run psql $DATABASE_URL -c "SELECT 1"

# Check DATABASE_URL format
railway variables get DATABASE_URL
```

#### Build Failures
```bash
# Check build logs
railway logs --deployment [id]

# Test build locally
npm run build
```

#### Memory Issues
```bash
# Monitor memory usage
railway metrics --service [service-id]

# Scale up if needed (Pro plan)
railway scale --service [id] --memory 2GB
```

#### Slow Queries
```bash
# Check PostgreSQL slow query log
railway logs --service postgres

# Add indexes if needed
railway run psql $DATABASE_URL -f add_indexes.sql
```

### Support Resources

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Drizzle ORM: https://orm.drizzle.team
- PostgreSQL: https://www.postgresql.org/docs/

---

## Migration Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Preparation** | 30 min | Backup, audit, notify |
| **Railway Setup** | 15 min | Project, database, env vars |
| **Database Migration** | 30 min | Export, import, verify |
| **App Deployment** | 15 min | Build, deploy, test |
| **DNS Cutover** | 5 min | Update records, verify SSL |
| **Validation** | 30 min | Test all functionality |
| **Total** | ~2.5 hours | |

---

## Quick Reference Commands

```bash
# Railway CLI	railway login                    # Authenticate
railway init                     # Create project
railway link                     # Link to existing
railway up                       # Deploy
railway logs                     # View logs
railway variables                # Manage env vars
railway run [cmd]                # Run command with env
railway domain                   # Manage domains

# Database
pg_dump $DATABASE_URL > backup.sql
psql $DATABASE_URL < backup.sql
npm run db:push

# Monitoring	railway logs --follow
railway metrics
```

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026  
**Maintainer:** Sora
