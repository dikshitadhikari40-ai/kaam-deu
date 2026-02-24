# Kaam Deu Monorepo

This repository contains the full source code for the **Kaam Deu** project, structured as a monorepo.

## Project Structure

- **frontend/**: Expo/React Native mobile application.
- **backend/**: Node.js/Express backend server.
- **supabase/**: Database schema and migrations.
- **docs/**: Project documentation.

## Prerequisites

- Node.js (Homebrew or NVM recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

## Setup

1.  **Install Dependencies**
    Run this at the root to install dependencies for all workspaces:
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Set up the frontend environment variables:
    ```bash
    cp frontend/.env.example frontend/.env
    ```
    Then edit `frontend/.env` with your actual Supabase and OAuth credentials.

3.  **Supabase Setup**
    The schema is located in `supabase/schema.sql`. You can run this in your Supabase SQL editor to set up the database.

## Development

You can run commands from the root directory:

### Frontend
Start the Expo development server:
```bash
npm run dev:frontend
```
*Runs on http://localhost:8081*

### Backend
Start the Node.js backend server:
```bash
npm run dev:backend
```
*Runs on http://localhost:3000*

### Code Quality
Run type checking (TypeScript) for the frontend:
```bash
npm run check:frontend
```
Run checks for the backend:
```bash
npm run check:backend
```
Run linting across the monorepo:
```bash
npm run lint
```
