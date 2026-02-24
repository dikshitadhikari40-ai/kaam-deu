# Kaam Deu - VS Code Setup & Deployment Guide

## Step 1: Open Project in VS Code

```bash
code /Users/dikshitadhikari/Downloads/matching-app-expo-ts/
```

Or manually: File > Open Folder > Select `/Users/dikshitadhikari/Downloads/matching-app-expo-ts/`

---

## Step 2: Install Dependencies (First Time Only)

Open VS Code Terminal (Ctrl+` or View > Terminal):

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

---

## Step 3: Start the App

### Option A: Start Both Servers Together (Recommended)
```bash
npm run dev
```

### Option B: Start Separately (Two Terminals)

**Terminal 1 - Backend:**
```bash
npm run backend
```

**Terminal 2 - Frontend:**
```bash
npm run web
```

---

## Step 4: Access the App

| Service | URL |
|---------|-----|
| Frontend App | http://localhost:8081 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

---

## Demo Login Credentials

### Workers
| Email | Password |
|-------|----------|
| ram.thapa@email.com | password123 |
| sita.gurung@email.com | password123 |
| krishna.maharjan@email.com | password123 |

### Businesses
| Email | Password |
|-------|----------|
| hr@everestconstruction.com | password123 |
| jobs@himalayahotel.com | password123 |
| recruit@kathmandutech.com | password123 |

---

## Project Structure

```
matching-app-expo-ts/
│
├── App.tsx                      # Main app entry
├── package.json                 # Frontend dependencies & scripts
├── app.config.js                # Expo configuration
├── .env                         # Environment variables
│
├── src/
│   ├── screens/                 # All screens
│   │   ├── RoleSelectScreen.tsx       # Worker/Business selection
│   │   ├── LoginScreen.tsx            # Login page
│   │   ├── RegisterScreen.tsx         # Registration
│   │   ├── FeedScreen.tsx             # Swipe cards
│   │   ├── ChatScreen.tsx             # Messages
│   │   ├── ProfileScreen.tsx          # User profile
│   │   ├── SettingsScreen.tsx         # Settings
│   │   ├── WorkerProfileSetupScreen.tsx
│   │   ├── BusinessProfileSetupScreen.tsx
│   │   ├── TermsOfServiceScreen.tsx
│   │   └── PrivacyPolicyScreen.tsx
│   │
│   ├── components/              # Reusable UI components
│   │   ├── SwipeCard.tsx
│   │   ├── AppButton.tsx
│   │   ├── AppText.tsx
│   │   └── ScreenContainer.tsx
│   │
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication state management
│   │
│   ├── services/
│   │   └── api.ts               # API calls to backend
│   │
│   ├── navigation/
│   │   └── RootNavigator.tsx    # App navigation routes
│   │
│   ├── lib/
│   │   └── supabase.ts          # Supabase client (optional)
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   └── spacing.ts
│   │
│   ├── theme.ts                 # Theme configuration
│   └── types.ts                 # TypeScript types
│
├── backend/                     # Express.js API Server
│   ├── package.json
│   ├── src/
│   │   ├── index.js             # Server entry point (port 3001)
│   │   │
│   │   ├── db/
│   │   │   ├── database.js      # SQLite database connection
│   │   │   └── init.js          # DB schema & seed data
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js          # /api/auth/* routes
│   │   │   ├── profiles.js      # /api/profiles/* routes
│   │   │   ├── swipes.js        # /api/swipes/* routes
│   │   │   ├── messages.js      # /api/messages/* routes
│   │   │   └── social_auth.js   # /api/social/* routes
│   │   │
│   │   └── middleware/
│   │       └── auth.js          # JWT authentication middleware
│   │
│   └── kaamdeu.db               # SQLite database file
│
└── assets/                      # Images, icons, splash
    ├── icon.png
    ├── splash.png
    ├── adaptive-icon.png
    └── favicon.png
```

---

## Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend together |
| `npm run web` | Start frontend only (port 8081) |
| `npm run ios` | Start iOS simulator |
| `npm run android` | Start Android emulator |
| `npm run start` | Start Expo dev server |
| `npm run backend` | Start backend only (port 3001) |

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{email, password, role, profile}` | Register user |
| POST | `/api/auth/login` | `{email, password}` | Login |
| GET | `/api/auth/me` | - | Get current user (requires token) |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles/feed` | Get profiles to swipe |
| PUT | `/api/profiles/worker` | Update worker profile |
| PUT | `/api/profiles/business` | Update business profile |
| GET | `/api/profiles/:userId` | Get specific profile |

### Swipes & Matches
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/swipes` | `{swipedId, direction}` | Record swipe |
| GET | `/api/swipes/matches` | - | Get all matches |

### Messages
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/messages/:matchId` | - | Get chat messages |
| POST | `/api/messages/:matchId` | `{content}` | Send message |

---

## Environment Variables (.env)

```env
# Supabase (Optional - using local SQLite by default)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth (Optional - for Google login)
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id

# API Configuration
API_BASE_URL=http://localhost:3001
```

---

## Database

The app uses **SQLite** (sql.js) stored in `backend/kaamdeu.db`

### Tables:
- `users` - User accounts
- `worker_profiles` - Worker profile data
- `business_profiles` - Business profile data
- `swipes` - Swipe records (left/right/up)
- `matches` - Mutual matches
- `chat_messages` - Chat messages

### Reset Database:
```bash
rm backend/kaamdeu.db
npm run backend  # Will recreate with seed data
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports
lsof -i :3001 | awk 'NR>1 {print $2}' | xargs kill -9
lsof -i :8081 | awk 'NR>1 {print $2}' | xargs kill -9
```

### Clear Expo Cache
```bash
npx expo start --clear
```

### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
npm install
cd backend && npm install && cd ..
```

### App Shows "Loading..."
- Check if backend is running: `curl http://localhost:3001/health`
- Check browser console (F12) for errors
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## Features Implemented

- [x] Role selection (Worker/Business)
- [x] Email/Password authentication
- [x] Google OAuth ready (needs credentials)
- [x] Swipe-based matching (left=no, right=yes, up=super like)
- [x] Match notifications popup
- [x] Chat/Messages list
- [x] Worker profile setup
- [x] Business profile setup
- [x] Profile viewing/editing
- [x] Settings screen
- [x] Terms of Service
- [x] Privacy Policy
- [x] Dark theme UI
- [x] Demo accounts with seed data

---

## Tech Stack

**Frontend:**
- Expo SDK 51
- React Native 0.74
- React Navigation 6
- React Native Reanimated
- TypeScript

**Backend:**
- Express.js
- SQLite (sql.js)
- JWT (jsonwebtoken)
- bcryptjs

---

## Next Steps / Future Features

- [ ] Video calls in chat
- [ ] Push notifications
- [ ] Image upload for profiles
- [ ] Location-based matching
- [ ] Real-time chat with WebSockets
- [ ] Profile verification badges

---

## Support

If you encounter issues, check:
1. Both servers running (`npm run dev`)
2. Browser console for errors (F12)
3. Terminal output for backend errors
4. Network tab to verify API calls
