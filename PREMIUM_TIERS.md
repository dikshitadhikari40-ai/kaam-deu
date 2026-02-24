# Kaam Deu Premium Tiers

## Overview

Kaam Deu offers three subscription tiers designed for the Nepal market. Pricing is optimized for affordability while providing sustainable revenue.

---

## Current Status

| Item | Status |
|------|--------|
| **BETA_MODE** | `true` (all features unlocked for free) |
| **Premium Gating** | BYPASSED during beta |
| **Compare Workers** | Working for all users |
| **Saved Searches** | Working for all users |
| **Payment Integration** | PENDING |

> **Note:** During beta testing, all users have Business-tier access via the `BETA_MODE` flag in [usePremiumAccess.ts](frontend/src/hooks/usePremiumAccess.ts). Set `BETA_MODE = false` before production launch.

---

## Tier Comparison

| Feature | Free | Pro (NPR 499/mo) | Business (NPR 999/mo) |
|---------|------|------------------|----------------------|
| **Monthly Cost (NPR)** | 0 | 499 | 999 |
| **Monthly Cost (USD)** | $0 | ~$3.75 | ~$7.50 |
| **Daily Swipes** | 20 | Unlimited | Unlimited |
| **Search Workers** | Basic filters | Advanced filters | All filters |
| **Decision Cards** | View only | Full explanations | Full + analytics |
| **Compare Workers** | Not available | Up to 3 | Up to 5 |
| **Saved Searches** | 3 max | 10 max | 20 max |
| **Contact Workers** | 5/month | 25/month | Unlimited |
| **Active Job Posts** | 1 | 5 | Unlimited |
| **Support** | Community | Email | Email + Phone |
| **Analytics** | None | Basic | Advanced |
| **Profile Badge** | None | Pro badge | Verified Business |
| **Search Priority** | Standard | Standard | Featured |

---

## Tier Details

### Free Tier (NPR 0/month)

**Target Users:** New businesses exploring the platform

**What's Included:**
- 20 swipes per day
- Basic profile creation
- Standard messaging
- View job posts
- 3 saved searches
- 5 contact requests per month
- 1 active job post at a time

**Limitations:**
- Cannot compare workers side-by-side
- No detailed Decision Card explanations
- Limited saved searches
- Basic filters only

---

### Pro Tier (NPR 499/month)

**Target Users:** Growing small businesses actively hiring

**What's Included:**
- Everything in Free, plus:
- Unlimited daily swipes
- Advanced search filters (experience, skills, availability, pay range)
- Full Decision Card explanations with fit scores
- Compare up to 3 workers side-by-side
- 10 saved searches
- 25 contact requests per month
- 5 active job posts
- Email support (24-48 hour response)
- Basic analytics dashboard

**Value Proposition:**
- Most popular plan
- Best value for money
- Perfect for SMEs with regular hiring needs

---

### Business Tier (NPR 999/month)

**Target Users:** Established businesses with ongoing staffing needs

**What's Included:**
- Everything in Pro, plus:
- Compare up to 5 workers side-by-side
- 20 saved searches
- Unlimited contact requests
- Unlimited active job posts
- Priority email + phone support (same-day response)
- Advanced analytics dashboard (hiring trends, response rates, worker insights)
- Verified Business badge (builds trust with workers)
- Featured placement in search results
- Priority matching algorithm

**Value Proposition:**
- Best for high-volume hiring
- Verified badge increases worker response rates
- Featured placement gets more applicants

---

## Pricing Strategy

### Nepal Market Considerations

1. **Local Income Context**
   - Average monthly salary: NPR 25,000-50,000
   - Pro tier (NPR 499) = ~1-2% of average salary
   - Business tier (NPR 999) = ~2-4% of average salary

2. **Competitive Analysis**
   - Tinder Pro (Nepal): NPR 1,200-1,800/month
   - LinkedIn Premium: NPR 2,500-4,500/month
   - Our pricing is 60-70% lower than competitors

3. **Currency Conversions**
   - 1 USD ≈ 133 NPR (as of 2024)
   - Pro: $3.75 USD
   - Business: $7.50 USD

---

## Payment Methods

### Supported Payment Gateways

1. **eSewa** (Primary)
   - Most popular digital wallet in Nepal
   - 40%+ market share
   - Integration: eSewa API

2. **Khalti** (Secondary)
   - Second largest digital wallet
   - Strong urban presence
   - Integration: Khalti Payment Gateway

3. **IME Pay** (Tertiary)
   - Growing user base
   - Good for remittance users
   - Integration: IME Pay API

4. **Card Payments** (Future)
   - Visa/Mastercard via local banks
   - For international users/businesses
   - Integration: Stripe or PayPal

---

## Premium UI Components

### 1. Premium Screen ([PremiumScreen.tsx](frontend/src/screens/PremiumScreen.tsx))

Shows all three tiers with:
- Feature comparison
- Current plan indicator
- Subscribe/upgrade buttons
- FAQ section

### 2. Premium Gate Component (To be created)

Shows when free user tries to access premium features:
- Compare mode
- Saved searches (beyond limit)
- Advanced filters

```tsx
// Usage example
<PremiumGate
  feature="compare_workers"
  requiredTier="pro"
  onUpgrade={() => navigation.navigate('Premium')}
>
  <CompareButton />
</PremiumGate>
```

### 3. Upgrade CTA Banner

Shows contextual upgrade prompts:
- "Upgrade to compare workers side-by-side"
- "Go Pro to save more searches"
- "Get Business tier for unlimited contacts"

---

## Feature Flags

Premium features are controlled by feature flags in the database:

```sql
-- Current feature flags
FEATURE_WORK_IDENTITY (default: true)
FEATURE_DECISION_CARDS (default: true)
FEATURE_COMPARE_MODE (default: true)
FEATURE_SAVED_SEARCHES (default: true)
FEATURE_PREMIUM_GATING (default: true)
```

To disable premium gating during beta:
```sql
UPDATE feature_flags
SET enabled = false
WHERE name = 'FEATURE_PREMIUM_GATING';
```

---

## Database Schema

### profiles table additions
```sql
is_premium BOOLEAN DEFAULT FALSE
premium_tier TEXT DEFAULT 'free' CHECK (premium_tier IN ('free', 'pro', 'business'))
premium_expires_at TIMESTAMPTZ
```

### subscriptions table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  tier TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  payment_provider TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Premium Access Check

Use the `usePremiumAccess` hook in components:

```tsx
import { usePremiumAccess } from '../hooks/usePremiumAccess';

function MyComponent() {
  const {
    isPremium,
    premium_tier,
    can_compare,
    max_compare_identities
  } = usePremiumAccess();

  if (!isPremium && !can_compare) {
    return <PremiumGate feature="compare" />;
  }

  return <CompareView />;
}
```

---

## Accessories/Add-ons (Future)

### Planned Premium Add-ons

1. **Boost Pack (NPR 199)**
   - 5 profile boosts
   - 24-hour visibility boost each
   - Stack with subscription

2. **Verified Business Badge (NPR 499 one-time)**
   - Manual verification
   - Permanent badge
   - Higher trust score

3. **Featured Job Post (NPR 299/post)**
   - Pin job to top of feed
   - 7-day featured placement
   - 3x more applicants

4. **Analytics Report (NPR 199)**
   - Detailed hiring report
   - Market salary insights
   - Worker availability trends

---

## Revenue Projections

### Monthly Active Users (MAU) Assumptions

| Stage | MAU | Free | Pro | Business |
|-------|-----|------|-----|----------|
| Launch | 1,000 | 90% | 8% | 2% |
| 6 months | 10,000 | 85% | 12% | 3% |
| 1 year | 50,000 | 80% | 15% | 5% |

### Monthly Recurring Revenue (MRR)

| Stage | Pro Users | Business Users | MRR (NPR) | MRR (USD) |
|-------|-----------|----------------|-----------|-----------|
| Launch | 80 | 20 | 59,920 | ~$450 |
| 6 months | 1,200 | 300 | 898,800 | ~$6,757 |
| 1 year | 7,500 | 2,500 | 6,242,500 | ~$46,935 |

---

## Implementation Checklist

### Completed
- [x] Premium tier definitions in `subscription.ts`
- [x] Subscription service setup
- [x] Premium screen UI (`PremiumScreen.tsx`)
- [x] `usePremiumAccess` hook with BETA_MODE flag
- [x] `useFeatureFlag` hook for feature toggles
- [x] `useFeatureGate` combined hook
- [x] Database columns (is_premium, premium_tier) - **Requires SQL migration**
- [x] check_premium_access RPC - **Requires SQL migration**
- [x] Compare mode integration (BusinessSearchScreen)
- [x] Compare screen (CompareIdentitiesScreen)
- [x] Premium upgrade CTAs in compare flow

### Pending
- [ ] Run `supabase/SR_DECISION_ENGINE.sql` migration
- [ ] Payment gateway integration (eSewa)
- [ ] Payment gateway integration (Khalti)
- [ ] Subscription email notifications
- [ ] Receipt generation
- [ ] Cancellation flow
- [ ] Prorated upgrades

### Pre-Production Checklist
- [ ] Set `BETA_MODE = false` in `usePremiumAccess.ts`
- [ ] Verify payment gateway sandbox testing
- [ ] Test premium gating flows
- [ ] Configure webhook for subscription expiration

---

## Support

For questions about premium features:
- Email: support@kaamdeu.com
- Phone: +977-XXX-XXXXXX (Business tier only)
