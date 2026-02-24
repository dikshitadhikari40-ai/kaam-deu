# SR Decision Engine - GitHub-Style Issues

## F) ISSUES LIST

Issues grouped by category with description, acceptance criteria, file paths, and priority.

**Priority Legend:**
- **MUST** = Required for MVP launch
- **ADV** = Advanced feature, can be deferred
- **DIFF** = Deferred/Future enhancement

**Status Legend:**
- [x] = Completed
- [ ] = Pending

---

## DB (Database)

### DB-001: Run SR Decision Engine Migration
**Priority:** MUST | **Status:** PENDING (Manual Step Required)

**Description:**
Execute the SR Decision Engine SQL migration to add premium flags, decision card RPCs, compare functionality, and feature flags.

**Acceptance Criteria:**
- [ ] `profiles.is_premium` column exists
- [ ] `profiles.premium_tier` column exists
- [ ] `feature_flags` table exists with default flags
- [ ] `get_decision_cards` RPC function works
- [ ] `compare_identities` RPC function works
- [ ] `check_premium_access` RPC function works
- [ ] `is_feature_enabled` RPC function works

**Files:**
- `supabase/SR_DECISION_ENGINE.sql`

**Action Required:**
Run in Supabase Dashboard > SQL Editor:
```sql
-- Copy and paste the entire contents of supabase/SR_DECISION_ENGINE.sql
```

---

### DB-002: Set Test Business Account to Premium
**Priority:** MUST | **Status:** SKIPPED (BETA_MODE enabled)

**Description:**
Update the test business account to have `is_premium = true` to validate premium flows during development.

**Note:** With `BETA_MODE = true` in `usePremiumAccess.ts`, all users automatically get Business-tier access. This step is optional until premium gating is enabled.

**SQL (for when BETA_MODE is disabled):**
```sql
UPDATE profiles
SET is_premium = true, premium_tier = 'business'
WHERE email = 'your-test-business@email.com' AND role = 'business';
```

---

### DB-003: Add Identity Activity Tracking
**Priority:** ADV | **Status:** PENDING

**Description:**
Track when workers update their identities for recency scoring in the capability calculation.

**Acceptance Criteria:**
- [ ] `last_activity_at` column added to work_identities
- [ ] Activity score considers last update time
- [ ] Workers active in last 7 days get higher scores

**Files:**
- `supabase/SR_DECISION_ENGINE.sql` (add column)
- Capability score function update

---

## Backend/RPC

### RPC-001: Integrate Decision Cards RPC
**Priority:** MUST | **Status:** COMPLETED

**Description:**
Connect the frontend BusinessSearchScreen to use `get_decision_cards` RPC instead of `search_work_identities`.

**Acceptance Criteria:**
- [x] BusinessSearchScreen calls `getDecisionCards` service method
- [x] Results include `explanation` and `explanation_points`
- [x] Results include `overall_fit_score`, `pay_fit_score`, `availability_score`
- [x] DecisionCard component renders the explanation

**Files:**
- [x] `frontend/src/screens/BusinessSearchScreen.tsx`
- [x] `frontend/src/services/workIdentityService.ts`
- [x] `frontend/src/components/DecisionCard.tsx`

---

### RPC-002: Add Pagination to Decision Cards
**Priority:** ADV | **Status:** PENDING

**Description:**
Implement infinite scroll / pagination for decision card results.

**Acceptance Criteria:**
- [ ] Initial load fetches 20 results
- [ ] Scrolling to bottom loads next 20
- [ ] Loading indicator shown during fetch
- [ ] "No more results" shown at end

**Files:**
- `frontend/src/screens/BusinessSearchScreen.tsx`

---

### RPC-003: Add Location-Based Filtering
**Priority:** ADV | **Status:** PENDING

**Description:**
Enhance decision cards to filter by preferred locations with Nepal city matching.

**Acceptance Criteria:**
- [ ] Location filter accepts city names
- [ ] Results prioritize matching locations
- [ ] Remote-ok identities appear for all location searches
- [ ] Explanation mentions location match

**Files:**
- `supabase/SR_DECISION_ENGINE.sql` (update `get_decision_cards`)
- `frontend/src/screens/BusinessSearchScreen.tsx`

---

## Frontend Worker

### FE-W-001: Add Compare Selection to Search Results
**Priority:** MUST | **Status:** COMPLETED

**Description:**
Allow business users to select multiple Decision Cards for comparison.

**Acceptance Criteria:**
- [x] "Compare" button appears when 2+ cards are selected
- [x] Selection checkbox appears on each DecisionCard
- [x] Maximum 5 selections enforced
- [x] Selected count shown in UI
- [x] Tapping Compare navigates to CompareIdentities screen

**Files:**
- [x] `frontend/src/screens/BusinessSearchScreen.tsx`
- [x] `frontend/src/components/DecisionCard.tsx`

---

### FE-W-002: Work Identity Skill Suggestions
**Priority:** ADV | **Status:** PENDING

**Description:**
When creating a work identity, suggest default skills based on job category.

**Acceptance Criteria:**
- [ ] Category selection triggers skill suggestions fetch
- [ ] Default skills appear as "suggested" chips
- [ ] Tapping suggested skill adds it to identity
- [ ] User can still add custom skills

**Files:**
- `frontend/src/screens/EditWorkIdentityScreen.tsx`
- `frontend/src/services/workIdentityService.ts` (getCategoryDefaultSkills)

---

### FE-W-003: Capability Score Breakdown
**Priority:** ADV | **Status:** PENDING

**Description:**
Show workers a breakdown of their capability score (skills %, experience %, activity %, reliability %).

**Acceptance Criteria:**
- [ ] Score breakdown visible on identity card
- [ ] Each component shows percentage contribution
- [ ] Tips shown for improving low components

**Files:**
- `frontend/src/screens/WorkIdentityListScreen.tsx`
- `frontend/src/screens/CVPreviewScreen.tsx`

---

### FE-W-004: Identity Visibility Analytics
**Priority:** DIFF | **Status:** PENDING

**Description:**
Show workers when their identity was last viewed and by whom (anonymized).

**Acceptance Criteria:**
- [ ] "Recent Views" section on identity detail
- [ ] Shows view count by day (last 7 days)
- [ ] Shows which categories of businesses viewed

**Files:**
- New screen: `frontend/src/screens/IdentityAnalyticsScreen.tsx`

---

## Frontend Business

### FE-B-001: Update BusinessSearchScreen to Use Decision Cards
**Priority:** MUST | **Status:** COMPLETED

**Description:**
Replace the current result cards with the new DecisionCard component.

**Acceptance Criteria:**
- [x] Search results render DecisionCard component
- [x] Explanation text visible on each card
- [x] Fit scores visible (overall, pay, availability)
- [x] Matching skills count shown
- [x] Old renderResultCard function replaced

**Files:**
- [x] `frontend/src/screens/BusinessSearchScreen.tsx`

---

### FE-B-002: Implement Compare Mode UI
**Priority:** MUST | **Status:** COMPLETED

**Description:**
Complete the compare mode with selection state and navigation.

**Acceptance Criteria:**
- [x] Toggle button enters "compare mode"
- [x] Cards show selection checkbox
- [x] Bottom bar shows selected count and "Compare" button
- [x] Tapping Compare navigates with selected IDs
- [x] Can deselect cards

**Files:**
- [x] `frontend/src/screens/BusinessSearchScreen.tsx`

**Implementation Details:**
- Compare toggle button in header (MaterialCommunityIcons "compare")
- Compare mode banner shows: "Select workers to compare (X/5)"
- Floating "Compare X Workers" button appears when 2+ selected
- Selection state managed via `selectedForCompare` array

---

### FE-B-003: Premium Upgrade CTA
**Priority:** MUST | **Status:** COMPLETED (BETA_MODE bypasses)

**Description:**
Show clear upgrade CTA when non-premium user tries to access premium features.

**Acceptance Criteria:**
- [x] Compare mode shows upgrade CTA for free users
- [x] Saved searches shows limit warning when approaching max
- [x] Upgrade button navigates to PremiumScreen
- [x] CTA explains benefits of upgrading

**Note:** Currently bypassed with `BETA_MODE = true` in `usePremiumAccess.ts`

**Files:**
- [x] `frontend/src/screens/BusinessSearchScreen.tsx`
- [x] `frontend/src/screens/CompareIdentitiesScreen.tsx`

---

### FE-B-004: Saved Search Notifications
**Priority:** DIFF | **Status:** PENDING

**Description:**
Allow businesses to enable notifications when new matches appear for saved searches.

**Acceptance Criteria:**
- [ ] Toggle "Notify me" when saving search
- [ ] Backend job checks for new matches daily
- [ ] Push notification sent when new matches found
- [ ] Notification opens saved search

**Files:**
- `frontend/src/screens/BusinessSearchScreen.tsx`
- New backend job required

---

### FE-B-005: Quick Contact from Decision Card
**Priority:** ADV | **Status:** PENDING

**Description:**
Add inline contact form on Decision Card for quick outreach.

**Acceptance Criteria:**
- [ ] "Quick Contact" expands inline form
- [ ] Form has message field
- [ ] Can optionally attach job post
- [ ] Submit creates contact request
- [ ] Success toast shown

**Files:**
- `frontend/src/components/DecisionCard.tsx`
- New component: `frontend/src/components/QuickContactForm.tsx`

---

## QA/Testing

### QA-001: Authentication Regression Test
**Priority:** MUST | **Status:** PENDING

**Description:**
Verify all authentication flows still work after changes.

**Acceptance Criteria:**
- [ ] Google login works (worker)
- [ ] Google login works (business)
- [ ] LinkedIn login works
- [ ] Email/password login works
- [ ] Session persistence works
- [ ] Logout works

**Test Script:**
See `SR_DECISION_ENGINE_TESTING.md` section 1

---

### QA-002: RLS Security Audit
**Priority:** MUST | **Status:** PENDING

**Description:**
Verify Row Level Security policies prevent unauthorized data access.

**Acceptance Criteria:**
- [ ] Worker cannot access other worker's identities
- [ ] Business cannot edit any identities
- [ ] Hidden identities not visible in search
- [ ] Contact requests properly scoped
- [ ] Saved searches only visible to owner

**Test Script:**
See `SR_DECISION_ENGINE_TESTING.md` section 4

---

### QA-003: Decision Card Display Test
**Priority:** MUST | **Status:** PENDING

**Description:**
Verify Decision Cards render correctly with all data scenarios.

**Acceptance Criteria:**
- [ ] Card renders with all fields populated
- [ ] Card renders with optional fields missing
- [ ] Explanation text is readable and accurate
- [ ] Fit scores display correctly
- [ ] Colors match score ranges

**Files:**
- `frontend/src/components/DecisionCard.tsx`

---

### QA-004: Compare Mode Stress Test
**Priority:** ADV | **Status:** PENDING

**Description:**
Test compare mode with edge cases.

**Acceptance Criteria:**
- [ ] Compare works with 2 identities
- [ ] Compare works with 5 identities
- [ ] Error shown if > 5 selected
- [ ] Horizontal scroll works on small screens
- [ ] Data loads within 3 seconds

---

### QA-005: Premium Gating Test
**Priority:** MUST | **Status:** BYPASSED (BETA_MODE)

**Description:**
Verify premium features are properly gated.

**Note:** Currently bypassed with `BETA_MODE = true`. Test when BETA_MODE is disabled.

**Acceptance Criteria:**
- [ ] Free user sees premium gate for compare
- [ ] Free user limited to 3 saved searches
- [ ] Pro user can compare 3 workers
- [ ] Business user can compare 5 workers
- [ ] Expired premium reverts to free

---

### QA-006: Feature Flag Test
**Priority:** ADV | **Status:** PENDING

**Description:**
Verify feature flags can disable features.

**Acceptance Criteria:**
- [ ] Disabling FEATURE_DECISION_CARDS hides decision cards
- [ ] Disabling FEATURE_COMPARE_MODE hides compare button
- [ ] Disabling FEATURE_SAVED_SEARCHES hides save button
- [ ] Changes take effect on app reload

---

## Summary

| Category | MUST | ADV | DIFF | Total | Completed |
|----------|------|-----|------|-------|-----------|
| DB | 2 | 1 | 0 | 3 | 0 (1 pending manual) |
| Backend/RPC | 1 | 2 | 0 | 3 | 1 |
| Frontend Worker | 1 | 2 | 1 | 4 | 1 |
| Frontend Business | 3 | 1 | 1 | 5 | 3 |
| QA/Testing | 4 | 2 | 0 | 6 | 0 |
| **Total** | **11** | **8** | **2** | **21** | **5** |

### Completed Items
1. RPC-001: Integrate Decision Cards - Service methods implemented
2. FE-W-001: Compare selection - Checkboxes and selection logic
3. FE-B-001: Use DecisionCard component - Card rendering
4. FE-B-002: Compare mode UI - Full compare mode with floating button
5. FE-B-003: Premium upgrade CTA - Gates implemented (bypassed in beta)

### Requires Manual Action
1. **DB-001:** Run `supabase/SR_DECISION_ENGINE.sql` in Supabase Dashboard

### MVP Scope (MUST) - Status
1. [PENDING] DB-001: Run migration
2. [SKIPPED] DB-002: Set test account premium (BETA_MODE active)
3. [x] RPC-001: Integrate Decision Cards
4. [x] FE-W-001: Compare selection
5. [x] FE-B-001: Use DecisionCard component
6. [x] FE-B-002: Compare mode UI
7. [x] FE-B-003: Premium upgrade CTA
8. [ ] QA-001: Auth regression
9. [ ] QA-002: RLS audit
10. [ ] QA-003: Decision Card test
11. [BYPASSED] QA-005: Premium gating test

### Post-MVP (ADV)
12. [ ] DB-003: Activity tracking
13. [ ] RPC-002: Pagination
14. [ ] RPC-003: Location filtering
15. [ ] FE-W-002: Skill suggestions
16. [ ] FE-W-003: Score breakdown
17. [ ] FE-B-005: Quick contact
18. [ ] QA-004: Compare stress test
19. [ ] QA-006: Feature flag test

### Future (DIFF)
20. [ ] FE-W-004: Identity analytics
21. [ ] FE-B-004: Saved search notifications
