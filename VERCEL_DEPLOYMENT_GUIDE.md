# Kaam Deu - Vercel Deployment Guide

**Project Name:** Kaam Deu
**Deployed URL:** https://kaam-deu.vercel.app
**Deployment Date:** February 28, 2026

---

## 1. PROJECT STRUCTURE

```
kaam deu final report sub mission/
├── frontend/              ← Root directory for Vercel
│   ├── src/
│   ├── package.json
│   ├── vercel.json        ← Vercel configuration
│   └── dist/              ← Build output directory
├── backend/
├── supabase/
└── docs/
```

---

## 2. VERCEL CONFIGURATION

### Project Settings
| Setting | Value |
|---------|-------|
| **Framework Preset** | Other |
| **Root Directory** | `frontend` |
| **Build Command** | `npx expo export -p web` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Development Command** | *(empty)* |

### vercel.json (located in `frontend/` folder)
```json
{
  "version": 2,
  "name": "kaam-deu",
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/:path*", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

---

## 3. ENVIRONMENT VARIABLES

### Vercel Environment Variables
| Name | Value |
|------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://cdtgfeuinoqqxagutnlu.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdGdmZXVpbm9xcXhhZ3V0bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Nzk4ODcsImV4cCI6MjA4MjI1NTg4N30.X2o34RDH39M9ZrAGF4IAiI-m1X7meKLs0URnYAxKJLs` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `510103206884-3n9eb4v41pv1s06592ci199o4u8eud74.apps.googleusercontent.com` |

⚠️ **IMPORTANT:** These variables should be set for **All Environments** (Production, Preview, Development)

---

## 4. SUPABASE CONFIGURATION

### URL Configuration
**Go to:** Supabase Dashboard → Authentication → URL Configuration

| Setting | Value |
|---------|-------|
| **Site URL** | `https://kaam-deu.vercel.app` |

### Redirect URLs (Add all of these):
- `https://kaam-deu.vercel.app`
- `https://kaam-deu.vercel.app/**`
- `https://kaam-deu.vercel.app/auth/callback`
- `http://localhost:8081`
- `http://localhost:8081/**`
- `http://localhost:8081/auth/callback`

### Supabase API Credentials
| Credential | Value |
|------------|-------|
| **Project URL** | `https://cdtgfeuinoqqxagutnlu.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdGdmZXVpbm9xcXhhZ3V0bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Nzk4ODcsImV4cCI6MjA4MjI1NTg4N30.X2o34RDH39M9ZrAGF4IAiI-m1X7meKLs0URnYAxKJLs` |
| **Service Role Key** | *(Keep secret - backend only)* |

---

## 5. GOOGLE OAUTH CONFIGURATION

### Google Cloud Console
**Go to:** Google Cloud Console → APIs & Services → Credentials

### OAuth 2.0 Client ID
| Setting | Value |
|---------|-------|
| **Client ID** | `510103206884-3n9eb4v41pv1s06592ci199o4u8eud74.apps.googleusercontent.com` |
| **Client Name** | `01 kaam deu web` |

### Authorized JavaScript Origins
- `http://localhost`
- `http://localhost:8081`
- `https://kaamdeu.aghealthindustries.com`
- `https://kaam-deu.vercel.app` ← **ADD THIS**

### Authorized Redirect URIs
- `https://auth.expo.io/@daauta/matching-app`
- `https://auth.expo.io/@daauta/kaam-deu-matching`
- `http://localhost:8081`
- `https://cdtgfeuinoqqxagutnlu.supabase.co/auth/v1/callback` ← **Supabase callback (already configured)**

---

## 6. DEPLOYMENT URLS

| Environment | URL |
|-------------|-----|
| **Production** | https://kaam-deu.vercel.app |
| **Preview (main branch)** | https://kaam-deu-git-main-dikshitadhikari40-ais-projects.vercel.app |
| **Other Deployments** | https://kaam-ms7h657qc-dikshitadhikari40-ais-projects.vercel.app |

⚠️ **NOTE:** The correct domain is `kaam-deu.vercel.app` (NOT `kaam-devu.vercel.app`)

---

## 7. GIT REPOSITORY

| Setting | Value |
|---------|-------|
| **Repository** | `ishitadhir40/kaam-dev` |
| **Branch** | `main` |
| **Latest Commit** | `c82fa12 - Initial commit - Kaam Deu app` |

---

## 8. HOW TO REDEPLOY

### Option 1: Via Vercel Dashboard
1. Go to Vercel Dashboard → Deployments
2. Click the three dots (⋯) on latest deployment
3. Click "Redeploy"
4. Click "Confirm"

### Option 2: Via Git Push
```bash
git add .
git commit -m "Your commit message"
git push
```
This triggers an automatic deployment.

---

## 9. TROUBLESHOOTING

### Build Fails
- Check **Root Directory** is set to `frontend`
- Check **Build Command** is `npx expo export -p web`
- Check **Output Directory** is `dist`

### Google Sign-In Not Working
1. Check `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is in Vercel environment variables
2. Check `https://kaam-deu.vercel.app` is in Google Console Authorized JavaScript origins
3. Check redirect URLs in Supabase include `https://kaam-deu.vercel.app/auth/callback`

### 404 Error / Page Not Found
- Make sure you're visiting `https://kaam-deu.vercel.app` (not `kaam-devu`)
- Check the deployment status is "Ready"

### Environment Variables Not Working
- After adding/editing variables, you MUST redeploy
- Variables apply to all environments (Production, Preview, Development)

---

## 10. USEFUL LINKS

| Service | URL |
|---------|-----|
| **Vercel Dashboard** | https://vercel.com/sk/dikshitadhikari40-ai-projects/kaam-deu |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Google Cloud Console** | https://console.cloud.google.com |
| **Live Site** | https://kaam-deu.vercel.app |

---

## 11. LEARNING RESOURCES FEATURE (NEW!)

Kaam Deu now includes a Learning Resources feature that allows users to browse and enroll in free courses from platforms like Coursera, YouTube, LinkedIn Learning, edX, and more.

### Features
- **Browse Courses**: 15+ free courses across 10+ categories
- **My Courses**: Track learning progress
- **Affiliate Tracking**: Earn commissions when users enroll
- **Click Analytics**: Track course engagement

### Screens
| Screen | Route | Description |
|--------|-------|-------------|
| **Learning Resources** | `LearningResources` | Browse all available courses |
| **My Courses** | `MyCourses` | View enrolled courses and progress |

### Course Platforms Supported
- Coursera (10-20% commission)
- YouTube (Ad revenue share)
- LinkedIn Learning
- edX (5-10% commission)
- Udemy (15% commission)
- Skillshare ($10 per referral)
- Khan Academy (All free)

### To Enable Affiliate Commissions:
1. Sign up for each platform's affiliate program
2. Replace `YOUR_CODE` in `learningService.ts` with your affiliate IDs
3. Run the Supabase migration: `supabase/learning_resources.sql`

### Access
- Go to **Settings** → **Learning & Skills** → **Browse Courses**

---

## 12. DEPLOYMENT CHECKLIST

When deploying to a new environment or for someone else:

- [ ] Set Root Directory to `frontend`
- [ ] Set Build Command to `npx expo export -p web`
- [ ] Set Output Directory to `dist`
- [ ] Add `EXPO_PUBLIC_SUPABASE_URL` environment variable
- [ ] Add `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variable
- [ ] Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` environment variable
- [ ] Update Supabase Site URL
- [ ] Add redirect URLs in Supabase
- [ ] Add domain to Google Console Authorized JavaScript origins
- [ ] Redeploy
- [ ] Test the live site

---

**Last Updated:** February 28, 2026
