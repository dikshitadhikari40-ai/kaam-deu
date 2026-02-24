# Kaam Deu - Complete App Study

## 📱 What is Kaam Deu?

**Kaam Deu** is a **job matching platform** (similar to Tinder for jobs) that connects:
- **Workers** (job seekers) - Drivers, Cooks, Helpers, Cleaners, Security Guards, etc.
- **Businesses** (employers) - Companies looking to hire workers

### Core Concept
- Workers create profiles and swipe on job opportunities
- Businesses create job posts and swipe on worker profiles
- **Mutual swipes = Match** → Enables chat, voice/video calls
- Premium features for advanced search, comparison, and decision-making

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Expo/React Native (TypeScript) - Cross-platform mobile app (iOS, Android, Web)
- **Backend**: Node.js/Express API server
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email/Password, Google OAuth, LinkedIn OAuth)
- **Storage**: Supabase Storage (profile photos, documents, chat media)
- **Payments**: eSewa (Nepal payment gateway)
- **Calls**: Agora (voice/video calling)

### Project Structure
```
master-app/
├── frontend/          # Expo/React Native app
│   ├── src/
│   │   ├── screens/   # 33 screen components
│   │   ├── services/  # API services (auth, database, payments, etc.)
│   │   ├── components/# Reusable UI components
│   │   ├── context/   # AuthContext for global auth state
│   │   ├── navigation/# Navigation setup
│   │   └── hooks/      # Custom hooks (premium, notifications, etc.)
│   └── package.json
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/    # API endpoints (auth, profiles, swipes, messages, etc.)
│   │   ├── db/        # Database initialization
│   │   └── middleware/# Auth middleware
│   └── package.json
└── supabase/          # Database migrations and SQL scripts
```

---

## ✨ Key Features

### 1. Authentication & Profiles
- ✅ Email/Password signup/login
- ✅ Google OAuth
- ✅ LinkedIn OAuth
- ✅ Account linking (link multiple auth methods)
- ✅ Role selection (Worker or Business)
- ✅ Profile completion tracking
- ✅ Welcome state persistence (per-user in database)

### 2. Matching System
- ✅ Swipe cards (left/right/up)
- ✅ Mutual swipe = Match
- ✅ Match notifications
- ✅ Match history

### 3. Messaging
- ✅ Real-time chat between matches
- ✅ Media sharing (photos, documents)
- ✅ Read receipts
- ✅ Online status

### 4. Voice/Video Calls
- ✅ Agora integration for calls
- ✅ Call history
- ⚠️ Requires Agora certificate for production

### 5. Work Identity System (NEW)
- ✅ Workers can create multiple work identities (e.g., Driver + Cook)
- ✅ Each identity has:
  - Job category, skills, experience
  - Capability score (0-100, auto-calculated)
  - Pay expectations, availability
  - CV snapshots (auto-generated)
- ✅ Businesses can search by identity
- ✅ **Decision Cards** (Premium) - AI-powered matching explanations
- ✅ **Compare Mode** (Premium) - Compare up to 5 workers side-by-side

### 6. Premium Features
- ✅ Three tiers: **Free**, **Pro**, **Business**
- ✅ Premium gating (currently bypassed with `BETA_MODE = true`)
- ✅ Compare workers (Free: 0, Pro: 3, Business: 5)
- ✅ Saved searches (Free: 0, Pro: 10, Business: 20)
- ✅ Advanced filters
- ✅ Decision cards with fit scores

### 7. Job Board
- ✅ Businesses can post jobs
- ✅ Workers can apply
- ✅ Application tracking

### 8. Payments
- ✅ eSewa integration (sandbox mode)
- ✅ Subscription management
- ✅ Boost purchases (Super Likes)
- ⚠️ Production credentials needed

### 9. Additional Features
- ✅ Reviews & Ratings
- ✅ Badges & Streaks
- ✅ Block/Report users
- ✅ Business Feed (posts)
- ✅ Notifications (push, email)
- ✅ Offline mode detection

---

## 📊 Current State

### ✅ Completed Features
1. **Core Matching** - Swiping, matching, chat
2. **Authentication** - All OAuth methods working
3. **Work Identity System** - Full CRUD, search, compare
4. **Premium System** - Tiers defined, gating implemented (beta mode)
5. **Decision Engine** - RPC functions created (needs migration)
6. **Account Linking** - Link Google/LinkedIn to email accounts
7. **Profile Management** - Complete profile setup flows

### ⚠️ Pending/Issues

#### Critical (MUST for MVP)
1. **DB-001**: Run `supabase/SR_DECISION_ENGINE.sql` migration
   - Adds premium columns, feature flags, RPC functions
   - **Status**: Manual step required - run in Supabase Dashboard

2. **QA-001**: Authentication regression testing
   - Verify all auth flows still work
   - Test Google, LinkedIn, Email login

3. **QA-002**: RLS Security audit
   - Verify users can't access unauthorized data
   - Test worker/business data isolation

4. **QA-003**: Decision Card display testing
   - Test with all data scenarios
   - Verify fit scores display correctly

#### Important (ADV)
5. **RPC-002**: Add pagination to decision cards
6. **RPC-003**: Location-based filtering
7. **FE-W-002**: Skill suggestions for work identities
8. **FE-W-003**: Capability score breakdown UI
9. **FE-B-005**: Quick contact form on decision cards

#### Future (DIFF)
10. **FE-W-004**: Identity analytics dashboard
11. **FE-B-004**: Saved search notifications

### 🐛 Known Issues

1. **BETA_MODE Active**
   - Location: `frontend/src/hooks/usePremiumAccess.ts` (line 13)
   - All premium features unlocked for testing
   - **Action**: Set to `false` before production

2. **Payment Gateway**
   - eSewa in sandbox mode
   - Production credentials needed

3. **Agora Calls**
   - App ID configured
   - Certificate needed for production security

4. **Environment Variables**
   - No `.env` files found in repo (expected - should be in `.gitignore`)
   - Need to create `.env` files for frontend and backend

---

## 🚀 Next Steps

### Immediate (This Week)
1. **Run Database Migration**
   ```sql
   -- In Supabase Dashboard > SQL Editor
   -- Copy and paste: supabase/SR_DECISION_ENGINE.sql
   ```

2. **Test Authentication Flows**
   - Google login (worker & business)
   - LinkedIn login
   - Email/password login
   - Account linking

3. **Security Audit**
   - Test RLS policies
   - Verify data isolation
   - Check unauthorized access attempts

4. **Decision Card Testing**
   - Test with various worker profiles
   - Verify scores and explanations
   - Test compare mode

### Short-term (This Month)
5. **Disable Beta Mode**
   - Set `BETA_MODE = false` in `usePremiumAccess.ts`
   - Test premium gating
   - Verify upgrade flows

6. **Payment Integration**
   - Get production eSewa credentials
   - Test payment flow end-to-end
   - Implement subscription activation

7. **Production Environment Setup**
   - Configure production Supabase
   - Set up backend hosting (Railway/Render)
   - Configure production OAuth redirects

8. **Add Pagination**
   - Implement infinite scroll for search results
   - Add loading states

### Medium-term (Next Quarter)
9. **Location Filtering**
   - Add Nepal city matching
   - Prioritize local workers

10. **Skill Suggestions**
    - Auto-suggest skills based on job category
    - Improve identity creation UX

11. **Analytics Dashboard**
    - Show identity views
    - Track search appearances
    - Display contact requests

12. **Saved Search Notifications**
    - Daily/weekly digest emails
    - Push notifications for new matches

---

## 📁 Key Files Reference

### Frontend
- `frontend/App.tsx` - Root component
- `frontend/src/context/AuthContext.tsx` - Global auth state
- `frontend/src/navigation/RootNavigator.tsx` - Navigation setup
- `frontend/src/screens/FeedScreen.tsx` - Main swipe interface
- `frontend/src/screens/BusinessSearchScreen.tsx` - Worker search with compare
- `frontend/src/screens/CompareIdentitiesScreen.tsx` - Premium comparison
- `frontend/src/hooks/usePremiumAccess.ts` - Premium access hook (BETA_MODE here)

### Backend
- `backend/src/index.js` - Express server setup
- `backend/src/routes/` - All API endpoints

### Database
- `supabase/SR_DECISION_ENGINE.sql` - **MUST RUN** - Premium features migration
- `supabase/WORK_IDENTITY_SYSTEM.sql` - Work identity tables
- `supabase/COMPLETE_PRODUCTION_SETUP.sql` - Full schema

### Documentation
- `README.md` - Setup instructions
- `CHANGELOG.md` - Feature history
- `PRODUCTION_CHECKLIST.md` - Deployment guide
- `SR_DECISION_ENGINE_ISSUES.md` - Detailed issue tracking
- `PREMIUM_TIERS.md` - Premium feature documentation
- `WORK_IDENTITY_SYSTEM.md` - Work identity architecture

---

## 🔧 Development Commands

### Start Development
```bash
# Terminal 1: Backend
cd backend && npm run dev
# Runs on http://localhost:3001

# Terminal 2: Frontend
cd frontend && npm start
# Runs on http://localhost:8081
```

### Type Checking
```bash
cd frontend && npm run typecheck
```

### Build for Production
```bash
# iOS
cd frontend && eas build --platform ios

# Android
cd frontend && eas build --platform android

# Web
cd frontend && npx expo export --platform web
```

---

## 🧪 Test Accounts

Pre-created test accounts (password: `password123`):

| Type | Email | Password |
|------|-------|----------|
| Worker | worker1@example.com | password123 |
| Worker | worker2@example.com | password123 |
| Business | business1@example.com | password123 |
| Business | business2@example.com | password123 |

---

## 📈 Progress Summary

### MVP Scope (11 items)
- ✅ 5 Completed
- ⏳ 4 Pending (1 manual migration, 3 QA tests)
- ⏸️ 1 Skipped (BETA_MODE active)
- ⏸️ 1 Bypassed (premium gating test)

### Post-MVP (8 items)
- ⏳ All pending

### Future (2 items)
- ⏳ All pending

**Overall**: ~24% of MVP complete, ~45% of total features complete

---

## 🎯 Production Readiness

### ✅ Ready
- Core matching functionality
- Authentication (all methods)
- Messaging system
- Work identity system
- Premium tier definitions

### ⚠️ Needs Work
- Database migration (manual step)
- Security audit (QA)
- Payment production setup
- Beta mode disabled
- Agora certificate

### ❌ Not Ready
- Production OAuth redirects
- Production environment variables
- App Store listings
- Analytics integration
- Error monitoring (Sentry configured but needs key)

---

## 💡 Recommendations

1. **Priority 1**: Run the database migration (`SR_DECISION_ENGINE.sql`)
2. **Priority 2**: Complete QA testing (auth, security, decision cards)
3. **Priority 3**: Set up production environment
4. **Priority 4**: Disable beta mode and test premium gating
5. **Priority 5**: Get production payment credentials

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **Agora Docs**: https://docs.agora.io
- **eSewa Docs**: https://developer.esewa.com.np

---

*Last Updated: January 2026*
*App Version: 1.0.0 (Beta)*
