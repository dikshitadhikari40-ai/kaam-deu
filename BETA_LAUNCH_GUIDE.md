# Kaam Deu - Beta Launch Guide

## Quick Start Commands

### Start Development Servers
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npx expo start
```

### Test on Phone
1. Install **Expo Go** app on your phone
2. Make sure phone and computer are on same WiFi
3. Scan QR code from terminal

---

## Beta Testing Checklist

### Before Inviting Testers

- [ ] Backend running on localhost:3001
- [ ] Frontend running on localhost:8081
- [ ] Supabase database connected
- [ ] Storage buckets created (run SQL migration)

### Test These Features

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| Sign Up | Create new account with email | Profile creation screen appears |
| Google Login | Tap "Continue with Google" | Redirects and logs in |
| Profile Setup | Fill worker/employer profile | Saves and shows feed |
| Swiping | Swipe right on profiles | Match created on mutual swipe |
| Chat | Send message to match | Message appears in real-time |
| Photo Upload | Add profile photo | Photo uploads to Supabase |
| Payments | Try eSewa payment (sandbox) | Redirects to eSewa test |

---

## Known Limitations (Beta)

1. **No password reset** - If users forget password, contact admin
2. **No email verification** - Emails not verified yet
3. **Sandbox payments only** - eSewa is in test mode
4. **Voice/Video calls** - Requires Agora certificate for production

---

## Deploying for Remote Testing

### Option 1: Expo Tunnel (Easiest)
```bash
cd frontend
npx expo start --tunnel
```
Share the QR code with testers.

### Option 2: Deploy Backend to Railway
1. Go to railway.app
2. Connect GitHub repo
3. Set environment variables from .env
4. Deploy

### Option 3: Deploy Backend to Render
1. Go to render.com
2. Create new Web Service
3. Connect repo, select backend folder
4. Set environment variables
5. Deploy

---

## Environment Variables Needed

### Backend (.env)
```
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-min-32-chars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
LINKEDIN_CLIENT_ID=your-linkedin-id
LINKEDIN_CLIENT_SECRET=your-linkedin-secret
ESEWA_MERCHANT_ID=EPAYTEST
ESEWA_MERCHANT_SECRET=8gBm/:&EnhH.1/q
ESEWA_PRODUCTION=false
AGORA_APP_ID=your-agora-app-id
```

### Frontend (.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_LINKEDIN_CLIENT_ID=your-linkedin-client-id
EXPO_PUBLIC_AGORA_APP_ID=your-agora-app-id
```

---

## Collecting Feedback

Ask testers to report:
1. App crashes (screenshot error)
2. Features not working
3. Confusing UI/UX
4. Missing features they expected

---

## Support

If issues occur:
1. Check backend logs: `cd backend && npm run dev`
2. Check Supabase dashboard for database errors
3. Check Expo logs for frontend errors
