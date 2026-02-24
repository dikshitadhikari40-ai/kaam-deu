# Kaam Deu - Job Matching App

A Tinder-style job matching app built with Expo (React Native) for the frontend and Express.js for the backend.

## Project Structure

```
matching-app-expo-ts/
├── App.tsx                 # Main app entry point
├── src/
│   ├── screens/           # All app screens
│   │   ├── RoleSelectScreen.tsx      # Worker/Business selection
│   │   ├── LoginScreen.tsx           # Login & Registration
│   │   ├── RegisterScreen.tsx        # Registration form
│   │   ├── FeedScreen.tsx            # Swipe cards (main feature)
│   │   ├── ChatScreen.tsx            # Messages list
│   │   ├── ProfileScreen.tsx         # User profile
│   │   ├── SettingsScreen.tsx        # App settings
│   │   ├── WorkerProfileSetupScreen.tsx
│   │   ├── BusinessProfileSetupScreen.tsx
│   │   ├── TermsOfServiceScreen.tsx
│   │   └── PrivacyPolicyScreen.tsx
│   ├── components/        # Reusable components
│   │   ├── SwipeCard.tsx
│   │   ├── AppButton.tsx
│   │   ├── AppText.tsx
│   │   └── ScreenContainer.tsx
│   ├── context/
│   │   └── AuthContext.tsx    # Authentication state
│   ├── services/
│   │   └── api.ts             # API calls to backend
│   ├── navigation/
│   │   └── RootNavigator.tsx  # App navigation
│   ├── lib/
│   │   └── supabase.ts        # Supabase client (optional)
│   ├── theme.ts               # App theme/colors
│   └── types.ts               # TypeScript types
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── index.js           # Server entry point
│   │   ├── db/
│   │   │   ├── database.js    # SQLite database
│   │   │   └── init.js        # DB initialization & seeding
│   │   ├── routes/
│   │   │   ├── auth.js        # Authentication routes
│   │   │   ├── profiles.js    # Profile routes
│   │   │   ├── swipes.js      # Swipe/match routes
│   │   │   ├── messages.js    # Chat messages
│   │   │   └── social_auth.js # Social login
│   │   └── middleware/
│   │       └── auth.js        # JWT authentication
│   └── package.json
├── assets/                # Images, icons, splash screen
├── .env                   # Environment variables
├── app.config.js          # Expo configuration
└── package.json           # Frontend dependencies
```

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Start the App

**Option A: Start both servers together (recommended)**
```bash
npm run dev
```

**Option B: Start servers separately**
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
npm run web
```

### 3. Open the App

- **Web**: http://localhost:8081
- **Backend API**: http://localhost:3001

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend + frontend together |
| `npm run web` | Start web version only |
| `npm run ios` | Start iOS simulator |
| `npm run android` | Start Android emulator |
| `npm run backend` | Start backend server only |

## Demo Accounts

### Supabase Test Accounts (Recommended)

**Workers:**
| Email | Password |
|-------|----------|
| worker1@example.com | password123 |
| worker2@example.com | password123 |
| worker3@example.com | password123 |
| worker4@example.com | password123 |
| worker5@example.com | password123 |

**Businesses:**
| Email | Password |
|-------|----------|
| business1@example.com | password123 |
| business2@example.com | password123 |
| business3@example.com | password123 |
| business4@example.com | password123 |
| business5@example.com | password123 |

### Legacy Backend Accounts (if using Express backend)

**Workers:**
- Email: `ram.thapa@email.com` / Password: `password123`
- Email: `sita.gurung@email.com` / Password: `password123`

**Businesses:**
- Email: `hr@everestconstruction.com` / Password: `password123`
- Email: `jobs@himalayahotel.com` / Password: `password123`

## Environment Variables (.env)

```env
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id

# LinkedIn OAuth (configured in Supabase dashboard)
EXPO_PUBLIC_LINKEDIN_CLIENT_ID=your-linkedin-client-id

# Agora (for video calls - optional)
EXPO_PUBLIC_AGORA_APP_ID=your-agora-app-id

# Legacy Backend (optional)
API_BASE_URL=http://localhost:3001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/profiles/feed` | Get swipe feed |
| PUT | `/api/profiles/worker` | Update worker profile |
| PUT | `/api/profiles/business` | Update business profile |
| POST | `/api/swipes` | Record a swipe |
| GET | `/api/swipes/matches` | Get matches |
| GET | `/api/messages/:matchId` | Get chat messages |
| POST | `/api/messages/:matchId` | Send message |

## Features

### Authentication
- [x] Role selection (Worker/Business)
- [x] Email/Password authentication
- [x] Google OAuth
- [x] LinkedIn OAuth
- [x] **Account Linking** - Link Google/LinkedIn to existing email account
- [x] Password reset via email
- [x] Per-user session persistence (no re-onboarding after logout)

### Core Features
- [x] Swipe-based matching (left/right/up for super-like)
- [x] Smart matching algorithm with compatibility scores
- [x] Match notifications with haptic feedback
- [x] Real-time chat with message history
- [x] Business Feed (LinkedIn-style posts)
- [x] Job posting and applications

### Profile & Settings
- [x] Worker profile setup (skills, experience, salary expectations)
- [x] Business profile setup (company info, locations, benefits)
- [x] Profile photo upload
- [x] **Linked Accounts** section in Settings
- [x] Privacy controls (online status, read receipts)
- [x] Dark theme UI

## Tech Stack

**Frontend:**
- Expo SDK 54 / React Native
- React Navigation v6
- React Native Reanimated (gestures & animations)
- TypeScript
- @expo/vector-icons

**Backend (Supabase - Primary):**
- Supabase Auth (Email, Google, LinkedIn OAuth)
- PostgreSQL database
- Row Level Security (RLS)
- Realtime subscriptions

**Backend (Express.js - Legacy/Optional):**
- Express.js
- SQLite (sql.js)
- JWT authentication
- bcryptjs (password hashing)

## Hosting on Your Laptop

Your laptop serves as the server:
- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:8081`

For mobile device testing, use your laptop's IP address instead of localhost.

## Troubleshooting

**"Not found" on localhost:3001**
- This is normal - the backend API has no homepage
- API endpoints work at `/api/...` paths

**App not loading**
1. Make sure both servers are running (`npm run dev`)
2. Hard refresh browser (Cmd+Shift+R)
3. Clear Expo cache: `npx expo start --clear`

**Port already in use**
```bash
# Kill processes on ports
lsof -i :3001 | awk 'NR>1 {print $2}' | xargs kill -9
lsof -i :8081 | awk 'NR>1 {print $2}' | xargs kill -9
```
