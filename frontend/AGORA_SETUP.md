# Agora Video/Voice Calls Setup Guide

This guide explains how to set up Agora for video and voice calls in Kaam Deu.

## Prerequisites

1. An Agora account (sign up at [agora.io](https://www.agora.io/))
2. Agora Console access to create a project

## Step 1: Create Agora Project

1. Go to [Agora Console](https://console.agora.io/)
2. Click **Create a Project**
3. Enter project name: `Kaam Deu`
4. Select **APP ID + Token (recommended)** for authentication
5. Click **Submit**
6. Copy your **App ID** from the project settings

## Step 2: Configure Environment Variables

Add your Agora App ID to the frontend `.env` file:

```env
# Agora Voice/Video Calls
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id_here
```

Your current App ID: `0e89601719e149ff88d6c06e2f4a827d`

## Step 3: Run Database Migration

Run the following SQL in your Supabase SQL Editor:

```bash
# File location: /supabase/agora_calls_setup.sql
```

This creates:
- `active_calls` table for ongoing calls
- `call_history` table for completed calls
- Helper functions for call management
- Real-time subscriptions for call notifications

## Step 4: Token Authentication (Production)

For production, you should use token-based authentication:

### Option A: Temporary Token (Testing)
1. Go to Agora Console > Project Settings
2. Generate a temporary token for testing

### Option B: Token Server (Production)
Set up a token server on your backend:

```javascript
// backend/src/routes/agora.js
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

router.post('/token', authenticateToken, (req, res) => {
    const { channelName, uid } = req.body;
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    const role = RtcRole.PUBLISHER;
    const expireTime = 3600; // 1 hour
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
        appId, appCertificate, channelName, uid, role, privilegeExpireTime
    );

    res.json({ token });
});
```

## Features Implemented

### AgoraService (`src/services/agoraService.ts`)

- **Initialize**: Set up Agora engine with App ID
- **Request Permissions**: Handle camera/microphone permissions
- **Join Channel**: Connect to voice/video call
- **Leave Channel**: Disconnect from call
- **Mute/Unmute**: Toggle microphone
- **Video Toggle**: Enable/disable camera
- **Speaker Toggle**: Switch audio output
- **Camera Switch**: Switch front/back camera

### CallScreen (`src/screens/CallScreen.tsx`)

- **Video Call UI**: Full-screen remote video with picture-in-picture local video
- **Voice Call UI**: Avatar display with audio wave animation
- **Call Controls**: Mute, speaker, video toggle, end call
- **Call States**: Connecting, ringing, connected, ended
- **Duration Timer**: Track call duration

## How Calls Work

### Initiating a Call

1. User taps call button in ChatConversationScreen
2. Navigate to CallScreen with params:
   ```typescript
   navigation.navigate('Call', {
       matchId: match.id,
       matchName: otherUser.name,
       matchImage: otherUser.photo_url,
       matchUserId: otherUser.id,
       callType: 'video', // or 'voice'
   });
   ```
3. CallScreen creates call record in database
4. Joins Agora channel

### Receiving a Call

1. Real-time subscription listens for new calls
2. Show incoming call notification
3. User accepts/declines
4. If accepted, join the same channel

## Database Schema

### active_calls Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| caller_id | uuid | Who initiated the call |
| callee_id | uuid | Who is being called |
| match_id | uuid | Associated match |
| channel_name | text | Agora channel name |
| call_type | text | 'voice' or 'video' |
| status | text | ringing/accepted/connected/ended/missed/declined |
| started_at | timestamp | When call started |
| connected_at | timestamp | When both parties connected |
| ended_at | timestamp | When call ended |
| duration_seconds | integer | Call duration |

## Troubleshooting

### Call Not Connecting

1. Check Agora App ID is correct in .env
2. Verify permissions are granted (camera/microphone)
3. Check network connectivity
4. Look at console logs for `[Agora]` messages

### No Video Showing

1. Ensure camera permissions granted
2. Check if video is enabled (`isVideoEnabled` state)
3. Verify remote user has video enabled

### No Audio

1. Check microphone permissions
2. Verify mute state
3. Check speaker/earpiece selection

### Token Errors

For production with token auth:
1. Verify App Certificate is set
2. Check token hasn't expired
3. Ensure correct channel name and UID

## Testing Calls

1. Open app on two devices (or use web + mobile)
2. Log in as different users
3. Create a match between users
4. Navigate to chat
5. Tap call button

## Agora Console Features

- **Usage Analytics**: Monitor call minutes
- **Quality Insights**: View call quality metrics
- **Recording**: Enable cloud recording (requires additional setup)
- **Moderation**: Content moderation tools

## Cost Estimation

Agora pricing (as of 2024):
- **Voice**: First 10,000 minutes free, then $0.99/1000 min
- **Video**: First 10,000 minutes free, then varies by quality
- **Video (720p)**: ~$3.99/1000 minutes

## Security Best Practices

1. Never expose App Certificate in client code
2. Use token authentication in production
3. Validate channel names server-side
4. Implement call rate limiting
5. Log all call events for auditing

## Next Steps

1. Implement incoming call notifications
2. Add call quality indicators
3. Support group calls (future)
4. Add call recording (requires Agora Cloud Recording)
5. Implement push notifications for calls
