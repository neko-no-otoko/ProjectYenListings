# Akiya Japan Website - Hosting Migration Plan

**Date:** March 22, 2026  
**Current Setup:** Replit (Node.js + Express + React + PostgreSQL)  
**Goal:** Evaluate and recommend alternative hosting providers

---

## Executive Summary

This document compares four hosting alternatives to the current Replit deployment for the Akiya Japan website. Based on the analysis, **Railway** emerges as the strongest recommendation due to its tight PostgreSQL integration, usage-based pricing, and minimal configuration overhead.

---

## Current State: Replit

| Feature | Details |
|---------|---------|
| **Plan** | Replit Core ($20/month with annual billing) |
| **Includes** | $25 monthly compute credits |
| **Database** | PostgreSQL-16 included |
| **Deployment** | Autoscale with `npm run build` → `node ./dist/index.cjs` |
| **Custom Domain** | ✅ Supported |
| **SSL** | ✅ Automatic |
| **CI/CD** | ✅ Git integration with auto-deploy |
| **Limitations** | Vendor lock-in, limited egress visibility, compute credit model can be unpredictable |

**Estimated Monthly Cost:** $20-30 (depending on traffic and compute usage)

---

## Option Comparison

### 1. Railway

| Category | Details |
|----------|---------|
| **Pricing Model** | Usage-based with minimum monthly commitment |
| **Hobby Plan** | $5/month minimum (includes $5 credits) |
| **Pro Plan** | $20/month minimum (includes $20 credits) |
| **Compute** | $0.00000772/vCPU/sec + $0.00000386/GB/sec |
| **Database** | ✅ **Native PostgreSQL support** - deploy any open-source DB |
| **Custom Domain** | ✅ Up to 2 on Hobby, 20 on Pro |
| **SSL Certificates** | ✅ Free automatic TLS |
| **CI/CD** | ✅ GitHub integration, preview environments |
| **Performance** | Global regions, concurrent deployment regions (Pro+) |
| **Storage** | 5 GB volume included (Hobby) |

**Pros:**
- PostgreSQL is a first-class citizen (same as current setup)
- Seamless migration from Replit - same architecture pattern
- Usage-based pricing means you pay only for what you use
- Excellent developer experience with minimal config
- Built-in database backups

**Cons:**
- Newer platform with less enterprise track record
- Egress fees ($0.05/GB) can add up with high traffic
- Free tier limited after 30-day trial ($1/month minimum)

**Estimated Monthly Cost:** $5-25 (similar usage to Replit Core)

---

### 2. Render

| Category | Details |
|----------|---------|
| **Pricing Model** | Tier-based with usage add-ons |
| **Hobby Tier** | $0/month (base) |
| **Professional** | $19/user/month |
| **Web Service Instances** | Free ($0) → Starter ($7) → Standard ($25) → Pro ($85+) |
| **Database** | ✅ PostgreSQL with high availability |
| **Custom Domain** | ✅ Up to 2 on Hobby, unlimited on paid tiers |
| **SSL Certificates** | ✅ Fully managed TLS |
| **CI/CD** | ✅ Auto-deploy from Git, preview environments (Pro+) |
| **Performance** | Global CDN, regional hosting |
| **Bandwidth** | 100 GB/month (Hobby), 500 GB (Pro) |

**Pros:**
- True free tier available for low-traffic sites
- Generous bandwidth allowance
- Zero-downtime deploys
- Established platform with good reliability reputation

**Cons:**
- Database is separate service - additional cost/complexity
- Free tier has cold starts (spin-down after 15 min inactivity)
- Need to pay for both web service ($7+) AND database to avoid cold starts
- Postgres pricing not clearly listed (typically $15-30/month)

**Estimated Monthly Cost:** $22-50 (Web Service Starter $7 + PostgreSQL ~$15-30 + egress)

---

### 3. Fly.io

| Category | Details |
|----------|---------|
| **Pricing Model** | Pure usage-based, no minimums |
| **Shared CPU-1x (1GB)** | ~$5.70/month if always running |
| **Shared CPU-2x (2GB)** | ~$11.39/month if always running |
| **Database** | ✅ Managed Postgres (separate pricing) |
| **Custom Domain** | ✅ Unlimited |
| **SSL Certificates** | ✅ Automatic via Let's Encrypt |
| **CI/CD** | ✅ GitHub Actions, fly deploy CLI |
| **Performance** | **Edge deployment** - closest to users globally |
| **Volumes** | $0.15/GB/month |

**Pros:**
- **Best for global performance** - edge deployment near users (great for Japan-focused site)
- Tokyo region available (NRT) - excellent for Japanese users
- Very fine-grained control over deployment
- Can scale to zero (pay nothing when idle)

**Cons:**
- **Steeper learning curve** - requires CLI knowledge
- Managed Postgres is separate (~$15-30/month minimum)
- More complex configuration (Docker-based)
- Need to manage both app and DB separately
- No native preview environments

**Estimated Monthly Cost:** $20-40 (Compute ~$6-12 + Postgres ~$15-25 + volumes/bandwidth)

---

### 4. Vercel + Neon

| Category | Details |
|----------|---------|
| **Vercel Hobby** | $0 (1M edge requests, 100GB bandwidth) |
| **Vercel Pro** | $20/user/month (10M requests, 1TB bandwidth) |
| **Neon Free** | $0 (100 projects, 0.5GB storage) |
| **Neon Launch** | ~$15/month typical |
| **Database** | ⚠️ Neon serverless PostgreSQL (separate service) |
| **Custom Domain** | ✅ Unlimited on all tiers |
| **SSL Certificates** | ✅ Automatic |
| **CI/CD** | ✅ Native Git integration, preview deployments |
| **Performance** | Global edge network (Vercel) |

**Pros:**
- **Best-in-class frontend deployment** (if migrating to Next.js)
- Excellent developer experience
- Generous free tier for both services
- Serverless scales to zero

**Cons:**
- **Requires architecture change** - Vercel is serverless/edge-first
- Current Express.js app would need significant refactoring
- Neon is serverless Postgres (connection limits, cold starts)
- Two separate vendors to manage
- Not ideal for traditional full-stack Express apps

**Estimated Monthly Cost:** $0-35 (Vercel free tier often sufficient + Neon Launch ~$15)

---

## Comparison Matrix

| Feature | Railway | Render | Fly.io | Vercel + Neon |
|---------|:-------:|:------:|:------:|:-------------:|
| **Monthly Cost (est.)** | $5-25 | $22-50 | $20-40 | $0-35 |
| **Database Included** | ✅ Native | ⚠️ Separate | ⚠️ Separate | ⚠️ Separate |
| **Custom Domains** | ✅ | ✅ | ✅ | ✅ |
| **SSL Certificates** | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto |
| **CI/CD Integration** | ✅ Git | ✅ Git | ✅ CLI/Git | ✅ Git |
| **Global/Edge Deploy** | ✅ (Pro) | ✅ CDN | ✅ **Best** | ✅ **CDN** |
| **Japan Region** | ✅ | ✅ | ✅ **Tokyo** | ✅ Edge |
| **Migration Effort** | 🟢 **Low** | 🟡 Medium | 🟡 Medium | 🔴 **High** |
| **Cold Starts** | ❌ No | ⚠️ Free tier | ⚠️ Optional | ⚠️ Serverless |
| **Learning Curve** | 🟢 Low | 🟢 Low | 🟡 Medium | 🟡 Medium |

---

## Detailed Analysis

### Cost Comparison (Monthly Estimates)

| Provider | Low Traffic | Medium Traffic | High Traffic |
|----------|-------------|----------------|--------------|
| **Replit (Current)** | $20 | $25-30 | $40+ |
| **Railway** | $5-10 | $15-25 | $35-60 |
| **Render** | $22 | $30-40 | $50-80 |
| **Fly.io** | $15-20 | $25-40 | $50-90 |
| **Vercel + Neon** | $0-15 | $20-35 | $40-70 |

### Database Considerations

Since Akiya Japan uses **PostgreSQL with Drizzle ORM**, database compatibility is critical:

1. **Railway** - PostgreSQL is native and well-supported
2. **Render** - PostgreSQL available but managed separately
3. **Fly.io** - Managed Postgres or self-hosted options
4. **Neon** - Serverless PostgreSQL with connection pooling (requires config adjustment)

### Performance for Japanese Users

Given the site serves **Japan real estate content**, location matters:

1. **Fly.io** 🥇 - Tokyo (NRT) region available, edge deployment
2. **Vercel** 🥈 - Edge network includes Asia-Pacific
3. **Railway** 🥉 - Global regions available
4. **Render** - Global CDN but compute location limited

---

## Recommendations

### 🏆 Primary Recommendation: Railway

**Why Railway is the best fit:**

1. **Seamless Migration** - Same Node.js + PostgreSQL stack as current Replit setup
2. **Cost Savings** - Likely 20-50% cheaper than Replit for same usage
3. **PostgreSQL Native** - No separate database service to manage
4. **Simple Configuration** - Minimal changes needed from current setup
5. **Good Enough Global** - While not edge-deployed like Fly.io, global regions available
6. **Developer Experience** - Similar "it just works" philosophy to Replit

**Migration Steps:**
1. Export PostgreSQL data from Replit
2. Create Railway account and project
3. Add PostgreSQL service to project
4. Import data dump
5. Deploy with `railway up` or Git integration
6. Configure custom domain
7. Update DNS records

### 🥈 Alternative: Fly.io (if performance is critical)

**Choose Fly.io if:**
- Target users are primarily in Japan (Tokyo region)
- You're comfortable with Docker and CLI tools
- You want the best possible latency for Japanese users
- You're okay with managing separate database service

### 🥉 Budget Option: Render

**Choose Render if:**
- You want a true free tier option initially
- You prefer a more established platform
- You're okay with slightly higher costs for simplicity

### ❌ Not Recommended: Vercel + Neon

**Why not:**
- Requires significant refactoring of Express.js backend
- Serverless architecture mismatch with current design
- Two separate vendors increase complexity
- Best suited for Next.js apps, not traditional Express APIs

---

## Migration Checklist

### Pre-Migration
- [ ] Export current PostgreSQL database
- [ ] Document all environment variables
- [ ] Note current build commands and entry points
- [ ] Check for any Replit-specific configurations

### Migration Steps (Railway)
- [ ] Create Railway account
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login: `railway login`
- [ ] Initialize project: `railway init`
- [ ] Add PostgreSQL: `railway add --database postgres`
- [ ] Import database dump
- [ ] Set environment variables in Railway dashboard
- [ ] Deploy: `railway up`
- [ ] Configure custom domain in Railway settings
- [ ] Update DNS A/CNAME records
- [ ] Test all functionality
- [ ] Monitor for 48 hours
- [ ] Cancel Replit deployment

### Post-Migration
- [ ] Set up monitoring and alerts
- [ ] Configure backup schedule
- [ ] Document new deployment process
- [ ] Share team access to Railway project

---

## Conclusion

**Railway** offers the best balance of cost savings, migration simplicity, and feature parity with the current Replit setup. The estimated monthly cost of $15-25 represents a potential 25-40% savings while providing a more scalable, production-ready platform.

For a Japan-focused real estate site where milliseconds matter, **Fly.io** with Tokyo deployment is worth considering despite the steeper learning curve, especially if user experience and SEO (page speed) are top priorities.

**Next Steps:**
1. Review this plan with stakeholders
2. Create Railway test deployment
3. Validate database migration process
4. Schedule production cutover

---

*Document created: March 22, 2026*  
*Review date: April 22, 2026*
