# QA Testing Checklist - Kaam Deu

## 🧪 Authentication Testing

### Google OAuth
- [ ] **Worker Account**
  - [ ] Sign in with Google as worker
  - [ ] Profile is created automatically
  - [ ] Can complete profile setup
  - [ ] Can access worker features

- [ ] **Business Account**
  - [ ] Sign in with Google as business
  - [ ] Profile is created automatically
  - [ ] Can complete business profile setup
  - [ ] Can access business features

### LinkedIn OAuth
- [ ] Sign in with LinkedIn
- [ ] Profile is created automatically
- [ ] Can complete profile setup
- [ ] Works on both web and mobile

### Email/Password
- [ ] Sign up with email/password
- [ ] Email verification (if enabled)
- [ ] Sign in with email/password
- [ ] Password reset flow (if implemented)

### Account Linking
- [ ] Link Google account to existing email account
- [ ] Link LinkedIn account to existing email account
- [ ] Can sign in with any linked method
- [ ] Can unlink accounts (with safety check)
- [ ] Cannot unlink last auth method

### Session Management
- [ ] Session persists after app restart
- [ ] Logout clears session
- [ ] Re-login doesn't show onboarding again
- [ ] Welcome state persists per-user

---

## 🔒 Security Audit (RLS Testing)

### Worker Data Isolation
- [ ] Worker A cannot see Worker B's work identities
- [ ] Worker A cannot edit Worker B's identities
- [ ] Worker A cannot access Worker B's messages
- [ ] Worker A cannot see Worker B's profile details

### Business Data Isolation
- [ ] Business A cannot edit any worker identities
- [ ] Business A cannot see Business B's saved searches
- [ ] Business A cannot access Business B's job posts
- [ ] Business A cannot see Business B's messages

### Identity Visibility
- [ ] Hidden identities don't appear in search
- [ ] Paused identities don't appear in search
- [ ] Only active identities appear in search
- [ ] Workers can toggle visibility

### Contact Requests
- [ ] Contact requests are scoped to requester
- [ ] Workers can only see requests for their identities
- [ ] Businesses can only see requests they sent
- [ ] Expired requests don't appear

### Saved Searches
- [ ] Saved searches only visible to owner
- [ ] Cannot access other business's saved searches
- [ ] Cannot edit other business's saved searches

### Unauthorized Access
- [ ] Direct API calls without auth are rejected
- [ ] Invalid tokens are rejected
- [ ] Expired sessions are rejected
- [ ] Cross-role access is blocked (worker accessing business-only features)

---

## 🎴 Decision Card Testing

### Display
- [ ] Decision cards render correctly
- [ ] All fields display when populated
- [ ] Missing optional fields handled gracefully
- [ ] Fit scores display correctly (0-100)
- [ ] Explanation text is readable
- [ ] Colors match score ranges (green/yellow/red)

### Data Scenarios
- [ ] Card with all fields populated
- [ ] Card with missing optional fields
- [ ] Card with low capability score (< 30)
- [ ] Card with high capability score (> 80)
- [ ] Card with missing pay range
- [ ] Card with missing availability

### Fit Scores
- [ ] Overall fit score calculates correctly
- [ ] Pay fit score calculates correctly
- [ ] Availability score calculates correctly
- [ ] Scores update when filters change

### Explanation
- [ ] Explanation text is generated
- [ ] Explanation points are listed
- [ ] Explanation mentions key strengths
- [ ] Explanation mentions considerations

---

## 🔄 Compare Mode Testing

### Selection
- [ ] Can select 2 workers for comparison
- [ ] Can select 5 workers for comparison
- [ ] Cannot select more than 5
- [ ] Can deselect workers
- [ ] Selection persists when scrolling

### Comparison Screen
- [ ] Comparison screen loads correctly
- [ ] All selected workers appear
- [ ] Strengths are listed for each
- [ ] Considerations are listed for each
- [ ] Skill comparison displays correctly
- [ ] Pay fit analysis shows correctly
- [ ] Horizontal scroll works on small screens

### Edge Cases
- [ ] Compare with 2 identities
- [ ] Compare with 5 identities
- [ ] Error shown if > 5 selected
- [ ] Data loads within 3 seconds
- [ ] Handles missing data gracefully

---

## 💎 Premium Gating Testing

### Free Tier
- [ ] Cannot access compare mode (shows upgrade CTA)
- [ ] Cannot save searches (shows upgrade CTA)
- [ ] Limited to basic search
- [ ] Upgrade button navigates to PremiumScreen

### Pro Tier
- [ ] Can compare up to 3 workers
- [ ] Can save up to 10 searches
- [ ] Has access to advanced filters
- [ ] Decision cards are available

### Business Tier
- [ ] Can compare up to 5 workers
- [ ] Can save up to 20 searches
- [ ] Has access to all features
- [ ] All premium features unlocked

### Beta Mode (Current)
- [ ] All users get Business tier access
- [ ] Compare mode enabled (up to 5)
- [ ] Saved searches enabled (up to 20)
- [ ] All advanced filters available

**Note:** Test premium gating after setting `BETA_MODE = false`

---

## 🔍 Search & Filter Testing

### Basic Search
- [ ] Search by job category works
- [ ] Results are relevant
- [ ] Results load quickly (< 2 seconds)
- [ ] Empty state shown when no results

### Advanced Filters
- [ ] Filter by capability score works
- [ ] Filter by experience level works
- [ ] Filter by pay range works
- [ ] Filter by availability works
- [ ] Filter by skills works
- [ ] Multiple filters combine correctly
- [ ] Clear filters button works

### Saved Searches
- [ ] Can save a search
- [ ] Saved search appears in list
- [ ] Can load saved search
- [ ] Can delete saved search
- [ ] Search count respects tier limits

---

## 💬 Messaging Testing

### Chat
- [ ] Messages send successfully
- [ ] Messages appear in real-time
- [ ] Messages persist after app restart
- [ ] Read receipts work
- [ ] Online status displays correctly

### Media
- [ ] Can send photos
- [ ] Can send documents
- [ ] Media uploads successfully
- [ ] Media displays correctly
- [ ] Large files handled gracefully

---

## 📞 Voice/Video Calls

### Voice Calls
- [ ] Can initiate voice call
- [ ] Call connects successfully
- [ ] Audio quality is good
- [ ] Can end call
- [ ] Call history is saved

### Video Calls
- [ ] Can initiate video call
- [ ] Video displays correctly
- [ ] Can toggle camera on/off
- [ ] Can toggle microphone on/off
- [ ] Can end call

---

## 💳 Payment Testing

### eSewa Integration
- [ ] Payment products display correctly
- [ ] Can select subscription tier
- [ ] Payment redirects to eSewa
- [ ] Payment verification works
- [ ] Subscription activates after payment
- [ ] Boosts/Super Likes credited

### Subscription Management
- [ ] Can view current subscription
- [ ] Can upgrade subscription
- [ ] Can cancel subscription
- [ ] Expired subscription reverts to free

---

## 🐛 Error Handling

### Network Errors
- [ ] Offline mode detected
- [ ] Offline banner displayed
- [ ] Errors are logged
- [ ] User-friendly error messages

### API Errors
- [ ] 401 errors handled (redirect to login)
- [ ] 403 errors handled (show permission message)
- [ ] 404 errors handled (show not found)
- [ ] 500 errors handled (show server error)

### Validation Errors
- [ ] Form validation works
- [ ] Error messages are clear
- [ ] Can correct and resubmit

---

## 📱 Platform Testing

### iOS
- [ ] App builds successfully
- [ ] All features work on iOS
- [ ] OAuth flows work
- [ ] Push notifications work (if configured)

### Android
- [ ] App builds successfully
- [ ] All features work on Android
- [ ] OAuth flows work
- [ ] Push notifications work (if configured)

### Web
- [ ] App loads in browser
- [ ] All features work on web
- [ ] OAuth flows work
- [ ] Responsive design works

---

## ✅ Test Results Template

```
Date: ___________
Tester: ___________
Platform: iOS / Android / Web
Build: ___________

### Passed Tests
- [List passed tests]

### Failed Tests
- [List failed tests with details]

### Issues Found
- [List any bugs or issues]

### Notes
- [Any additional observations]
```

---

## 🎯 Priority Testing Order

1. **Authentication** (Critical - blocks everything)
2. **Security/RLS** (Critical - data protection)
3. **Decision Cards** (Core feature)
4. **Compare Mode** (Premium feature)
5. **Premium Gating** (Revenue feature)
6. **Search & Filters** (Core feature)
7. **Messaging** (Core feature)
8. **Calls** (Advanced feature)
9. **Payments** (Revenue feature)
10. **Error Handling** (UX)

---

*Last Updated: January 2026*
*Run these tests before production launch!*
