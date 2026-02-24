# 🧪 Testing Guide - After Migration

## ✅ Migration Complete!
The database migration has been successfully run. Now let's test the new features!

---

## 🚀 Servers Starting

**Backend:** Running on http://localhost:3001  
**Frontend:** Running on http://localhost:8081

Wait a few seconds for both servers to start up.

---

## 📱 How to Test

### Option 1: Web Browser (Easiest)
1. Open your browser
2. Go to: **http://localhost:8081**
3. The app should load

### Option 2: Mobile Device
1. Install **Expo Go** app on your phone
2. Make sure phone and computer are on same WiFi
3. Scan the QR code from the terminal
4. App will open on your phone

---

## 🧪 What to Test

### 1. Authentication ✅
- [ ] Log in with email/password
- [ ] Log in with Google
- [ ] Log in with LinkedIn
- [ ] Logout and re-login (should not show onboarding again)

**Test Accounts:**
- Email: `business1@example.com` / Password: `password123`
- Email: `worker1@example.com` / Password: `password123`

---

### 2. Work Identity System (Workers) ✅
- [ ] Go to "Work Identities" or "My Identities"
- [ ] Create a new work identity (e.g., Driver, Cook)
- [ ] Add skills to the identity
- [ ] Set pay expectations
- [ ] Set availability
- [ ] View capability score
- [ ] Toggle visibility (active/hidden)

---

### 3. Decision Cards (Businesses) ✅ **NEW FEATURE!**
- [ ] Log in as a **business** user
- [ ] Go to "Search Workers" or "Find Workers"
- [ ] You should see **Decision Cards** with:
  - ✅ Overall fit score (0-100)
  - ✅ Pay fit score
  - ✅ Availability score
  - ✅ Explanation text
  - ✅ Explanation points (bullet list)
- [ ] Try filtering by:
  - Job category
  - Capability score
  - Experience level
  - Pay range
  - Availability type
  - Required skills

---

### 4. Compare Mode (Businesses) ✅ **NEW FEATURE!**
- [ ] While searching workers, look for a **"Compare"** button or toggle
- [ ] Enter "Compare Mode"
- [ ] Select 2-5 workers (checkboxes should appear)
- [ ] Click "Compare X Workers" button
- [ ] You should see a comparison screen with:
  - ✅ Side-by-side comparison
  - ✅ Strengths for each worker
  - ✅ Considerations for each worker
  - ✅ Skill comparison
  - ✅ Pay fit analysis

**Note:** With BETA_MODE active, you can compare up to 5 workers (normally requires premium).

---

### 5. Premium Features ✅
- [ ] Check if premium features are accessible (BETA_MODE = true, so all features unlocked)
- [ ] Try saving a search (if available)
- [ ] Try advanced filters

---

### 6. Basic Features ✅
- [ ] Swipe on profiles (if on Feed screen)
- [ ] View matches
- [ ] Send messages
- [ ] Upload profile photo
- [ ] View profile

---

## 🐛 Troubleshooting

### App won't load / Blank screen
1. Check backend is running: http://localhost:3001/health
2. Check frontend console for errors (F12 in browser)
3. Try refreshing the page

### "Function not found" errors
- The migration might not have completed fully
- Check Supabase SQL Editor for any errors
- Verify functions exist:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_name IN ('get_decision_cards', 'compare_identities', 'check_premium_access');
  ```

### Decision cards not showing
- Make sure you're logged in as a **business** user
- Make sure there are work identities created (by workers)
- Check browser console for errors

### Compare mode not working
- Make sure you're logged in as a **business** user
- Make sure you have at least 2 work identities to compare
- Check if BETA_MODE is enabled (should be in `usePremiumAccess.ts`)

---

## 📊 Expected Results

### Decision Cards Should Show:
- **Overall Fit Score:** 0-100 (green = 80+, yellow = 50-79, red = <50)
- **Pay Fit Score:** How well salary matches budget
- **Availability Score:** How well availability matches needs
- **Explanation:** Text explaining why this is a good match
- **Explanation Points:** Bullet points with key highlights

### Compare Mode Should Show:
- **Side-by-side cards** for each selected worker
- **Strengths:** List of positive points
- **Considerations:** List of things to consider
- **Skills:** Full skill list with levels
- **Pay Range:** Formatted salary expectations
- **Fit Scores:** Overall and pay fit scores

---

## ✅ Success Checklist

After testing, you should have verified:
- [ ] Migration completed successfully
- [ ] Backend running on port 3001
- [ ] Frontend running on port 8081
- [ ] Can log in successfully
- [ ] Decision cards appear in business search
- [ ] Compare mode works
- [ ] No console errors
- [ ] Features work as expected

---

## 🎯 Next Steps After Testing

1. **If everything works:**
   - ✅ Migration successful!
   - ✅ Features are working
   - ✅ Ready for more testing or production prep

2. **If issues found:**
   - Note the errors
   - Check browser console
   - Check backend logs
   - Share errors with me for help

---

**Happy Testing! 🚀**

*If you encounter any issues, share the error messages and I'll help fix them.*
