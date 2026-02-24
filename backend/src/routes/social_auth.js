const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// LinkedIn OAuth Configuration
// Get credentials from environment variables only - never hardcode secrets
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

/**
 * Generate a cryptographically secure random password hash placeholder.
 * This is used for social-only accounts that don't have a traditional password.
 * The password is never used for authentication - social login bypasses password checks.
 *
 * SECURITY NOTE: We use a random hash instead of a deterministic one to prevent
 * any possibility of password guessing or rainbow table attacks.
 */
function generateSecurePasswordPlaceholder() {
    // Generate a random 32-byte string and hash it with bcrypt-compatible format
    // This creates a unique, unguessable placeholder for each social account
    const randomBytes = crypto.randomBytes(32).toString('hex');
    // Use a bcrypt-compatible placeholder format that can never be matched
    return `$2a$10$SOCIAL_${crypto.createHash('sha256').update(randomBytes).digest('hex').substring(0, 44)}`;
}

/**
 * Handle Social Login (Google/LinkedIn)
 * Expects: { provider: 'google'|'linkedin', providerId: string, email: string, name: string, photoUrl: string }
 * Returns: { user, token, isNewUser }
 */
router.post('/login', async (req, res) => {
    try {
        const { provider, providerId, email, name, photoUrl } = req.body;

        if (!provider || !providerId || !email) {
            return res.status(400).json({ error: 'Missing required social auth fields' });
        }

        if (!['google', 'linkedin'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        // 1. Check if social account exists
        const existingSocial = prepare('SELECT * FROM social_accounts WHERE provider = ? AND provider_id = ?')
            .get(provider, providerId);

        let userId;
        let isNewUser = false;

        if (existingSocial) {
            // User exists via social login
            userId = existingSocial.user_id;

            // Update email/last login if needed (optional)
            prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);

        } else {
            // Social account doesn't exist. Check if user exists with same email to link
            const existingUser = prepare('SELECT id FROM users WHERE email = ?').get(email);

            if (existingUser) {
                // Link new social account to existing user
                userId = existingUser.id;
            } else {
                // Create New User
                userId = uuidv4();
                isNewUser = true;

                // Create basic user record with a secure random password placeholder
                // Social-only accounts don't use password authentication
                // We generate a unique, cryptographically random placeholder for security
                const dummyHash = generateSecurePasswordPlaceholder();

                // Default role? We might need to ask user for role if it's a new signup.
                // For now, default to 'worker' if not provided, OR return a specific status saying "Role Selection Needed"
                // But the app flow usually selects role first.
                // Let's assume frontend passes 'role' if it's a new signup intent, or we default to 'worker' for now.
                // Ideally, we should have a 'pending' state, but let's stick to 'worker' as default for MVP or check request body.

                const role = req.body.role || 'worker';

                prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
                    .run(userId, email, dummyHash, role);

                // Create profile
                const profileId = uuidv4();
                if (role === 'worker') {
                    prepare(`INSERT INTO worker_profiles (id, user_id, name, verified, images) VALUES (?, ?, ?, ?, ?)`)
                        .run(profileId, userId, name, 1, JSON.stringify(photoUrl ? [photoUrl] : []));
                } else {
                    prepare(`INSERT INTO business_profiles (id, user_id, company_name, verified, logo_url) VALUES (?, ?, ?, ?, ?)`)
                        .run(profileId, userId, name, 1, photoUrl || '');
                }
            }

            // Create Social Account Record
            const socialId = uuidv4();
            prepare('INSERT INTO social_accounts (id, user_id, provider, provider_id, email) VALUES (?, ?, ?, ?, ?)')
                .run(socialId, userId, provider, providerId, email);
        }

        // Fetch final user details
        const user = prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId);

        let profile = null;
        if (user.role === 'worker') {
            profile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(userId);
            if (profile) {
                profile.skills = JSON.parse(profile.skills || '[]');
                profile.images = JSON.parse(profile.images || '[]');
            }
        } else {
            profile = prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(userId);
            if (profile) {
                profile.images = JSON.parse(profile.images || '[]');
            }
        }

        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        res.json({
            user,
            profile,
            token,
            isNewUser
        });

    } catch (error) {
        console.error('Social Login Error:', error);
        res.status(500).json({ error: 'Social login failed' });
    }
});

/**
 * LinkedIn OAuth Callback
 * LinkedIn redirects here after user authorizes
 * For web: Returns HTML that posts message to opener and closes
 * For mobile: Redirects to deep link
 */
router.get('/linkedin/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        console.log('LinkedIn callback received:', {
            code: code ? 'present' : 'missing',
            state: state || 'NO STATE',
            stateType: typeof state,
            error,
            fullQuery: req.query
        });

        // Parse state to determine platform and get redirect info
        let isWeb = false;
        let appRedirect = 'kaamdeu://auth/linkedin';
        let webOrigin = 'https://kaamdeu.aghealthindustries.com';

        // First, try to detect web platform from referer or user-agent
        const referer = req.headers.referer || req.headers.referrer || '';
        const userAgent = req.headers['user-agent'] || '';

        // If request comes from a browser (not a native app), treat as web
        const isBrowserRequest = userAgent.includes('Mozilla') && !userAgent.includes('Expo');

        console.log('LinkedIn callback - headers check:', { referer, isBrowserRequest });

        try {
            if (state) {
                // Try decoding - state may be URL-encoded and/or base64 encoded
                let decodedState = state;

                // First, URL decode if needed
                try {
                    decodedState = decodeURIComponent(state);
                } catch (e) {
                    // Not URL encoded, use as-is
                }

                // Then, try base64 decode
                try {
                    decodedState = Buffer.from(decodedState, 'base64').toString('utf8');
                } catch (e) {
                    // Not base64 encoded, use as-is
                }

                console.log('LinkedIn callback - decoded state:', decodedState);
                const stateData = JSON.parse(decodedState);
                console.log('LinkedIn callback - parsed stateData:', stateData);

                // Handle both old format and new shortened format
                if (stateData.appRedirect) {
                    appRedirect = stateData.appRedirect;
                }
                if (stateData.platform === 'web' || stateData.p === 'web') {
                    isWeb = true;
                }
                if (stateData.webOrigin) {
                    webOrigin = stateData.webOrigin;
                } else if (stateData.o) {
                    webOrigin = stateData.o;
                }
            } else if (isBrowserRequest) {
                // No state but browser request - assume web platform
                console.log('LinkedIn callback - No state but browser detected, assuming web');
                isWeb = true;
            }
        } catch (e) {
            console.log('Could not parse state, checking if browser request. Error:', e.message);
            if (isBrowserRequest) {
                isWeb = true;
            }
        }

        console.log('LinkedIn callback - appRedirect:', appRedirect, 'isWeb:', isWeb, 'webOrigin:', webOrigin);

        // Build the result object
        const result = error
            ? { error: error_description || error }
            : code
                ? { code }
                : { error: 'No authorization code received' };

        // For web platform, return HTML that posts message to opener
        if (isWeb) {
            const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LinkedIn Authentication</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #0a1628;
            color: white;
        }
        .message {
            text-align: center;
            padding: 40px;
        }
        .spinner {
            border: 3px solid #333;
            border-top: 3px solid #4a90d9;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="message">
        <div class="spinner"></div>
        <p>${result.error ? 'Authentication failed' : 'Authentication successful!'}</p>
        <p style="color: #888; font-size: 14px;">This window will close automatically...</p>
    </div>
    <script>
        (function() {
            const result = ${JSON.stringify(result)};
            const targetOrigin = '${webOrigin}';

            // Try to communicate with opener
            if (window.opener) {
                try {
                    window.opener.postMessage({ type: 'linkedin-oauth-callback', ...result }, targetOrigin);
                    console.log('Posted message to opener');
                } catch (e) {
                    console.error('Failed to post message:', e);
                }
            }

            // Store result in localStorage as fallback
            try {
                localStorage.setItem('linkedin-oauth-result', JSON.stringify(result));
            } catch (e) {
                console.error('Failed to store result:', e);
            }

            // Close window after a short delay
            setTimeout(function() {
                window.close();
                // If window.close doesn't work (COOP), show manual close message
                setTimeout(function() {
                    document.querySelector('.message p').textContent =
                        result.error ? 'Authentication failed. You can close this window.' :
                        'Authentication successful! You can close this window.';
                    document.querySelector('.spinner').style.display = 'none';
                }, 500);
            }, 1000);
        })();
    </script>
</body>
</html>`;

            // Set headers to allow popup communication
            res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        }

        // For mobile, redirect to deep link
        if (result.error) {
            return res.redirect(`${appRedirect}?error=${encodeURIComponent(result.error)}`);
        }
        res.redirect(`${appRedirect}?code=${code}`);

    } catch (error) {
        console.error('LinkedIn callback error:', error);
        res.redirect('kaamdeu://auth/linkedin?error=Callback%20processing%20failed');
    }
});

/**
 * LinkedIn Token Exchange
 * Frontend calls this with the authorization code to get user info
 */
router.post('/linkedin/token', async (req, res) => {
    try {
        const { code, redirectUri } = req.body;

        console.log('LinkedIn token exchange:', { code: code ? 'present' : 'missing', redirectUri });

        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }

        if (!LINKEDIN_CLIENT_SECRET) {
            console.error('LinkedIn client secret not configured');
            return res.status(500).json({ error: 'LinkedIn OAuth not configured on server' });
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: LINKEDIN_CLIENT_ID,
                client_secret: LINKEDIN_CLIENT_SECRET,
            }).toString(),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('LinkedIn token error:', errorData);
            return res.status(400).json({ error: 'Failed to exchange authorization code', details: errorData });
        }

        const tokenData = await tokenResponse.json();
        console.log('LinkedIn token received');

        // Get user profile using the access token
        // LinkedIn API v2 - use userinfo endpoint for OpenID Connect
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userInfoResponse.ok) {
            const errorData = await userInfoResponse.text();
            console.error('LinkedIn userinfo error:', errorData);
            return res.status(400).json({ error: 'Failed to get user info', details: errorData });
        }

        const userInfo = await userInfoResponse.json();
        console.log('LinkedIn user info:', userInfo);

        // Extract user data from OpenID Connect response
        const user = {
            id: userInfo.sub, // LinkedIn user ID
            email: userInfo.email,
            name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
            picture: userInfo.picture,
        };

        res.json({ user });

    } catch (error) {
        console.error('LinkedIn token exchange error:', error);
        res.status(500).json({ error: 'Token exchange failed', message: error.message });
    }
});

/**
 * Get LinkedIn OAuth URL
 * Returns the URL to redirect user to for LinkedIn authorization
 */
router.get('/linkedin/auth-url', (req, res) => {
    const { redirectUri, state } = req.query;

    if (!redirectUri) {
        return res.status(400).json({ error: 'redirectUri is required' });
    }

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${LINKEDIN_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `state=${state || ''}`;

    res.json({ authUrl });
});

module.exports = router;
