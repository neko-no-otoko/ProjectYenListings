# Japan Post Address API Research Report

## Overview

The **Japan Post Address API** (郵便番号・デジタルアドレスAPI) is an official API provided by Japan Post Co., Ltd. (日本郵便株式会社) that enables address lookup and normalization using postal codes and digital addresses.

**Launch Date:** May 2025  
**Pricing:** FREE (無料)  
**Official Portal:** https://biz.da.pf.japanpost.jp/

---

## 1. API Registration Requirements

### Required Steps

To use the Japan Post Address API, you must complete the following registration process:

#### Step 1: YuuID Registration (ゆうID)
- Register for a YuuID at: https://mypage.jpid.pf.japanpost.jp/register/terms
- YuuID is required for authentication
- Both individual and corporate YuuID accounts are accepted

#### Step 2: Account Registration
- Register an account at: https://biz.da.pf.japanpost.jp/oauth2
- Complete the "Postal Code & Digital Address for Biz" account setup

#### Step 3: Organization Registration
- Register your organization (法人 or 個人事業主 - corporation or sole proprietor)
- The representative registers the organization
- Members can be invited to join via invitation function

#### Step 4: API Access
- Access the dashboard to obtain API credentials
- Generate API authentication keys (Client ID and Secret Key)

### Permissions/Roles

The service uses two permission levels:
- **管理者 (Administrator)**: Full access, can manage organization and invite members
- **ユーザー (User)**: Can use the API but has limited administrative access

---

## 2. API Endpoints

### Base URL
```
https://api.da.pf.japanpost.jp/
```

### API Scopes

| Scope | Description |
|-------|-------------|
| `searchcode` | Returns address from postal code/business code/digital address |
| `addresszip` | Returns postal code from address |
| `token` | Returns API usage token |

### Key API Capabilities

#### 1. Postal Code to Address Conversion
- **Input:** 7-digit postal code (e.g., `1000004` or `100-0004`)
- **Output:** Prefecture, City, Town/Street (都道府県・市区町村・町域)
- **Formats:** Japanese (Kanji/Kana) and Romanized text

#### 2. Digital Address to Full Address
- **Input:** 7-character alphanumeric Digital Address (e.g., `ABC-12D6`)
- **Output:** Complete address including postal code, prefecture, city, street, building info
- **Benefit:** Gets full address with building information

#### 3. Address to Postal Code
- **Input:** Partial address information
- **Output:** Corresponding postal code
- **Feature:** Free word search supported

### Response Formats

The API returns data in multiple formats:
- **漢字 (Kanji):** Standard Japanese characters
- **カナ (Kana):** Katakana representation
- **ローマ字 (Romanized):** English/romaji for international use

---

## 3. Authentication

### OAuth 2.0 / OpenID Connect

The API uses OAuth 2.0 and OpenID Connect for secure authentication:

1. **Obtain Token Endpoint:** Use the `token` scope to get an access token
2. **API Authentication Keys:** Client ID and Secret Key generated from the dashboard
3. **Token Usage:** Include the token in API request headers

### Security Standards

| Feature | Implementation |
|---------|----------------|
| Encryption | AES-256 |
| Transport | TLS 1.2+ required |
| Firewall | Web Application Firewall (WAF) |
| Monitoring | All requests logged and audited |
| API Versioning | Supported with deprecation policies |

---

## 4. Rate Limits

### Policy

Japan Post implements rate limiting for system stability and fairness.

**Important:** Specific rate limit numbers are not publicly disclosed. The official stance is:

> "具体的な数値等はご案内できかねますが、通常の利用範囲内では問題なく利用できるよう設計されています。"
> 
> (Specific values cannot be disclosed, but the system is designed to work without issues within normal usage ranges.)

### Best Practices

- **Continuous Access:** Implement appropriate intervals between requests
- **Batch Processing:** Use distributed processing for large batches
- **Error Handling:** Implement retry logic with exponential backoff
- **Contact:** For specific rate limit inquiries, use the contact form: https://biz.da.pf.japanpost.jp/contact

---

## 5. Pricing

### Cost Structure

| Feature | Price |
|---------|-------|
| API Usage | **FREE** (無料) |
| Registration | FREE |
| Data Updates | FREE (automatic monthly updates) |

### Value Proposition

The API eliminates costs associated with:
- CSV data maintenance
- Manual postal code data updates
- Infrastructure for hosting address data
- Data accuracy management

---

## 6. Data Specifications

### Data Coverage

| Data Type | Coverage |
|-----------|----------|
| Postal Codes | All Japan postal codes |
| Business Codes | 事業所個別番号 (Individual Business Numbers) |
| Digital Address | 7-character alphanumeric codes |
| Building Info | Available via Digital Address lookup |

### Update Frequency

- **Postal Code Data:** Updated monthly (automated)
- **Digital Address:** Real-time updates when users update their registration

### Special Handling

The API automatically handles:
- "以下に掲載のない場合" ( cases not listed below)
- Kyoto street names (京都の通り名)
- Various edge cases optimized for web input

---

## 7. Use Cases

### Primary Use Cases

1. **E-commerce Checkout:** Auto-fill address from postal code
2. **Form Optimization:** Reduce user input errors
3. **Cross-border Business:** Romanized addresses for international customers
4. **Address Normalization:** Standardize address formats across systems
5. **SaaS Integration:** CRM/ERP address management

### Third-Party Provision

**Important Note:** Providing the API to third-party companies requires special agreement:

- **Standard Use:** Your company → API → Your application → End user ✓
- **SaaS Use:** Your company → API → Your SaaS → Client's application → End user (requires special agreement)

Contact Japan Post if you need to provide the API as part of a SaaS offering.

---

## 8. Limitations & Considerations

### Current Limitations

1. **Romanized Data:** Business codes only support Kanji/Kana, not romanized text
2. **Registration Required:** Cannot test without YuuID and organization registration
3. **Rate Limits:** Specific limits not publicly disclosed
4. **Geographic:** Japan addresses only

### Legal Considerations

- **Privacy:** Handle address data per Japan's Personal Information Protection Act
- **Data Usage:** Cannot resell or redistribute API data
- **Terms:** Must agree to terms of service at: https://biz.da.pf.japanpost.jp/terms

---

## 9. Resources & Links

### Official Resources

| Resource | URL |
|----------|-----|
| Developer Portal | https://biz.da.pf.japanpost.jp/ |
| API Guide | https://guide-biz.da.pf.japanpost.jp/api/ |
| Landing Page | https://lp-api.da.pf.japanpost.jp/ |
| Terms of Service | https://biz.da.pf.japanpost.jp/terms |
| FAQ | https://www.post.japanpost.jp/question/business/index.html |
| Contact Form | https://biz.da.pf.japanpost.jp/contact |

### YuuID Registration

| Resource | URL |
|----------|-----|
| YuuID Registration | https://mypage.jpid.pf.japanpost.jp/register/terms |

---

## 10. Comparison with Alternatives

### vs. CSV-based Solutions

| Feature | CSV | Japan Post API |
|---------|-----|----------------|
| Maintenance | Manual monthly | Automatic |
| Hosting | Required | Not required |
| Accuracy | Stale data | Real-time |
| Romanized | Limited | Full support |
| Cost | Free (data) | Free |

### vs. Other Address APIs

| Feature | Japan Post API | Other Commercial APIs |
|---------|----------------|----------------------|
| Price | FREE | Usually paid |
| Official Data | Yes (from source) | May be licensed |
| Digital Address | Yes | No |
| Romanized | Yes | Varies |

---

## 11. Integration Recommendations

### For Akiya Japan App

1. **Registration:** Complete YuuID and organization registration ASAP
2. **Testing:** Use test API credentials during development
3. **Caching:** Implement response caching to minimize API calls
4. **Fallback:** Have fallback for rate limit scenarios
5. **Address Normalization:** Use for standardizing property addresses
6. **User Experience:** Auto-fill forms from postal code input

### Implementation Notes

See the companion file `address-normalizer.ts` for a TypeScript implementation example of an address normalizer using the Japan Post API structure.

---

## 12. Summary

The Japan Post Address API is a **free, official** API that provides:

- ✅ **No cost** - Completely free to use
- ✅ **Official data** - Direct from Japan Post
- ✅ **Multiple formats** - Kanji, Kana, and Romanized
- ✅ **Modern authentication** - OAuth 2.0 / OpenID Connect
- ✅ **Digital Address support** - Next-generation address system
- ✅ **Automatic updates** - No maintenance required

### Requirements Recap:

1. YuuID registration
2. Organization registration (corporation or sole proprietor)
3. Dashboard access for API keys
4. OAuth 2.0 token management

### Ideal for:

- Real estate applications (Akiya Japan)
- E-commerce platforms
- CRM systems
- Any application needing Japanese address validation/normalization

---

*Report generated: March 16, 2026*  
*Researcher: Sora (OpenClaw)*
