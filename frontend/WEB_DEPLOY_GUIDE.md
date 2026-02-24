# Kaam Deu - Web Deployment Guide

This guide outlines how to host the web version of the Kaam Deu application.

## Prerequisites
- The production build has been generated in the `frontend/dist` directory using `npx expo export -p web`.
- Environment variables are correctly configured in `.env.production`.

---

## Option 1: Vercel (Recommended)
Vercel provides seamless hosting for React/Expo applications. A `vercel.json` is already configured in the project.

### Via Vercel CLI
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` from the `frontend` directory.
3. Follow the prompts (select `dist` as the output directory if asked).

### Via GitHub (Continuous Deployment)
1. Push the project to a GitHub repository.
2. Connect the repository to Vercel at [vercel.com](https://vercel.com).
3. Set the **Build Command** to `npx expo export -p web`.
4. Set the **Output Directory** to `dist`.
5. Add all keys from `.env.production` to **Environment Variables** in the Vercel dashboard.

---

## Option 2: Netlify
Netlify is another excellent option for static site hosting.

### Via Netlify CLI
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run `netlify deploy --dir=dist/web` (after build).

### Via GitHub
1. Connect GitHub repo to Netlify.
2. Set **Build command**: `npx expo export -p web`
3. Set **Publish directory**: `dist`
4. Configure environment variables in Netlify UI.

---

## Option 3: Manual Hosting (Any Static Host)
You can serve the contents of the `frontend/dist` folder using any static web server (Nginx, Apache, S3, etc.).

1. Copy the contents of `frontend/dist` to your server's web root.
2. Ensure the server is configured to handle client-side routing (redirecting all non-file requests to `index.html`).

---

## Deployment Checklist
- [ ] Verify `EXPO_PUBLIC_API_URL` points to your live backend.
- [ ] Verify Supabase URL and Keys are correct.
- [ ] Ensure `dist` folder contains `index.html` and assets.
