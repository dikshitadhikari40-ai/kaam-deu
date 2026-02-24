# Next Steps Checklist - Kaam Deu

## 🚀 Immediate Actions (Do First)

### 1. Environment Setup ⏳
- [ ] Copy `frontend/.env.example` to `frontend/.env`
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Fill in Supabase credentials (URL, anon key, service key)
- [ ] Fill in OAuth credentials (Google, LinkedIn)
- [ ] Set backend API URL
- [ ] Verify environment variables are loaded

**Files to create:**
- `frontend/.env`
- `backend/.env`

---

### 2. Database Migration (CRITICAL) ⏳
- [ ] Read `DATABASE_MIGRATION_GUIDE.md`
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Run `supabase/SR_DECISION_ENGINE.sql` migration
- [ ] Verify migration success (check tables, functions)
- [ ] Run verification queries from guide
- [ ] Test `check_premium_access()` function

**Status:** ⚠️ **MUST DO** - Blocks premium features

---

### 3. Verify BETA_MODE Status ⏳
- [ ] Check `frontend/src/hooks/usePremiumAccess.ts`
- [ ] Note current BETA_MODE value (should be `true`)
- [ ] Document: BETA_MODE enables all premium features for testing
- [ ] Plan: Set to `false` before production launch

**Current Status:** `BETA_MODE = true` (all features unlocked)

---

## 🧪 Testing Phase (After Setup)

### 4. Authentication Testing ⏳
- [ ] Test Google login (worker account)
- [ ] Test Google login (business account)
- [ ] Test LinkedIn login
- [ ] Test Email/Password login
- [ ] Test account linking (link Google to email account)
- [ ] Test logout and re-login
- [ ] Verify welcome state persists after re-login

**Test Accounts:**
- worker1@example.com / password123
- business1@example.com / password123

---

### 5. Security Audit ⏳
- [ ] Test RLS policies (worker can't access other worker's data)
- [ ] Test business can't edit worker identities
- [ ] Test hidden identities don't appear in search
- [ ] Test contact requests are properly scoped
- [ ] Test saved searches only visible to owner
- [ ] Verify unauthorized access attempts are blocked

---

### 6. Decision Card Testing ⏳
- [ ] Create test work identities
- [ ] Search for workers as business user
- [ ] Verify decision cards display correctly
- [ ] Check fit scores (overall, pay, availability)
- [ ] Verify explanation text is readable
- [ ] Test with missing optional fields
- [ ] Test compare mode (select 2-5 workers)
- [ ] Verify comparison screen loads correctly

---

## 🔧 Configuration (Before Production)

### 7. Disable Beta Mode ⏳
- [ ] Set `BETA_MODE = false` in `usePremiumAccess.ts`
- [ ] Test premium gating (free users see upgrade CTAs)
- [ ] Test Pro tier limits (3 compare, 10 saved searches)
- [ ] Test Business tier limits (5 compare, 20 saved searches)
- [ ] Verify upgrade flows work

**File:** `frontend/src/hooks/usePremiumAccess.ts` (line 13)

---

### 8. Payment Gateway Setup ⏳
- [ ] Get production eSewa merchant credentials
- [ ] Update backend `.env` with production credentials
- [ ] Test payment flow end-to-end
- [ ] Verify subscription activation after payment
- [ ] Test payment verification webhook

**Current:** Sandbox mode (EPAYTEST)

---

### 9. Agora Calls Setup ⏳
- [ ] Log in to Agora Console
- [ ] Enable App Certificate for production
- [ ] Add certificate to backend `.env`
- [ ] Test voice calls
- [ ] Test video calls
- [ ] Verify call history is saved

**Current:** App ID configured, certificate needed

---

## 🚢 Production Deployment

### 10. Backend Deployment ⏳
- [ ] Choose hosting (Railway/Render/Fly.io)
- [ ] Deploy backend code
- [ ] Set production environment variables
- [ ] Verify health check endpoint works
- [ ] Test API endpoints
- [ ] Set up monitoring/logging

---

### 11. Frontend Build ⏳
- [ ] Update `app.config.js` with production URLs
- [ ] Build iOS app: `eas build --platform ios --profile production`
- [ ] Build Android app: `eas build --platform android --profile production`
- [ ] Test production builds
- [ ] Submit to App Store / Play Store

---

### 12. OAuth Redirect URLs ⏳
- [ ] Update Google OAuth redirect URLs in Google Cloud Console
- [ ] Update LinkedIn redirect URLs in LinkedIn Developers
- [ ] Update Supabase redirect URLs
- [ ] Test OAuth flows in production

---

## 📊 Monitoring & Analytics

### 13. Error Monitoring ⏳
- [ ] Set up Sentry (if not already)
- [ ] Add Sentry DSN to frontend `.env`
- [ ] Test error reporting
- [ ] Set up alerts

---

### 14. Analytics ⏳
- [ ] Set up analytics (Google Analytics / Mixpanel)
- [ ] Track key events (signups, matches, messages)
- [ ] Set up dashboards

---

## 📝 Documentation

### 15. Update Documentation ⏳
- [ ] Update README with production setup
- [ ] Document environment variables
- [ ] Create deployment runbook
- [ ] Document known issues/limitations

---

## 🎯 Priority Summary

### 🔴 Critical (Do Now)
1. Environment setup (.env files)
2. Database migration
3. Authentication testing

### 🟡 Important (This Week)
4. Security audit
5. Decision card testing
6. Disable beta mode

### 🟢 Nice to Have (Before Launch)
7. Payment production setup
8. Agora certificate
9. Production deployment
10. OAuth redirects

---

## 📞 Quick Reference

### Key Files
- `frontend/.env` - Frontend environment variables
- `backend/.env` - Backend environment variables
- `supabase/SR_DECISION_ENGINE.sql` - Database migration
- `frontend/src/hooks/usePremiumAccess.ts` - Beta mode toggle

### Key Commands
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm start

# Type check
cd frontend && npm run typecheck

# Build for production
cd frontend && eas build --platform all
```

### Test Accounts
- worker1@example.com / password123
- business1@example.com / password123

---

*Last Updated: January 2026*
*Check off items as you complete them!*
