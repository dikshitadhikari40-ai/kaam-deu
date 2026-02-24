# Kaam Deu - Deployment Handoff

## Current Status: Production Ready & Multi-Platform Authenticator Configured

### What's Done

1. **Complete Backend API** (in `backend/` folder):
   - Express.js server with SQLite (sql.js - pure JavaScript, no native deps)
   - JWT authentication (register, login, /me endpoints)
   - Profile routes (feed, update)
   - Swipe routes (record swipes, detect matches)
   - Message routes (get/send messages)
   - Dockerfile and docker-compose.yml ready
   - Seeded with 5 Nepali workers + 2 businesses

2. **React Native Updates**:
   - `src/services/api.ts` - API client pointing to localhost (dev) or kd.aghealthindustries.com (prod)
   - `src/context/AuthContext.tsx` - Real auth with AsyncStorage persistence
   - `src/screens/LoginScreen.tsx` - Email/password form with demo login buttons
   - `src/screens/FeedScreen.tsx` - Loads profiles from API
   - `src/components/SwipeCard.tsx` - Shows NPR salary, experience years

3. **Backend Tested Locally**:
   ```bash
   cd backend && npm start
   # Health check: http://localhost:3001/health
   # Login test: curl -X POST http://localhost:3001/api/auth/login \
   #   -H "Content-Type: application/json" \
   #   -d '{"email":"ram.thapa@email.com","password":"password123"}'
   ```

### What's Needed: Deploy to Server

**Target Server:**
- Hostname: `kshitiz` (via Tailscale)
- User: `kshitiz`
- Path: `~/apps/kamdeo/`
- Port: 3001
- Production URL: https://kd.aghealthindustries.com (Cloudflare Tunnel configured)

**Tailscale Issue:**
- Tailscale installed on Mac but CLI hangs/doesn't connect properly
- Need to either:
  1. Get Tailscale working (check menu bar icon, login via browser)
  2. Or use server's direct Tailscale IP (100.x.x.x) from admin console

### Deployment Steps (Once Tailscale Works)

```bash
# 1. SSH into server
ssh kshitiz@kshitiz

# 2. Create app directory
mkdir -p ~/apps/kamdeo

# 3. Exit SSH, copy files from Mac
scp -r ./backend kshitiz@kshitiz:~/apps/kamdeo/

# 4. SSH back in and deploy
ssh kshitiz@kshitiz
cd ~/apps/kamdeo/backend
docker-compose up -d --build

# 5. Verify
curl http://localhost:3001/health
```

### Demo Accounts (Seeded)

**Workers:**
- ram.thapa@email.com / password123
- sita.gurung@email.com / password123
- bikash.rai@email.com / password123
- maya.tamang@email.com / password123
- krishna.shah@email.com / password123

**Businesses:**
- hr@everestconstruction.com / password123
- jobs@himalayahotel.com / password123

### Files Structure

```
backend/
├── src/
│   ├── index.js          # Express server entry
│   ├── db/
│   │   ├── database.js   # sql.js wrapper
│   │   ├── init.js       # DB init + seeding
│   │   └── schema.sql    # Table definitions
│   ├── middleware/
│   │   └── auth.js       # JWT middleware
│   └── routes/
│       ├── auth.js       # /api/auth/*
│       ├── profiles.js   # /api/profiles/*
│       ├── swipes.js     # /api/swipes/*
│       └── messages.js   # /api/messages/*
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, get JWT |
| GET | /api/auth/me | Yes | Get current user + profile |
| GET | /api/profiles/feed | Yes | Get profiles to swipe |
| PUT | /api/profiles/me | Yes | Update own profile |
| POST | /api/swipes | Yes | Record a swipe |
| GET | /api/swipes/matches | Yes | Get matches |
| GET | /api/messages/:matchId | Yes | Get messages |
| POST | /api/messages/:matchId | Yes | Send message |

---

## Prompt for New Chat

Copy this to start a new conversation:

```
I'm continuing work on the Kaam Deu matching app. The backend is complete and tested locally, but I need help deploying it to my server.

**Situation:**
- Backend is in `/Users/dikshitadhikari/Downloads/matching-app-expo-ts/backend/`
- Server accessible via Tailscale hostname `kshitiz` (user: kshitiz)
- Target path: ~/apps/kamdeo/
- Production URL will be: https://kd.aghealthindustries.com (Cloudflare Tunnel ready)

**Problem:**
Tailscale on my Mac isn't connecting properly. The menu bar app is installed but the CLI commands hang.

**Please help me:**
1. Get Tailscale working (or find my server's direct IP)
2. SSH into the server
3. Copy the backend files
4. Run `docker-compose up -d --build`
5. Verify at https://kd.aghealthindustries.com/health

Read HANDOFF_DEPLOYMENT.md in the project for full context.
```
