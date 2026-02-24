# Kaam Deu Backend API

Backend API server for the Kaam Deu matching app connecting workers with businesses in Nepal.

## Quick Start (Local Development)

```bash
cd backend
npm install
npm run db:init  # Initialize database with seed data
npm start        # Start server on port 3001
```

## Deploy to Server

### 1. Copy to Server
```bash
scp -r ./backend kshitiz@kshitiz:~/apps/kamdeo/
```

### 2. SSH and Deploy
```bash
ssh kshitiz@kshitiz
cd ~/apps/kamdeo/backend

# Build and run with Docker
docker build -t kd-app .
docker run -d --name kd-app -p 3001:3001 -v kaamdeu-data:/app/data kd-app
```

### 3. Verify
```bash
# Check container is running
docker ps

# Check logs
docker logs kd-app

# Test health endpoint
curl https://kd.aghealthindustries.com/health
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Profiles
- `GET /api/profiles/feed` - Get profiles to swipe (requires auth)
- `PUT /api/profiles/worker` - Update worker profile (requires auth)
- `PUT /api/profiles/business` - Update business profile (requires auth)
- `GET /api/profiles/:userId` - Get specific profile (requires auth)

### Swipes & Matches
- `POST /api/swipes` - Record a swipe (requires auth)
- `GET /api/swipes/matches` - Get all matches (requires auth)

### Messages
- `GET /api/messages/:matchId` - Get messages for a match (requires auth)
- `POST /api/messages/:matchId` - Send a message (requires auth)

### Health
- `GET /health` - Health check

## Demo Accounts

### Workers
| Email | Password | Role |
|-------|----------|------|
| ram.thapa@email.com | password123 | Construction Worker |
| sita.gurung@email.com | password123 | Housekeeper |
| bikash.rai@email.com | password123 | Electrician |
| maya.tamang@email.com | password123 | Tailor |
| krishna.shah@email.com | password123 | Driver |

### Businesses
| Email | Password | Company |
|-------|----------|---------|
| hr@everestconstruction.com | password123 | Everest Construction |
| jobs@himalayahotel.com | password123 | Himalaya Hotel |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| DB_PATH | /app/data/kaamdeu.db | SQLite database path |
| JWT_SECRET | kaamdeu-secret-... | JWT signing secret |

## Useful Commands

```bash
# Rebuild after code changes
docker stop kd-app && docker rm kd-app
docker build -t kd-app . && docker run -d --name kd-app -p 3001:3001 -v kaamdeu-data:/app/data kd-app

# View logs
docker logs kd-app -f

# Quick restart (no rebuild)
docker restart kd-app

# Access database (if needed)
docker exec -it kd-app sh
```

## Production URL
https://kd.aghealthindustries.com
