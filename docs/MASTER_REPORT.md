# Kaam Deu - Master Project Report

**Project Name:** Kaam Deu (कामदेऊ)
**Report Date:** December 28, 2025
**Version:** 1.0.0
**Status:** Development Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Frontend Details](#6-frontend-details)
7. [Backend Details](#7-backend-details)
8. [Database Schema](#8-database-schema)
9. [Features](#9-features)
10. [Authentication Flow](#10-authentication-flow)
11. [API Endpoints](#11-api-endpoints)
12. [Configuration](#12-configuration)
13. [Development Status](#13-development-status)
14. [Recent Changes](#14-recent-changes)
15. [Issues Fixed](#15-issues-fixed)
16. [Recommendations](#16-recommendations)
17. [Deployment](#17-deployment)
18. [Getting Started](#18-getting-started)

---

## 1. Executive Summary

Kaam Deu is a **Tinder-style hiring/matching application** designed specifically for the Nepali gig economy. It connects workers seeking employment with businesses looking to hire, using a swipe-based matching system similar to popular dating apps.

### Key Highlights

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~24,000+ |
| Frontend Screens | 21 |
| Backend Endpoints | 35+ |
| Platforms Supported | iOS, Android, Web |
| Database | Supabase (PostgreSQL) |

### Current Build Status

| Check | Status |
|-------|--------|
| TypeScript Compilation | ✅ Pass |
| Expo Doctor | ✅ 16/16 checks passed |
| Dependencies | ✅ Installed |
| Backend Server | ✅ Working |

---

## 2. Project Overview

### Purpose
Kaam Deu bridges the gap between job seekers and employers in Nepal by providing an intuitive, mobile-first platform where:
- **Workers** can showcase their skills, experience, and preferences
- **Businesses** can post jobs and find suitable candidates
- Both parties can **swipe to match** and communicate directly

### Target Market
- Primary: Nepal
- User Types: Workers (job seekers), Businesses (employers)
- Payment Integration: eSewa (Nepali payment gateway)

### Business Model
- Freemium with premium features
- Subscription tiers for enhanced visibility
- Boost features for profile prominence
- Badge system for achievements

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│     iOS App     │   Android App   │          Web App            │
│   (Expo/RN)     │   (Expo/RN)     │      (Expo Web)             │
└────────┬────────┴────────┬────────┴────────────┬────────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│                  Express.js Backend                              │
│                  (Node.js / Port 3001)                           │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐ │
│  │  Auth   │ Profile │  Swipe  │  Jobs   │  Chat   │ Payment │ │
│  │ Routes  │ Routes  │ Routes  │ Routes  │ Routes  │ Routes  │ │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────┬───────────────────────────────────┤
│         Supabase            │           SQLite                   │
│    (Primary Database)       │     (Backend Session Store)        │
│  ┌───────────────────────┐ │  ┌───────────────────────────────┐│
│  │ - PostgreSQL          │ │  │ - OAuth Token Exchange        ││
│  │ - Auth (Users)        │ │  │ - Session Management          ││
│  │ - Storage (Images)    │ │  │ - Local Development           ││
│  │ - Real-time           │ │  └───────────────────────────────┘│
│  └───────────────────────┘ │                                    │
└─────────────────────────────┴───────────────────────────────────┘
```

### Monorepo Structure

```
master-app/
├── frontend/          # Expo/React Native Application
├── backend/           # Express.js API Server
├── supabase/          # Database Seed Data
├── scripts/           # Utility Scripts
├── docs/              # Documentation
└── .vscode/           # IDE Configuration
```

---

## 4. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 51.0.10 | Development platform |
| React Native | 0.74.5 | Cross-platform UI |
| React | 18.2.0 | UI Library |
| TypeScript | 5.3.3 | Type safety |
| React Navigation | 6.x | Navigation |
| React Native Reanimated | 3.10.1 | Animations |
| Supabase JS | 2.45.0 | Database client |
| Firebase | 12.7.0 | Analytics/Auth backup |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express | 4.18.2 | Web framework |
| sql.js | 1.10.3 | SQLite database |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT authentication |
| Supabase JS | 2.89.0 | Database client |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Supabase | Primary database + Auth + Storage |
| Docker | Container deployment |
| eSewa | Payment processing |

---

## 5. Project Structure

### Frontend Directory Structure

```
frontend/
├── src/
│   ├── screens/                 # 21 Screen Components (14,472 lines)
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── RoleSelectScreen.tsx
│   │   ├── Onboarding/
│   │   │   ├── WorkerWelcomeScreen.tsx
│   │   │   └── BusinessWelcomeScreen.tsx
│   │   ├── Core/
│   │   │   ├── FeedScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── MessagesListScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── Jobs/
│   │   │   ├── JobBoardScreen.tsx
│   │   │   ├── CreateJobPostScreen.tsx
│   │   │   └── JobDetailScreen.tsx
│   │   ├── Profile Setup/
│   │   │   ├── WorkerProfileSetupScreen.tsx
│   │   │   └── BusinessProfileSetupScreen.tsx
│   │   └── Premium/
│   │       ├── SubscriptionScreen.tsx
│   │       ├── PremiumScreen.tsx
│   │       ├── BoostScreen.tsx
│   │       └── BadgesScreen.tsx
│   │
│   ├── components/              # Reusable UI (2,556 lines)
│   │   ├── SwipeCard.tsx
│   │   ├── PhotoPicker.tsx
│   │   ├── FilterModal.tsx
│   │   ├── ReportModal.tsx
│   │   ├── StarRating.tsx
│   │   ├── ReviewCard.tsx
│   │   ├── BadgeCard.tsx
│   │   └── ErrorBoundary.tsx
│   │
│   ├── services/                # Business Logic (4,309 lines)
│   │   ├── database.ts          (1,567 lines)
│   │   ├── auth.ts              (514 lines)
│   │   ├── payment.ts           (657 lines)
│   │   ├── imageUpload.ts       (267 lines)
│   │   ├── subscription.ts      (261 lines)
│   │   ├── notifications.ts     (179 lines)
│   │   ├── boosts.ts            (243 lines)
│   │   ├── badges.ts            (341 lines)
│   │   └── analytics.ts         (280 lines)
│   │
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication state
│   │
│   ├── navigation/
│   │   └── RootNavigator.tsx    # Navigation configuration
│   │
│   ├── hooks/
│   │   └── useNotifications.ts
│   │
│   ├── lib/
│   │   └── supabase.ts          # Supabase client setup
│   │
│   ├── types.ts                 # TypeScript definitions
│   └── theme.ts                 # UI theming
│
├── assets/                      # Images, icons, splash
├── app.config.js                # Expo configuration
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── package.json
└── .env                         # Environment variables
```

### Backend Directory Structure

```
backend/
├── src/
│   ├── index.js                 # Express app entry point
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   ├── routes/                  # API Routes (2,682 lines)
│   │   ├── auth.js              (345 lines)
│   │   ├── social_auth.js       (375 lines)
│   │   ├── profiles.js          (186 lines)
│   │   ├── swipes.js            (158 lines)
│   │   ├── messages.js          (84 lines)
│   │   ├── jobs.js              (368 lines)
│   │   ├── payments.js          (298 lines)
│   │   ├── reviews.js           (231 lines)
│   │   ├── reports.js           (196 lines)
│   │   ├── blocks.js            (192 lines)
│   │   └── streaks.js           (249 lines)
│   └── db/
│       ├── database.js          # SQLite operations
│       ├── init.js              # Database initialization
│       └── schema.sql           # Database schema
│
├── data/                        # SQLite data directory
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env
```

---

## 6. Frontend Details

### Navigation Structure

```
RootNavigator
├── Auth Stack (Unauthenticated)
│   ├── RoleSelect
│   ├── Login
│   └── Register
│
├── Onboarding Stack
│   ├── WorkerWelcome
│   └── BusinessWelcome
│
├── Profile Setup Stack
│   ├── WorkerProfileSetup
│   └── BusinessProfileSetup
│
└── Main App Stack (Authenticated)
    ├── Tab Navigator
    │   ├── Feed Tab (Swipe)
    │   ├── Jobs Tab
    │   ├── Messages Tab
    │   ├── Profile Tab
    │   └── Settings Tab
    │
    └── Modal Screens
        ├── JobDetail
        ├── Chat
        ├── Premium
        ├── Subscription
        ├── Boost
        ├── Badges
        ├── Reviews
        ├── WriteReview
        ├── BlockedUsers
        ├── ChangePassword
        ├── TermsOfService
        └── PrivacyPolicy
```

### Key Screens

| Screen | Lines | Description |
|--------|-------|-------------|
| FeedScreen | 1,452 | Main swipe interface |
| WorkerProfileSetupScreen | 1,391 | Worker profile creation |
| BusinessProfileSetupScreen | 1,315 | Business profile creation |
| ChatScreen | 890 | Real-time messaging |
| JobBoardScreen | 756 | Job listings |
| SettingsScreen | 523 | App settings |

### Theme Configuration

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#4A90D9',      // Blue
    secondary: '#C9A962',    // Gold
    accent: '#4A90D9',
    background: '#05050A',   // Dark
    card: '#1A1A2E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#2A2A3E',
    error: '#FF4B4B',
    success: '#4CAF50',
  }
};
```

---

## 7. Backend Details

### Express App Configuration

```javascript
// src/index.js
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', socialAuthRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/streaks', streakRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

### Middleware

**Authentication Middleware (auth.js)**
- JWT token verification
- User extraction from token
- Protected route handling

---

## 8. Database Schema

### Supabase Tables

| Table | Description |
|-------|-------------|
| users | User accounts (email, role) |
| worker_profiles | Worker details (skills, experience) |
| business_profiles | Business details (company info) |
| swipes | Match tracking |
| matches | Confirmed matches |
| messages | Chat messages |
| job_posts | Job listings |
| job_applications | Job applications |
| reviews | User reviews |
| reports | User reports |
| blocks | Blocked users |
| subscriptions | Premium subscriptions |
| boosts | Profile boosts |
| badges | User achievements |
| login_streaks | Gamification streaks |

### User Roles

```sql
CREATE TYPE user_role AS ENUM ('worker', 'business');
```

---

## 9. Features

### Worker Features

| Feature | Status | Description |
|---------|--------|-------------|
| Profile Creation | ✅ | Photos, skills, experience |
| Swipe Matching | ✅ | Swipe right/left on businesses |
| Job Board | ✅ | Browse job listings |
| Messaging | ✅ | Chat with matches |
| Reviews | ✅ | View and write reviews |
| Premium Subscription | ✅ | Enhanced features |
| Profile Boost | ✅ | Increased visibility |
| Badges | ✅ | Achievement system |
| Push Notifications | ✅ | Match/message alerts |

### Business Features

| Feature | Status | Description |
|---------|--------|-------------|
| Company Profile | ✅ | Logo, description, team |
| Swipe Matching | ✅ | Swipe on worker profiles |
| Job Posting | ✅ | Create/manage job posts |
| Messaging | ✅ | Chat with matched workers |
| Reviews | ✅ | Rate workers |
| Verification | ✅ | Business verification badge |
| Premium Features | ✅ | Enhanced visibility |
| Analytics | ✅ | Profile insights |

### Platform Features

| Feature | Status |
|---------|--------|
| Dark Mode UI | ✅ |
| Multi-platform (iOS/Android/Web) | ✅ |
| Real-time Messaging | ✅ |
| Push Notifications | ✅ |
| eSewa Payment Integration | ✅ |
| Google OAuth | ✅ |
| LinkedIn OAuth | ✅ |
| Image Upload | ✅ |
| Account Deletion | ✅ |
| User Blocking | ✅ |
| Report System | ✅ |

---

## 10. Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. Role Selection
   ┌────────────────┐
   │ RoleSelectScreen│
   │  ┌──────────┐  │
   │  │  Worker  │──┼──► Worker Flow
   │  └──────────┘  │
   │  ┌──────────┐  │
   │  │ Business │──┼──► Business Flow
   │  └──────────┘  │
   └────────────────┘

2. Authentication Options
   ┌────────────────────────────────────────┐
   │              LoginScreen               │
   │  ┌──────────────────────────────────┐ │
   │  │         Email/Password           │ │
   │  └──────────────────────────────────┘ │
   │  ┌──────────────────────────────────┐ │
   │  │          Google OAuth            │ │
   │  └──────────────────────────────────┘ │
   │  ┌──────────────────────────────────┐ │
   │  │         LinkedIn OAuth           │ │
   │  └──────────────────────────────────┘ │
   └────────────────────────────────────────┘

3. Onboarding (First Login)
   Worker  ──► WorkerWelcome  ──► WorkerProfileSetup  ──► Feed
   Business ──► BusinessWelcome ──► BusinessProfileSetup ──► Feed

4. Account Switching
   Settings ──► "Switch Account Type" ──► Role Selection
```

---

## 11. API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/linkedin/callback` | LinkedIn OAuth |

### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles/feed` | Get profiles for swiping |
| GET | `/api/profiles/worker/:id` | Get worker profile |
| PUT | `/api/profiles/worker` | Update worker profile |
| GET | `/api/profiles/business/:id` | Get business profile |
| PUT | `/api/profiles/business` | Update business profile |

### Swipes & Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/swipes` | Record a swipe |
| GET | `/api/swipes/matches` | Get all matches |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job post |
| GET | `/api/jobs/:id` | Get job details |
| PUT | `/api/jobs/:id` | Update job post |
| DELETE | `/api/jobs/:id` | Delete job post |
| POST | `/api/jobs/:id/apply` | Apply to job |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:matchId` | Get conversation |
| POST | `/api/messages/:matchId` | Send message |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/:userId` | Get user reviews |
| POST | `/api/reviews` | Write review |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/esewa` | Process eSewa payment |
| GET | `/api/payments/verify` | Verify payment |

### Safety

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | Report user |
| POST | `/api/blocks` | Block user |
| GET | `/api/blocks` | List blocked users |
| DELETE | `/api/blocks/:id` | Unblock user |

---

## 12. Configuration

### Environment Variables

**Frontend (.env)**
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_API_URL=http://localhost:3001
```

**Backend (.env)**
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_key
ESEWA_MERCHANT_ID=your_merchant_id
```

### Expo Configuration (app.config.js)

```javascript
{
  name: 'Kaam Deu',
  slug: 'kaam-deu-matching',
  version: '1.0.0',
  scheme: 'kaamdeu',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  platforms: ['ios', 'android', 'web'],
  ios: {
    bundleIdentifier: 'com.kaamdeu.app',
    // Camera and photo permissions configured
  },
  android: {
    package: 'com.kaamdeu.app',
    adaptiveIcon: { ... }
  }
}
```

---

## 13. Development Status

### Code Quality Checks

| Check | Result |
|-------|--------|
| TypeScript Compilation | ✅ Pass (no errors) |
| Expo Doctor | ✅ 16/16 checks passed |
| Dependencies Installed | ✅ All packages installed |
| Backend Syntax | ✅ No errors |

### Code Statistics

| Component | Lines of Code |
|-----------|---------------|
| Frontend Screens | 14,472 |
| Frontend Services | 4,309 |
| Frontend Components | 2,556 |
| Backend Routes | 2,682 |
| **Total** | **~24,000+** |

---

## 14. Recent Changes

### Git Commit History

| Hash | Message |
|------|---------|
| 6ec1eab | feat: Add Python debugger and testing configurations, and implement `resetToRoleSelect` in AuthContext |
| aaf653a | Refine project structure: Remove duplicates and consolidate files |
| be85b26 | Cleanup: Remove unused files and outdated documentation |
| 450a57e | chore: finalize monorepo structure, add README, and fix type errors |
| 50a77a4 | chore: repo cleanup (archive App.tsx clones, ignore rules, move supabase & docs) |

### Current Uncommitted Changes

| File | Change |
|------|--------|
| frontend/package.json | Fixed TypeScript version and removed @types/react-native |
| frontend/src/screens/SettingsScreen.tsx | Added "Switch Account Type" feature |
| package-lock.json | Updated dependencies |

---

## 15. Issues Fixed

### This Session

| Issue | Fix |
|-------|-----|
| TypeScript version mismatch | Downgraded to ~5.3.3 (Expo 51 compatible) |
| @types/react-native conflict | Removed redundant types package |
| Expo Doctor warnings | Fixed all 16 compatibility checks |

### Previously Resolved

- Monorepo structure finalized
- Duplicate files removed
- Type errors fixed
- Navigation structure implemented
- Account switching feature added

---

## 16. Recommendations

### High Priority

1. **Add ESLint + Prettier**
   - Configure consistent code formatting
   - Add pre-commit hooks

2. **Add Testing Framework**
   - Jest for unit tests
   - React Testing Library for components
   - API integration tests

3. **Migrate Backend to TypeScript**
   - Better type safety
   - Consistent with frontend

### Medium Priority

4. **Add API Documentation**
   - OpenAPI/Swagger spec
   - Postman collection

5. **Improve Error Handling**
   - Structured error responses
   - Error logging service

6. **Add CI/CD Pipeline**
   - Automated testing
   - Build verification
   - Deployment automation

### Low Priority

7. **Performance Optimization**
   - Image caching
   - Query optimization
   - Bundle size reduction

8. **Security Audit**
   - Dependency vulnerabilities
   - API security review

---

## 17. Deployment

### Production URL
```
https://kd.aghealthindustries.com
```

### Docker Deployment

```bash
# Build and run backend
cd backend
docker-compose up -d
```

### Expo Deployment

```bash
# Build for iOS/Android
npx eas build --platform all

# Publish updates
npx eas update
```

---

## 18. Getting Started

### Prerequisites

- Node.js 18+ (20 recommended)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

```bash
# Clone repository
git clone <repository-url>
cd master-app

# Install all dependencies
npm install

# Set up environment variables
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your credentials

# Start development
npm run dev:frontend   # Start Expo (port 8081)
npm run dev:backend    # Start backend (port 3001)
```

### Demo Accounts

For testing purposes:
- **Workers:** test accounts available in seed data
- **Businesses:** test accounts available in seed data
- **Password:** `password123`

---

## Appendix

### A. File Counts

```
frontend/src/screens/    21 files
frontend/src/components/  9 files
frontend/src/services/    9 files
backend/src/routes/      11 files
```

### B. Dependencies Summary

**Frontend:** 29 dependencies, 9 dev dependencies
**Backend:** 8 dependencies, 1 dev dependency

### C. Platform Support

| Platform | Support Level |
|----------|--------------|
| iOS | Full (Expo) |
| Android | Full (Expo) |
| Web | Full (Expo Web) |

---

*This report was generated on December 28, 2025*
*Kaam Deu v1.0.0*
