# Work Identity System Documentation

## Overview

The Work Identity system is a core architectural redesign that changes how workers and businesses interact on the platform.

**Key Concept:** A Work Identity = How one person is evaluated for ONE type of work. One user can have MULTIPLE work identities (e.g., Driver + Helper + Cook).

## Architecture

### Core Principle
- CV is a **VIEW MODE** of data, not a separate feature
- Workers are discovered by their **identity capabilities**, not just their profile
- Businesses search by **identity**, not by user

---

## Database Schema

### Tables Created

#### 1. `work_identities`
Core table for work identities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| job_category | TEXT | Category (driver, cook, etc.) |
| job_title | TEXT | Optional specific title |
| capability_score | INTEGER | 0-100 auto-calculated score |
| experience_level | TEXT | junior/mid/senior/expert |
| experience_years | INTEGER | Years of experience |
| expected_pay_min | INTEGER | Minimum expected pay |
| expected_pay_max | INTEGER | Maximum expected pay |
| pay_type | TEXT | hourly/daily/weekly/monthly |
| availability | TEXT | full_time/part_time/contract/daily_wage/flexible |
| available_from | DATE | Start availability date |
| preferred_locations | TEXT[] | Array of preferred locations |
| is_remote_ok | BOOLEAN | Open to remote work |
| visibility_status | TEXT | active/hidden/paused |
| is_primary | BOOLEAN | Primary identity flag |
| profile_views | INTEGER | View counter |
| search_appearances | INTEGER | Search appearance counter |
| contact_requests | INTEGER | Contact request counter |

**Constraint:** `UNIQUE(user_id, job_category)` - One identity per category per user

#### 2. `identity_skills`
Skills attached to each identity.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| identity_id | UUID | References work_identities |
| skill | TEXT | Skill name |
| skill_level | TEXT | basic/intermediate/good/expert |
| years_experience | INTEGER | Years with this skill |
| is_verified | BOOLEAN | Verified by platform |
| verified_at | TIMESTAMPTZ | Verification date |
| certificate_url | TEXT | Certificate link |
| notes | TEXT | Additional notes |

#### 3. `cv_snapshots`
Auto-generated CV snapshots.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| identity_id | UUID | References work_identities |
| cv_type | TEXT | worker_confidence/business_decision/public_summary |
| content_json | JSONB | CV content |
| version | INTEGER | Version number |
| is_current | BOOLEAN | Current version flag |
| generated_at | TIMESTAMPTZ | Generation timestamp |
| generation_trigger | TEXT | What triggered generation |

#### 4. `job_categories`
Pre-defined job categories with default skills.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Category key (driver, cook, etc.) |
| display_name | TEXT | Display name |
| description | TEXT | Category description |
| icon | TEXT | Icon name |
| default_skills | TEXT[] | Suggested skills for category |
| is_active | BOOLEAN | Active flag |
| sort_order | INTEGER | Display order |

**Pre-loaded Categories:**
1. Driver
2. Cook / Chef
3. Helper / Assistant
4. Cleaner / Housekeeper
5. Security Guard
6. Gardener / Landscaper
7. Electrician
8. Plumber
9. Carpenter
10. Painter
11. Tailor / Seamstress
12. Caretaker / Nanny
13. Delivery Person
14. Office Assistant
15. Other

#### 5. `business_saved_searches`
Saved search criteria for businesses.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| business_id | UUID | References auth.users |
| name | TEXT | Search name |
| job_categories | TEXT[] | Filter: categories |
| min_capability_score | INTEGER | Filter: min score |
| experience_levels | TEXT[] | Filter: experience levels |
| pay_range_max | INTEGER | Filter: max budget |
| availability_types | TEXT[] | Filter: availability |
| required_skills | TEXT[] | Filter: required skills |
| locations | TEXT[] | Filter: locations |
| notify_on_match | BOOLEAN | Enable notifications |
| notification_frequency | TEXT | instant/daily/weekly |
| use_count | INTEGER | Usage counter |

#### 6. `identity_contact_requests`
Contact requests from businesses to workers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| identity_id | UUID | References work_identities |
| requester_id | UUID | Business user ID |
| status | TEXT | pending/accepted/rejected/expired |
| message | TEXT | Request message |
| job_post_id | UUID | Optional linked job post |
| responded_at | TIMESTAMPTZ | Response timestamp |
| expires_at | TIMESTAMPTZ | Expiration (default: 7 days) |

---

## Database Functions

### 1. `calculate_capability_score(identity_id)`
Calculates capability score (0-100) based on:
- Experience years (max 30 points)
- Skills count, verified skills, expert skills (max 40 points)
- Activity - profile views, contact requests (max 20 points)
- Profile completeness (max 10 points)

### 2. `generate_cv_snapshot(identity_id, cv_type, trigger)`
Generates CV snapshot with content based on type:
- `worker_confidence`: Shows metrics, strengths for worker
- `business_decision`: Shows reliability indicators, cost for business

### 3. `search_work_identities(params...)`
Search function with filters:
- Categories, capability score, experience levels
- Pay range, availability types, required skills
- Returns matching identities with skill match count

### 4. `get_decision_cards(params...)`
Premium feature - returns decision cards with:
- Overall fit score
- Pay fit score
- Availability score
- Explanation and explanation points

### 5. `compare_identities(identity_ids, budget_max, required_skills)`
Premium feature - compares up to 5 identities side by side with:
- Strengths and considerations
- Skill comparison
- Pay fit analysis

### 6. `check_premium_access()`
Returns premium access status and limits for current user.

---

## Frontend Files

### Types
**File:** `frontend/src/types/workIdentity.ts`

```typescript
// Enums
type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'expert';
type SkillLevel = 'basic' | 'intermediate' | 'good' | 'expert';
type AvailabilityType = 'full_time' | 'part_time' | 'contract' | 'daily_wage' | 'flexible';
type PayType = 'hourly' | 'daily' | 'weekly' | 'monthly';
type VisibilityStatus = 'active' | 'hidden' | 'paused';
type CVType = 'worker_confidence' | 'business_decision' | 'public_summary';

// Core Interfaces
interface WorkIdentity { ... }
interface IdentitySkill { ... }
interface CVSnapshot { ... }
interface JobCategory { ... }
interface BusinessSavedSearch { ... }
interface IdentityContactRequest { ... }

// Decision Engine Types (Premium)
interface DecisionCardResult { ... }
interface CompareIdentityResult { ... }
interface PremiumAccess { ... }

// Helper Functions
getCapabilityDisplay(score) // Returns label, color, icon
formatPayRange(min, max, type) // Returns formatted string
```

### Service Layer
**File:** `frontend/src/services/workIdentityService.ts`

```typescript
workIdentityService = {
  // Identity CRUD
  getMyIdentities(): Promise<WorkIdentity[]>
  getIdentityById(id): Promise<WorkIdentity | null>
  createIdentity(params): Promise<WorkIdentity>
  updateIdentity(id, params): Promise<WorkIdentity>
  deleteIdentity(id): Promise<void>
  toggleVisibility(id, status): Promise<WorkIdentity>

  // Skills
  addSkill(identityId, params): Promise<IdentitySkill>
  updateSkill(skillId, params): Promise<IdentitySkill>
  removeSkill(skillId): Promise<void>

  // CV
  generateCV(identityId, cvType): Promise<CVSnapshot>
  getCurrentCV(identityId, cvType): Promise<CVSnapshot | null>
  recalculateScore(identityId): Promise<number>

  // Categories
  getJobCategories(): Promise<JobCategory[]>
  getCategoryDefaultSkills(name): Promise<string[]>

  // Business Search
  searchIdentities(params): Promise<SearchIdentitiesResult[]>
  getIdentityForBusiness(id): Promise<{ identity, cv }>

  // Saved Searches
  getMySavedSearches(): Promise<BusinessSavedSearch[]>
  saveSearch(name, params): Promise<BusinessSavedSearch>
  deleteSavedSearch(id): Promise<void>

  // Contact Requests
  sendContactRequest(identityId, message?, jobPostId?): Promise<IdentityContactRequest>
  getMyContactRequests(): Promise<IdentityContactRequest[]>
  respondToContactRequest(id, status): Promise<IdentityContactRequest>

  // Premium Features
  getDecisionCards(params): Promise<DecisionCardResult[]>
  compareIdentities(ids, budget?, skills?): Promise<CompareIdentityResult[]>
  checkPremiumAccess(): Promise<PremiumAccess>
  isFeatureEnabled(name): Promise<boolean>
}
```

### Screens

#### 1. WorkIdentityListScreen
**File:** `frontend/src/screens/WorkIdentityListScreen.tsx`
**Route:** `WorkIdentityList`
**Deep Link:** `/identities`

Worker dashboard showing all work identities with:
- Capability score circle
- Visibility toggle
- Stats (views, searches, contacts)
- Skills preview
- Edit/Delete/View CV actions

#### 2. EditWorkIdentityScreen
**File:** `frontend/src/screens/EditWorkIdentityScreen.tsx`
**Routes:** `CreateWorkIdentity`, `EditWorkIdentity`
**Deep Links:** `/identities/new`, `/identities/:identityId/edit`

Create/Edit form with:
- Job category picker (locked after creation)
- Job title input
- Experience level selector
- Pay expectations (min/max + type)
- Availability selector
- Locations with remote toggle
- Skills management with suggestions

#### 3. CVPreviewScreen
**File:** `frontend/src/screens/CVPreviewScreen.tsx`
**Routes:** `CVPreview`, `WorkerIdentityDetail`
**Deep Links:** `/identities/:identityId/cv`, `/workers/:identityId`

CV display with:
- Toggle between "My View" and "Business View"
- Capability score with visual
- Skills with level bars
- Availability and pay sections
- Regenerate and Share actions

#### 4. BusinessSearchScreen
**File:** `frontend/src/screens/BusinessSearchScreen.tsx`
**Route:** `BusinessSearch`
**Deep Link:** `/search/workers`

Business search with:
- Filters modal (categories, capability, experience, pay, availability, skills)
- Active filters preview
- Results list with capability badges
- Saved searches
- Compare mode (premium)

#### 5. CompareIdentitiesScreen
**File:** `frontend/src/screens/CompareIdentitiesScreen.tsx`
**Route:** `CompareIdentities`

Premium comparison screen with:
- Side-by-side identity comparison
- Strengths and considerations
- Skill matching visualization
- Overall fit scores

### Hooks

#### usePremiumAccess
**File:** `frontend/src/hooks/usePremiumAccess.ts`

```typescript
const {
  is_premium,
  premium_tier,
  can_compare,
  can_save_searches,
  can_advanced_filter,
  max_saved_searches,
  max_compare_identities,
  loading,
  error,
  refresh,
  isPremium,      // Convenience: is_premium || tier !== 'free'
  tierLabel,      // 'Free' | 'Pro' | 'Business'
} = usePremiumAccess();
```

**Beta Mode:** The hook includes a `BETA_MODE` flag (line 13) that when set to `true` unlocks all premium features for testing. Currently set to `true`.

#### useFeatureFlag
```typescript
const { enabled, loading } = useFeatureFlag('feature_name');
```

#### useFeatureGate
Combined hook for checking both feature flag AND premium access:
```typescript
const { hasAccess, loading, featureEnabled, isPremium, reason } = useFeatureGate('feature_name', requiresPremium);
```

---

## Navigation

### Routes Added to AppStackParamList

```typescript
WorkIdentityList: undefined;
CreateWorkIdentity: undefined;
EditWorkIdentity: { identityId: string };
CVPreview: { identityId: string; cvType?: 'worker_confidence' | 'business_decision' };
BusinessSearch: undefined;
CompareIdentities: { identityIds: string[]; budgetMax?: number; requiredSkills?: string[] };
WorkerIdentityDetail: { identityId: string };
SendContactRequest: { identityId: string; jobCategory: string };
```

### Deep Links

| Route | Deep Link |
|-------|-----------|
| WorkIdentityList | `/identities` |
| CreateWorkIdentity | `/identities/new` |
| EditWorkIdentity | `/identities/:identityId/edit` |
| CVPreview | `/identities/:identityId/cv` |
| BusinessSearch | `/search/workers` |
| WorkerIdentityDetail | `/workers/:identityId` |

---

## Entry Points (To Be Added)

### For Workers
Add to ProfileScreen or SettingsScreen:
```tsx
<TouchableOpacity onPress={() => navigation.navigate('WorkIdentityList')}>
  <Text>Manage Work Identities</Text>
</TouchableOpacity>
```

### For Businesses
Add to FeedScreen or a dedicated tab:
```tsx
<TouchableOpacity onPress={() => navigation.navigate('BusinessSearch')}>
  <Text>Find Workers</Text>
</TouchableOpacity>
```

---

## Premium Features

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Create Identities | Yes | Yes | Yes |
| View CVs | Yes | Yes | Yes |
| Basic Search | Yes | Yes | Yes |
| Save Searches | No | Yes | Yes |
| Compare Workers | No | Yes (3) | Yes (5) |
| Advanced Filters | No | Yes | Yes |
| Decision Cards | No | Yes | Yes |

---

## SQL Migration

Run the SQL in Supabase Dashboard → SQL Editor:
- Location: `supabase/WORK_IDENTITY_SYSTEM.sql` (or use the inline SQL provided)
- Creates all tables, indexes, RLS policies, functions, triggers
- Seeds 15 job categories

---

## File Summary

| File | Purpose |
|------|---------|
| `frontend/src/types/workIdentity.ts` | TypeScript types and enums |
| `frontend/src/services/workIdentityService.ts` | Supabase service layer |
| `frontend/src/screens/WorkIdentityListScreen.tsx` | Worker identity dashboard |
| `frontend/src/screens/EditWorkIdentityScreen.tsx` | Create/Edit identity form |
| `frontend/src/screens/CVPreviewScreen.tsx` | CV display screen |
| `frontend/src/screens/BusinessSearchScreen.tsx` | Business worker search with compare mode |
| `frontend/src/screens/CompareIdentitiesScreen.tsx` | Premium comparison screen |
| `frontend/src/hooks/usePremiumAccess.ts` | Premium access hook with beta mode |
| `frontend/src/navigation/RootNavigator.tsx` | Updated with new routes |

## Beta Mode

For testing purposes, the app includes a **Beta Mode** that unlocks all premium features:

**Location:** `frontend/src/hooks/usePremiumAccess.ts` (line 13)

```typescript
const BETA_MODE = true;  // Set to false for production
```

When `BETA_MODE = true`:
- All users get full Business tier access
- Compare mode is enabled (up to 5 workers)
- Saved searches are enabled (up to 20)
- All advanced filters are available

**For production:** Set `BETA_MODE = false` to enforce actual subscription checks.

---

## Version History

- **v1.0** (2026-01-01): Initial implementation
  - Core Work Identity CRUD
  - Skills management
  - CV generation
  - Business search
  - Compare feature (Premium)
  - Full navigation integration
