# REINFOLIB MLIT API Setup Guide

## Overview

This guide covers how to obtain an API key for the **REINFOLIB** (不動産情報ライブラリ - Real Estate Information Library) API from Japan's Ministry of Land, Infrastructure, Transport and Tourism (MLIT).

The REINFOLIB API provides access to:
- Real estate transaction price data (2005+)
- Land price publication/research data (1995+)
- Urban planning information
- Disaster prevention data
- Municipal facility information

**Official Portal:** https://www.reinfolib.mlit.go.jp  
**API Documentation:** https://www.reinfolib.mlit.go.jp/help/apiManual/

---

## Step 1: Navigate to the API Registration Page

**Registration URL:** https://www.reinfolib.mlit.go.jp/api/request/

This page contains the application form for obtaining an API key.

---

## Step 2: Complete the Registration Form

### Required Fields

| Field | Description | Notes |
|-------|-------------|-------|
| **利用者区分** (User Type) | Select your entity type | Choose one: 法人 (Corporation), 法人以外の団体 (Non-corporate organization), 個人 (Individual) |
| **担当者氏名** (Contact Person Name) | Your full name | Required |
| **メールアドレス** (Email Address) | Valid email for correspondence | Required - approval sent here |
| **法人名** (Corporation Name) | Company/organization name | Required if user type is "Corporation" |
| **法人番号** (Corporation Number) | 13-digit corporate number | Required if user type is "Corporation" (available from https://www.houjin-bangou.nta.go.jp/) |
| **所属** (Affiliation) | Department or organization unit | Required |
| **所在地** (Address) | Physical address | Required |
| **利用目的** (Purpose of Use) | How you will use the API | Select from dropdown |

### Purpose of Use Options (利用目的)

The form offers these predefined purposes:

1. **データを活用したサービスの開発・提供**  
   *Development and provision of data-driven services*

2. **データを活用した調査・研究**  
   *Research using data*

3. **そのほか**  
   *Other* (provide details in the text field)

**For the Akiya app:** Select option 1 (サービスの開発・提供) as you're building a service that uses real estate data.

---

## Step 3: Agree to Terms

You must check two confirmation boxes:

1. **利用約款に同意する**  
   *I agree to the Terms of Use*

2. **反社会的勢力に該当しません**  
   *I confirm I am not affiliated with anti-social forces*

Read the full Terms of Use at: https://www.reinfolib.mlit.go.jp/help/termsOfUse/

---

## Step 4: Submit Application

Click the **申請する** (Submit Application) button to complete the registration.

---

## Step 5: Wait for Approval

**Processing Time:** Approximately **5 business days** (5営業日程度)

You will receive an email notification at the provided address with:
- Approval confirmation
- Your API key (Ocp-Apim-Subscription-Key)
- Instructions for using the API

---

## Step 6: Configure Your API Key

Once approved, add your API key to the application environment:

### Option 1: Environment Variable (Recommended)

```bash
# Add to your .env file
REINFOLIB_API_KEY=your_api_key_here
```

### Option 2: Direct Usage in Code

```typescript
import { ReinfolibClient } from './lib/datasources/connectors/reinfolib-connector';

const client = new ReinfolibClient({
  apiKey: process.env.REINFOLIB_API_KEY || 'your_api_key_here'
});
```

---

## Available API Endpoints (Scopes)

Your API key grants access to all public REINFOLIB APIs. Key endpoints for the Akiya app:

| API ID | Description | Use Case for Akiya |
|--------|-------------|-------------------|
| **XIT001** | Real Estate Transaction/Contract Prices | Analyze property market activity in rural areas |
| **XIT002** | Municipalities List | Get valid city codes for queries |
| **XPT002** | Land Price Points | Evaluate land values in target areas |
| **XKT013** | Future Population 250m Mesh | Identify population decline areas |
| **XKT016** | Disaster Hazard Areas | Assess property safety risks |

---

## Testing Your API Key

Use this curl command to verify your key works:

```bash
curl -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
     --compressed \
     "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT002"
```

Expected response: JSON list of prefectures and municipalities.

---

## Troubleshooting

### Issue: "401 Unauthorized" or "Access Denied"

**Possible Causes:**
1. **API key not yet activated** - Wait for the approval email (up to 5 business days)
2. **Wrong header name** - Must use `Ocp-Apim-Subscription-Key`, not `Authorization`
3. **Key copied incorrectly** - Verify no extra spaces or characters

**Solutions:**
- Check your email for approval confirmation
- Verify header: `Ocp-Apim-Subscription-Key: {your_key}`
- Regenerate key if needed via the portal

---

### Issue: "400 Bad Request"

**Possible Causes:**
1. **Missing required parameters** - XIT001 requires at least one of: `area`, `city`, or `station`
2. **Invalid date range** - Transaction data only available from 2005
3. **Invalid municipality code** - Use XIT002 to get valid codes

**Solutions:**
```typescript
// Correct usage - requires location filter
const result = await client.getRealEstateTransactions({
  year: 2023,
  quarter: 1,
  area: '32'  // Shimane prefecture - at least one location param required
});
```

---

### Issue: "No data returned"

**Possible Causes:**
1. **No transactions in specified period/area** - Rural areas may have sparse data
2. **Future dates** - Data is historical only
3. **Wrong municipality code format** - Must be 5 digits

**Solutions:**
- Try broader search (prefecture level instead of city)
- Use multiple years/quarters
- Verify municipality codes with XIT002

---

### Issue: "CORS error" in browser

**Cause:** The API is designed for server-side use, not direct browser requests.

**Solution:** Always make REINFOLIB API calls from your backend server, never from client-side JavaScript.

---

### Issue: Approval email not received

**Check:**
1. **Spam/junk folder** - MLIT emails may be filtered
2. **Email address typo** - Re-apply with correct email
3. **Corporate email filters** - Check with IT department

**Contact:** If after 7 business days no email received:  
https://www.reinfolib.mlit.go.jp/help/contact/

---

### Issue: API key expired or revoked

**Causes:**
1. **3+ years of inactivity** - Keys are suspended after extended non-use
2. **Terms of Use violation** - Commercial use restrictions
3. **System migration** - Rare infrastructure changes

**Solution:** Re-apply for a new API key using the same process.

---

## Required Attribution

When displaying REINFOLIB data in your application, you **must** include this credit:

**Japanese:**
```
このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません
```

**English:**
```
This service uses the API function of the Real Estate Information Library of the Ministry of Land, Infrastructure, Transport and Tourism, but the freshness, accuracy, completeness, etc. of the provided information are not guaranteed.
```

The connector exports these as constants:
```typescript
import { REQUIRED_CREDIT_TEXT, REQUIRED_CREDIT_TEXT_EN } from './reinfolib-connector';
```

---

## Important Notes

1. **No direct akiya data** - REINFOLIB provides transaction/price data, not vacant home listings. Use this API to evaluate market conditions and identify low-activity areas.

2. **Rate limits** - While not explicitly documented, implement reasonable throttling. Cache responses when possible.

3. **HTTPS required** - All API calls must use HTTPS.

4. **Data freshness** - Transaction data is published quarterly with a delay (typically 3-4 months).

5. **No warranty** - The disclaimer is legally required because the data may contain errors or omissions.

---

## Useful Resources

- **API Manual:** https://www.reinfolib.mlit.go.jp/help/apiManual/
- **Terms of Use:** https://www.reinfolib.mlit.go.jp/help/termsOfUse/
- **Contact Form:** https://www.reinfolib.mlit.go.jp/help/contact/
- **Municipality Codes:** https://www.soumu.go.jp/denshijiti/code.html

---

## Quick Reference

| Item | Value |
|------|-------|
| **Registration URL** | https://www.reinfolib.mlit.go.jp/api/request/ |
| **Base API URL** | https://www.reinfolib.mlit.go.jp/ex-api/external/ |
| **Header Key** | `Ocp-Apim-Subscription-Key` |
| **Approval Time** | ~5 business days |
| **Data Format** | JSON (gzip compressed) |
| **Cost** | Free |
| **Required Attribution** | Yes (see above) |

---

*Last updated: March 17, 2026*
