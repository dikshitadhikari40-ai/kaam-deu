# Kaam Deu Hosting & Deployment Guide

This guide covers how to deploy the **Kaam Deu** application for Web, Android, and iOS.

## 1. Web Deployment (Vercel / Netlify)
The easiest way to host the web version is using **Vercel** or **Netlify**.

### Prerequisites
-   Ensure you have a Vercel/Netlify account.
-   Ensure your project is pushed to a GitHub repository.

### Steps
1.  **Build the Web Bundle**:
    Open your terminal in the project directory and run:
    ```bash
    npx expo export -p web
    ```
    This creates a `dist` folder containing your static website.

2.  **Deploy to Vercel**:
    -   Install Vercel CLI: `npm i -g vercel`
    -   Run: `vercel`
    -   Follow the prompts. Set the "Output Directory" to `dist`.

3.  **Environment Variables**:
    -   Add your Supabase keys and Google Client IDs to the Vercel Project Settings > Environment Variables.
    -   `EXPO_PUBLIC_SUPABASE_URL`
    -   `EXPO_PUBLIC_SUPABASE_ANON_KEY`
    -   (And others from your .env)

## 2. Mobile Deployment (EAS / Stores)
To publish to the Google Play Store or Apple App Store, use **EAS Build**.

### Prerequisites
-   Install EAS CLI: `npm install -g eas-cli`
-   Login: `eas login`
-   Configure Project: `eas build:configure`

### Steps
1.  **Build for Android**:
    ```bash
    eas build --platform android --profile production
    ```
    This generates an `.aab` file for the Play Store or `.apk` for testing.

2.  **Build for iOS**:
    ```bash
    eas build --platform ios --profile production
    ```
    *(Requires Apple Developer Account)*.

## 3. Backend (Supabase)
Your backend is managed by **Supabase**.
-   Ensure your `profiles` table and triggers are synchronized (we updated them with `fix_auth_v2.sql`).
-   In Supabase Dashboard > Authentication > URL Configuration:
    -   Add your production website URL (e.g., `https://your-app.vercel.app`) to "Site URL" and "Redirect URLs".

## 4. Troubleshooting Web Launch
If you see a blank screen on Vercel:
-   Check the Console (F12) for errors.
-   Ensure `dist` folder was uploaded correctly.
-   Verify `react-native-reanimated` isn't causing issues (we added the babel plugin).

---
**Need Help?**
Contact the development team or check `HANDOFF_DEPLOYMENT.md` for more details.
