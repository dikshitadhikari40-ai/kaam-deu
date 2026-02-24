# SR Decision Engine - Complete Implementation Guide

## Overview

The SR Decision Engine is the core intelligence system for Kaam Deu, providing smart matching between businesses and workers through Decision Cards, Compare Mode, and Premium Features.

---

## Quick Start

### 1. Run SQL Migration (Required)
```bash
# Copy contents of this file to Supabase Dashboard > SQL Editor
supabase/SR_DECISION_ENGINE.sql
```

### 2. Start Development Server
```bash
cd frontend
npx expo start --tunnel
```

### 3. Test Credentials
- Worker account: Create via Google/LinkedIn OAuth
- Business account: Create via Google/LinkedIn OAuth
- Both roles have full access during beta (BETA_MODE = true)

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend | READY | All screens implemented |
| SQL Migration | PENDING | Run manually in Supabase |
| BETA_MODE | ENABLED | All premium features unlocked |
| Payment Integration | PENDING | eSewa/Khalti not yet integrated |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React Native/Expo)            │
├─────────────────────────────────────────────────────────────┤
│  BusinessSearchScreen  │  CompareIdentitiesScreen           │
│  - Filter controls     │  - Side-by-side comparison         │
│  - Decision Cards      │  - Best Match badge                │
│  - Compare Mode toggle │  - Contact buttons                 │
├─────────────────────────────────────────────────────────────┤
│                    HOOKS & SERVICES                          │
│  usePremiumAccess.ts   │  workIdentityService.ts            │
│  - BETA_MODE flag      │  - getDecisionCards()              │
│  - Tier checking       │  - compareIdentities()             │
│  - Feature gates       │  - checkPremiumAccess()            │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND (Supabase)                        │
│  get_decision_cards    │  compare_identities                │
│  - Scoring algorithm   │  - Multi-worker fetch              │
│  - Fit calculations    │  - Strengths/considerations        │
│  - Explanations        │  - Best match calculation          │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Decision Cards
Smart worker cards that explain WHY a worker is a good match:
- **Capability Score**: 0-100 based on skills, experience, activity
- **Overall Fit**: Percentage match with search criteria
- **Pay Fit**: How well pay expectations align with budget
- **Availability Fit**: Schedule compatibility
- **Explanation Text**: Human-readable match reasoning

### 2. Compare Mode
Side-by-side comparison of up to 5 workers:
- Toggle compare mode in search results
- Select workers by tapping cards
- Floating "Compare X Workers" button
- Side-by-side comparison screen
- "Best Match" badge on highest scorer

### 3. Premium Tiers
Three-tier subscription model for Nepal market:

| Tier | Price | Compare | Saved Searches | Contacts |
|------|-------|---------|----------------|----------|
| Free | NPR 0 | No | 3 | 5/month |
| Pro | NPR 499 | Up to 3 | 10 | 25/month |
| Business | NPR 999 | Up to 5 | 20 | Unlimited |

> **Beta Mode**: Currently all users have Business-tier access

---

## File Structure

### Frontend Components
```
frontend/src/
├── screens/
│   ├── BusinessSearchScreen.tsx    # Search + Compare Mode UI
│   └── CompareIdentitiesScreen.tsx # Side-by-side comparison
├── components/
│   └── DecisionCard.tsx            # Decision card component
├── hooks/
│   └── usePremiumAccess.ts         # Premium gating hook
└── services/
    ├── workIdentityService.ts      # API service methods
    └── subscription.ts             # Tier configurations
```

### Backend (Supabase SQL)
```
supabase/
├── SR_DECISION_ENGINE.sql          # Main migration file
└── WORK_IDENTITY_SYSTEM.sql        # Base work identity tables
```

### Documentation
```
├── SR_DECISION_ENGINE_README.md    # This file
├── SR_DECISION_ENGINE_ISSUES.md    # GitHub-style issue tracker
├── SR_DECISION_ENGINE_TESTING.md   # Testing checklist
└── PREMIUM_TIERS.md                # Premium tier documentation
```

---

## Key Code Locations

### BETA_MODE Flag
```typescript
// frontend/src/hooks/usePremiumAccess.ts:13
const BETA_MODE = true;  // Set to false for production
```

### Compare Mode Logic
```typescript
// frontend/src/screens/BusinessSearchScreen.tsx
const [compareMode, setCompareMode] = useState(false);
const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
```

### Decision Card RPC
```sql
-- supabase/SR_DECISION_ENGINE.sql
SELECT * FROM get_decision_cards(
  p_categories := ARRAY['driver'],
  p_min_capability := 60,
  p_limit := 20
);
```

---

## Testing

### Tunnel URL for Mobile Testing
```bash
cd frontend
npx expo start --tunnel
```

### Manual Smoke Test Flow

**Worker:**
1. Login with Google/LinkedIn
2. Create Work Identity (e.g., Driver)
3. Add 3+ skills
4. Set experience and pay expectations
5. Save and verify capability score

**Business:**
1. Login with Google/LinkedIn
2. Navigate to Find Workers
3. Apply filters (category, capability)
4. Tap Compare button
5. Select 2-3 workers
6. Tap floating Compare button
7. Verify side-by-side comparison

---

## RPC Functions (Supabase)

| Function | Description |
|----------|-------------|
| `get_decision_cards` | Search workers with fit scores and explanations |
| `compare_identities` | Fetch multiple workers for comparison |
| `check_premium_access` | Check user's premium tier and limits |
| `is_feature_enabled` | Check if feature flag is enabled |

---

## Premium Gating

### Current State (Beta)
All features unlocked via `BETA_MODE = true`

### Production Flow
```typescript
const { can_compare, max_compare_identities } = usePremiumAccess();

if (!can_compare) {
  // Show upgrade CTA
  return <PremiumGate feature="compare" />;
}

if (selectedCount > max_compare_identities) {
  // Show limit warning
  Alert.alert('Limit Reached', `Pro can compare up to ${max_compare_identities}`);
}
```

---

## Pre-Production Checklist

- [ ] Run `supabase/SR_DECISION_ENGINE.sql` migration
- [ ] Set `BETA_MODE = false` in usePremiumAccess.ts
- [ ] Integrate eSewa payment gateway
- [ ] Integrate Khalti payment gateway
- [ ] Test premium upgrade flow
- [ ] Test subscription expiration
- [ ] Configure webhook notifications
- [ ] QA authentication flows
- [ ] QA RLS security policies

---

## Related Documentation

- [SR_DECISION_ENGINE_ISSUES.md](SR_DECISION_ENGINE_ISSUES.md) - Issue tracker with status
- [SR_DECISION_ENGINE_TESTING.md](SR_DECISION_ENGINE_TESTING.md) - Complete test checklist
- [PREMIUM_TIERS.md](PREMIUM_TIERS.md) - Premium tier details and pricing

---

## Support

For implementation questions, check the issue tracker or contact the dev team.

**Last Updated:** January 2026
