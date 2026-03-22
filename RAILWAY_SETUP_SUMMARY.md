# Railway Migration - Implementation Summary

**Date:** March 22, 2026  
**Status:** Configuration files committed, ready for Railway setup

---

## What Was Created

### 1. Documentation
- ✅ `docs/RAILWAY_MIGRATION_GUIDE.md` - Comprehensive 350+ line migration guide

### 2. Railway Configuration
- ✅ `railway.yaml` - Railway deployment configuration
- ✅ `Dockerfile` - Alternative Docker deployment option
- ✅ `.dockerignore` - Docker build exclusions

### 3. Database Migration
- ✅ `scripts/migrate-database.sh` - Complete database migration script with:
  - Export functionality for Replit PostgreSQL
  - Import functionality for Railway PostgreSQL
  - Data integrity verification
  - Backup management

### 4. Application Changes
- ✅ Health check endpoint (`/api/health`) added to server/routes.ts
- ✅ `.env.example` - Environment variables template
- ✅ `.gitignore` updated for backups and env files

### 5. CI/CD (Pending Manual Addition)
- ⏳ `.github/workflows/deploy-railway.yml` - GitHub Actions workflow (needs manual add)

---

## Next Steps

### Step 1: Create Railway Account
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login
```

### Step 2: Initialize Railway Project
```bash
cd /Users/openclaw/.openclaw/workspace/akiya-app
railway init --name akiya-japan
```

### Step 3: Add PostgreSQL Service
```bash
railway add --database postgres
```

### Step 4: Set Environment Variables
```bash
railway variables set SESSION_SECRET="$(openssl rand -hex 32)"
railway variables set OPENAI_API_KEY="sk-..."
railway variables set REINFOLIB_API_KEY="..."
railway variables set NODE_ENV="production"
railway variables set PORT="5000"
```

### Step 5: Migrate Database
```bash
# Export from Replit first
export DATABASE_URL="postgresql://replit-connection-string"
./scripts/migrate-database.sh export

# Import to Railway
railway run ./scripts/migrate-database.sh import
```

### Step 6: Deploy
```bash
railway up
```

### Step 7: Add CI/CD Workflow (Manual)
Since the GitHub token doesn't have workflow scope, you need to manually add the workflow file:

1. Go to: https://github.com/neko-no-otoko/ProjectYenListings
2. Navigate to: Actions → New workflow → Configure
3. Copy contents from `.github/workflows/deploy-railway.yml`
4. Add `RAILWAY_TOKEN` secret in Settings → Secrets and variables → Actions

---

## Files Location

All files are in the repository:
```
akiya-app/
├── .github/workflows/deploy-railway.yml  (pending manual add)
├── docs/RAILWAY_MIGRATION_GUIDE.md
├── railway.yaml
├── Dockerfile
├── .dockerignore
├── .env.example
├── scripts/migrate-database.sh
└── server/routes.ts (updated with health check)
```

---

## Estimated Costs

| Item | Cost |
|------|------|
| Railway Hobby Plan (min) | $5/month |
| PostgreSQL (included) | $0 |
| Compute (estimated) | $10-20/month |
| **Total Estimated** | **$15-25/month** |

(vs. $20-30/month currently on Replit)

---

## Key Benefits

1. **Lower Cost** - Estimated 25-40% savings
2. **Better PostgreSQL Support** - Native integration
3. **GitHub Auto-Deploy** - Push to deploy
4. **Custom Domains** - Included in Hobby plan
5. **Preview Environments** - Test PRs before merge

---

## Support Resources

- Full migration guide: `docs/RAILWAY_MIGRATION_GUIDE.md`
- Railway docs: https://docs.railway.app
- Database migration script: `./scripts/migrate-database.sh --help`

---

*Ready for Railway setup. See the full migration guide for detailed instructions.*
