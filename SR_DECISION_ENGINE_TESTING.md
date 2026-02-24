# SR Decision Engine - Testing Checklist

## E) TESTING CHECKLIST & SMOKE TESTS

**Last Updated:** January 2026

### Current Status
- **BETA_MODE:** `true` (all premium features unlocked)
- **SQL Migration:** PENDING (run manually in Supabase)
- **Frontend:** READY for testing

### Pre-requisites
- [ ] Run the SQL migration: `supabase/SR_DECISION_ENGINE.sql`
- [x] Ensure the app compiles without errors
- [ ] Have at least 2 test accounts (1 worker, 1 business)

---

## 1. Authentication (MUST NOT BREAK)

### Google Login
- [ ] Worker can login with Google
- [ ] Business can login with Google
- [ ] Existing sessions persist after app restart
- [ ] OAuth redirect returns to correct screen

### LinkedIn Login
- [ ] Worker can login with LinkedIn
- [ ] Business can login with LinkedIn
- [ ] Profile data is pre-populated from LinkedIn

### Email/Password
- [ ] Worker can register with email
- [ ] Business can register with email
- [ ] Password reset flow works

---

## 2. Role Switching (MUST NOT BREAK)

- [ ] Worker sees worker-specific screens (Feed, Work Identities, CV)
- [ ] Business sees business-specific screens (Feed, Jobs, Search)
- [ ] Role persists across app restarts
- [ ] Role is correctly stored in profile.role

---

## 3. Work Identity System (WORKER)

### Work Identity List Screen
- [ ] Shows all worker's identities
- [ ] Shows capability score for each identity
- [ ] Shows visibility toggle (active/hidden)
- [ ] Shows stats (views, searches, contacts)
- [ ] Empty state shows "Create Work Identity" CTA
- [ ] Can navigate to create new identity
- [ ] Can navigate to edit existing identity
- [ ] Can navigate to view CV

### Edit Work Identity Screen
- [ ] Can create new identity
- [ ] Can select job category
- [ ] Can set experience level
- [ ] Can set pay expectations
- [ ] Can set availability
- [ ] Can add skills
- [ ] Can remove skills
- [ ] Capability score updates after saving

### CV Preview Screen
- [ ] Shows CV content
- [ ] Can toggle between "My View" and "Business View"
- [ ] Can regenerate CV
- [ ] Can share CV

---

## 4. RLS Policies (SECURITY)

### Workers
- [ ] Worker can only see their own identities
- [ ] Worker cannot see other workers' hidden identities
- [ ] Worker can only edit their own identities
- [ ] Worker can only delete their own identities

### Businesses
- [ ] Business can search active work identities
- [ ] Business cannot see hidden identities
- [ ] Business cannot edit any identities
- [ ] Business can only manage their own saved searches

### Cross-User Access
- [ ] Worker A cannot access Worker B's data
- [ ] Business cannot access worker's private data (phone, email) unless explicitly allowed

---

## 5. Business Search (DECISION CARDS)

### Search Screen
- [ ] Shows filter options (categories, capability, experience, pay, availability)
- [ ] Can apply filters
- [ ] Can clear filters
- [ ] Shows active filter count badge
- [ ] Search returns results
- [ ] Results show Decision Cards with explanations

### Decision Card Component
- [ ] Shows capability score with color coding
- [ ] Shows overall fit percentage
- [ ] Shows pay fit indicator
- [ ] Shows availability fit indicator
- [ ] Shows matching skills count
- [ ] Shows explanation text ("Strong match: ...")
- [ ] View button navigates to worker profile
- [ ] Contact button initiates contact request

### Saved Searches
- [ ] Can save current search
- [ ] Saved searches appear in list
- [ ] Can load saved search
- [ ] Can delete saved search

---

## 6. Compare Mode (PREMIUM) - NEW FEATURE

### Compare Mode UI (BusinessSearchScreen)
- [ ] Compare toggle button visible in header
- [ ] Tapping compare button activates compare mode
- [ ] Compare mode banner shows: "Select workers to compare (X/5)"
- [ ] Result cards show selection checkboxes when in compare mode
- [ ] Can select cards by tapping checkbox or card
- [ ] Selected cards show highlight border
- [ ] Can deselect cards
- [ ] Maximum 5 selections enforced with alert
- [ ] Floating "Compare X Workers" button appears when 2+ selected
- [ ] "X" button exits compare mode
- [ ] Exiting compare mode clears selections

### Compare Screen (CompareIdentitiesScreen)
- [ ] Navigation to screen works with selected IDs
- [ ] Loading indicator shown while fetching data
- [ ] Side-by-side columns display for each worker
- [ ] Shows capability scores with color coding
- [ ] Shows overall fit percentage
- [ ] Shows experience level and years
- [ ] Shows pay range and pay fit indicator
- [ ] Shows availability
- [ ] Shows skills count and matching skills
- [ ] Shows verified skills count
- [ ] Shows strengths list (max 3)
- [ ] Shows considerations list (max 2)
- [ ] "Best Match" badge on highest fit score
- [ ] Horizontal scroll works on small screens
- [ ] View button navigates to worker profile
- [ ] Contact button works
- [ ] Bottom summary shows count and budget

### Premium Gating (Currently Bypassed)
**Note:** With `BETA_MODE = true`, all users have Business-tier access.
- [ ] When BETA_MODE = false: Free users see premium gate
- [ ] Premium gate shows upgrade CTA
- [ ] Upgrade button navigates to Premium screen

---

## 7. Premium Gating

### Feature Flags
- [ ] FEATURE_WORK_IDENTITY flag controls identity system
- [ ] FEATURE_DECISION_CARDS flag controls decision cards
- [ ] FEATURE_COMPARE_MODE flag controls compare
- [ ] FEATURE_SAVED_SEARCHES flag controls saved searches
- [ ] FEATURE_PREMIUM_GATING flag controls premium checks

### Premium Access (When BETA_MODE = false)
- [ ] Free users see premium gates on advanced features
- [ ] Pro users can access compare (3 max)
- [ ] Pro users can save 10 searches
- [ ] Business tier users can compare 5 workers
- [ ] Business tier users can save 20 searches

### Premium Tiers
| Tier | Price (NPR) | Compare | Saved Searches | Contacts |
|------|-------------|---------|----------------|----------|
| Free | 0 | No | 3 | 5/month |
| Pro | 499 | Up to 3 | 10 | 25/month |
| Business | 999 | Up to 5 | 20 | Unlimited |

---

## 8. Scoring & Explanations

### Capability Score Calculation
- [ ] Score updates when skills are added
- [ ] Score updates when skills are removed
- [ ] Score updates when skill level changes
- [ ] Score updates when experience changes
- [ ] Verified skills boost score

### Decision Card Explanations
- [ ] Explanation mentions capability level
- [ ] Explanation mentions matching skills
- [ ] Explanation mentions pay fit
- [ ] Explanation mentions availability
- [ ] Explanation mentions experience

---

## 9. Manual Smoke Test Flow

### Worker Flow
1. [ ] Login as worker
2. [ ] Navigate to Work Identities
3. [ ] Create new identity (e.g., Driver)
4. [ ] Add 3 skills
5. [ ] Set experience to "Mid-Level"
6. [ ] Set pay expectations
7. [ ] Save identity
8. [ ] Verify capability score > 0
9. [ ] View CV
10. [ ] Toggle CV view type
11. [ ] Logout

### Business Flow (Updated for Compare Mode)
1. [ ] Login as business
2. [ ] Navigate to Business Search (Find Workers)
3. [ ] Apply category filter (e.g., Driver)
4. [ ] Apply capability filter (60+)
5. [ ] Tap "Search Workers" button
6. [ ] Verify results show worker cards
7. [ ] Tap compare button in header
8. [ ] Verify compare mode banner appears
9. [ ] Select 2-3 workers by tapping cards
10. [ ] Verify floating "Compare X Workers" button appears
11. [ ] Tap floating button to navigate to Compare screen
12. [ ] Verify side-by-side comparison displays
13. [ ] Verify "Best Match" badge on highest score
14. [ ] Navigate back
15. [ ] Exit compare mode
16. [ ] Save search
17. [ ] View saved searches
18. [ ] Load saved search
19. [ ] Logout

---

## 10. Regression Tests

### Existing Features (MUST NOT BREAK)
- [ ] Swipe feed works
- [ ] Matching works
- [ ] Chat works
- [ ] Job posting works
- [ ] Job applications work
- [ ] Profile editing works
- [ ] Settings work
- [ ] Notifications work (if enabled)

---

## Quick SQL Verification

Run these queries in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('work_identities', 'identity_skills', 'cv_snapshots',
                   'business_saved_searches', 'feature_flags');

-- Check premium column added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_premium';

-- Check functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('get_decision_cards', 'compare_identities',
                  'check_premium_access', 'is_feature_enabled');

-- Check feature flags
SELECT name, enabled FROM feature_flags;

-- Test decision cards RPC (as business)
SELECT * FROM get_decision_cards(
  p_categories := ARRAY['driver'],
  p_limit := 5
);

-- Test compare identities RPC
SELECT * FROM compare_identities(
  p_identity_ids := ARRAY['uuid-1', 'uuid-2']::UUID[]
);
```

---

## Key Files Reference

### Frontend (React Native/Expo)
| File | Description |
|------|-------------|
| `frontend/src/screens/BusinessSearchScreen.tsx` | Search + Compare mode UI |
| `frontend/src/screens/CompareIdentitiesScreen.tsx` | Side-by-side comparison |
| `frontend/src/components/DecisionCard.tsx` | Decision card component |
| `frontend/src/hooks/usePremiumAccess.ts` | Premium access hook (BETA_MODE here) |
| `frontend/src/services/workIdentityService.ts` | API service methods |
| `frontend/src/services/subscription.ts` | Tier configurations |

### Backend (Supabase)
| File | Description |
|------|-------------|
| `supabase/SR_DECISION_ENGINE.sql` | Main migration file |
| `supabase/WORK_IDENTITY_SYSTEM.sql` | Base work identity tables |

### Documentation
| File | Description |
|------|-------------|
| `SR_DECISION_ENGINE_ISSUES.md` | GitHub-style issue tracker |
| `SR_DECISION_ENGINE_TESTING.md` | This file |
| `PREMIUM_TIERS.md` | Premium tier documentation |

---

## Tunnel URL for Testing

When running with `npx expo start --tunnel`:
```
https://[random-id].exp.direct
```

Check current tunnel:
```bash
curl -s http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
```

---

## Notes

- All tests should be run in both development and staging environments before production
- Screenshot any errors encountered
- Document any unexpected behavior
- Priority: Auth > RLS > Core Features > Premium Features
- BETA_MODE bypasses premium gating for testing - disable before production
