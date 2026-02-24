# Hosting Guide: Kaam Deu App

This document provides instructions for hosting the **Kaam Deu** matching platform.

## Project Architecture
- **Frontend**: React Native with Expo (supports Web, iOS, Android).
- **Backend**: Node.js / Express server.
- **Database/Auth**: Supabase.

---

## 1. Environment Variables

### Backend (`backend/.env`)
The following variables must be set on the server:
- `PORT`: Port the server will run on (default `3001`).
- `NODE_ENV`: Set to `production`.
- `ALLOWED_ORIGINS`: Set to `https://kaamdeu.aghealthindustries.com`.
- `JWT_SECRET`: A secure random string for JWT signing.
- `LINKEDIN_CLIENT_ID`: LinkedIn App Client ID.
- `LINKEDIN_CLIENT_SECRET`: LinkedIn App Client Secret.
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_KEY`: Your Supabase **Service Role** Key (keep this private).
- `API_BASE_URL`: The full public URL of your deployed backend.

### Frontend (`frontend/.env`)
The following variables are bundled into the app:
- `EXPO_PUBLIC_API_URL`: Set to `https://kaamdeu.aghealthindustries.com/api` (or your backend subdomain).
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase **Anon** Key.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: Google OAuth Web Client ID.
- `EXPO_PUBLIC_LINKEDIN_CLIENT_ID`: LinkedIn App Client ID.

---

## 2. Deployment Instructions

### Backend Deployment
1. Navigate to the `backend` folder.
2. Run `npm install --production`.
3. Start the server using a process manager like PM2:
   ```bash
   pm2 start src/server.js --name "kaamdeu-backend"
   ```

### Frontend (Web) Deployment
1. Navigate to the `frontend` folder.
2. Install dependencies: `npm install`.
3. Build for web: `npx expo export:web`.
4. The output will be in the `web-build` directory.
5. Host the contents of `web-build` on any static web host (Vercel, Netlify, or Nginx).

---

## 3. Provider Configuration

### Supabase (CRITICAL FOR PRODUCTION)
If the app is redirecting back to `localhost`, you MUST update these two settings in your **Supabase Dashboard**:

1.  **Site URL**: 
    - Go to **Authentication > URL Configuration**.
    - Change **Site URL** to: `https://kaamdeu.aghealthindustries.com`
2.  **Redirect URLs**:
    - In the same screen, add this to the **Redirect URLs** list:
    - `https://kaamdeu.aghealthindustries.com/auth/callback`

> [!IMPORTANT]
> Supabase will only redirect to domains that are explicitly whitelisted in these settings. If these are not updated, it will always fall back to `localhost`.

### Google & LinkedIn Portals
- Ensure your Google and LinkedIn "Authorized Redirect URIs" still point to your Supabase callback:
  `https://cdtgfeuinoqqxagutnlu.supabase.co/auth/v1/callback`
- (You already did this during the local setup, so it should be fine unless you changed projects).
