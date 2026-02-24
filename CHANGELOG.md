# Kaam Deu - Changelog & Feature Documentation

## Latest Updates (January 2026)

### Authentication & Session Management

#### Re-login Onboarding Fix
**Problem:** Users were seeing onboarding/welcome questions again after logout and re-login.

**Solution:**
- Welcome state is now stored **per-user** in the database (`has_seen_welcome` column in profiles table)
- Changed from global storage key to per-user key: `@kaamdeu:hasSeenWelcome:{userId}`
- `logout()` no longer clears welcome state - it persists in database
- On login, system checks database first, then local storage

**Files Modified:**
- `frontend/src/context/AuthContext.tsx` - Per-user welcome state logic
- `supabase/add_has_seen_welcome.sql` - Database migration

---

### Account Linking Feature (NEW)

Users who registered with email/password can now link their Google and LinkedIn accounts from Settings.

#### Features:
- **Link Google Account** - Connect Google for alternative sign-in
- **Link LinkedIn Account** - Connect LinkedIn for alternative sign-in
- **Unlink Accounts** - Remove linked accounts (with safety check - can't unlink last auth method)
- **Status Display** - Shows which accounts are connected

#### How It Works:
1. Go to **Settings** > **Linked Accounts** section
2. Click "Link" on Google or LinkedIn
3. Complete OAuth flow
4. Account is now linked - can sign in with either method

#### Files Added/Modified:
- `frontend/src/services/auth.ts` - Added `accountLinkingService`
  - `getLinkedAccounts()` - Check which providers are linked
  - `linkGoogleAccount()` - Link Google via Supabase `linkIdentity`
  - `linkLinkedInAccount()` - Link LinkedIn (handles web + native)
  - `unlinkAccount()` - Remove a linked identity

- `frontend/src/screens/SettingsScreen.tsx` - New "Linked Accounts" UI section

---

### Data Persistence

All user data persists across logout/login:
- **Matches** - Stored in `matches` table
- **Messages** - Stored in `messages` table
- **Swipes** - Stored in `swipes` table
- **Profile Data** - Stored in `profiles` table

Data is **NOT** deleted on logout - only the local session is cleared.

---

### Test Accounts

Pre-created accounts for testing:

| Type | Email | Password |
|------|-------|----------|
| Worker | worker1@example.com | password123 |
| Worker | worker2@example.com | password123 |
| Worker | worker3@example.com | password123 |
| Worker | worker4@example.com | password123 |
| Worker | worker5@example.com | password123 |
| Business | business1@example.com | password123 |
| Business | business2@example.com | password123 |
| Business | business3@example.com | password123 |
| Business | business4@example.com | password123 |
| Business | business5@example.com | password123 |

#### Creating Test Matches
Run `supabase/CREATE_TEST_MATCHES.sql` in Supabase SQL Editor to create:
- 6 matches between workers and businesses
- Sample messages for testing chat functionality

---

### Database Audit Tools

#### Check What's Missing
Run `supabase/CHECK_MISSING.sql` to identify:
- Missing tables
- Missing columns in profiles/messages
- Missing functions
- Data counts

#### Full Audit
Run `supabase/AUDIT_DATABASE.sql` for comprehensive report:
- All required tables status
- Column verification for each table
- RLS status
- Function existence
- Data counts summary

---

## Authentication Methods

### 1. Email/Password
- Standard signup/login with email verification
- Password reset via email link
- Minimum 6 character passwords

### 2. Google OAuth
- Sign in with Google account
- Automatically creates profile on first login
- Can be linked to existing email account

### 3. LinkedIn OAuth
- Sign in with LinkedIn account
- Uses `linkedin_oidc` provider in Supabase
- Handles both web and native platforms

---

## App Architecture

### Frontend (Expo/React Native)
```
frontend/src/
├── context/
│   └── AuthContext.tsx       # Auth state, login, logout, profile
├── screens/
│   ├── LoginScreen.tsx       # Email/Google/LinkedIn login
│   ├── FeedScreen.tsx        # Swipe cards
│   ├── ChatScreen.tsx        # Matches list
│   ├── ChatConversationScreen.tsx  # Individual chat
│   ├── SettingsScreen.tsx    # Settings + Linked Accounts
│   └── ...
├── services/
│   ├── auth.ts              # Auth functions + account linking
│   ├── database.ts          # Supabase CRUD operations
│   └── notifications.ts     # Push notifications
├── navigation/
│   └── RootNavigator.tsx    # Navigation logic
└── lib/
    └── supabase.ts          # Supabase client config
```

### Backend (Supabase)
```
supabase/
├── COMPLETE_PRODUCTION_SETUP.sql   # Full schema
├── ADD_MISSING_TABLES.sql          # Additional tables
├── complete_rls_policies.sql       # Row Level Security
├── AUDIT_DATABASE.sql              # Audit script
├── CHECK_MISSING.sql               # Quick check script
├── CREATE_TEST_MATCHES.sql         # Test data
└── add_has_seen_welcome.sql        # Welcome state migration
```

---

## Key Tables

| Table | Purpose |
|-------|---------|
| profiles | User profiles (workers & businesses) |
| swipes | Swipe records (left/right/up) |
| matches | Mutual swipes = matches |
| messages | Chat messages within matches |
| job_posts | Business job listings |
| job_applications | Worker applications |
| business_posts | Business feed posts |
| subscriptions | Premium subscriptions |
| reviews | User reviews/ratings |

---

## Settings Screen Features

1. **Profile Card** - Edit profile photo, name, role badge
2. **Quick Stats** - Profile completion %, verification status
3. **Notifications** - Push, email, match alerts, message alerts
4. **Privacy** - Online status, read receipts, discoverability
5. **Account** - Subscription, change password, blocked users, switch role
6. **Linked Accounts** (NEW) - Google, LinkedIn, Email status
7. **Support** - Help center, feedback, terms, privacy policy
8. **Account Actions** - Logout, delete account
9. **Developer Tools** - Database state, fix role (dev mode only)

---

## Running the App

### Development
```bash
# Start frontend
cd frontend
npm run web

# App available at http://localhost:8081
```

### Production Build
```bash
# Build for web
npx expo export --platform web

# Build for iOS/Android
eas build --platform ios
eas build --platform android
```

---

## Environment Variables

### Frontend (.env)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_LINKEDIN_CLIENT_ID=your-linkedin-client-id
```

### Supabase Dashboard
- Enable Google provider in Authentication > Providers
- Enable LinkedIn (OIDC) provider
- Configure redirect URLs for OAuth callbacks

---

## Common Issues & Fixes

### "Invalid login credentials"
- Check email/password are correct
- Ensure email is confirmed (check spam folder)

### OAuth Redirect Issues
- Verify redirect URLs in Supabase dashboard
- Check `app.config.js` has correct scheme (`kaamdeu`)

### Re-login Shows Onboarding
- Fixed! Welcome state now persists per-user in database
- Run `add_has_seen_welcome.sql` if upgrading existing database

### Linked Accounts Not Showing
- Refresh the Settings page
- Check browser console for errors
- Ensure Supabase providers are enabled
