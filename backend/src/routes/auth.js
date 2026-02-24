const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, role, profile } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        if (!['worker', 'business'].includes(role)) {
            return res.status(400).json({ error: 'Role must be worker or business' });
        }

        // Check if user exists
        const existingUser = prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const userId = uuidv4();
        const passwordHash = bcrypt.hashSync(password, 10);

        // Insert user
        prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
            .run(userId, email, passwordHash, role);

        // Create profile based on role
        const profileId = uuidv4();

        if (role === 'worker') {
            prepare(`
                INSERT INTO worker_profiles (id, user_id, name, phone, location, bio, job_title, experience_years, expected_salary_npr, skills, images)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                profileId,
                userId,
                profile?.name || 'New Worker',
                profile?.phone || '',
                profile?.location || '',
                profile?.bio || '',
                profile?.job_title || '',
                profile?.experience_years || 0,
                profile?.expected_salary_npr || 0,
                JSON.stringify(profile?.skills || []),
                JSON.stringify(profile?.images || [])
            );
        } else {
            prepare(`
                INSERT INTO business_profiles (id, user_id, company_name, contact_person, phone, location, description, industry, company_size, logo_url, images)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                profileId,
                userId,
                profile?.company_name || 'New Business',
                profile?.contact_person || '',
                profile?.phone || '',
                profile?.location || '',
                profile?.description || '',
                profile?.industry || '',
                profile?.company_size || '',
                profile?.logo_url || '',
                JSON.stringify(profile?.images || [])
            );
        }

        const token = generateToken({ id: userId, email, role });

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: userId, email, role },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        // Get profile
        let profile = null;
        if (user.role === 'worker') {
            profile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(user.id);
            if (profile) {
                profile.skills = JSON.parse(profile.skills || '[]');
                profile.images = JSON.parse(profile.images || '[]');
            }
        } else {
            profile = prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(user.id);
            if (profile) {
                profile.images = JSON.parse(profile.images || '[]');
            }
        }

        res.json({
            user: { id: user.id, email: user.email, role: user.role },
            profile,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// LinkedIn OAuth callback - redirects to app with the code
router.get('/linkedin/callback', async (req, res) => {
    const { code, state, error } = req.query;

    // Parse state to get the app redirect URI and platform info
    let appRedirect = 'kaamdeu://auth/linkedin';
    let isWeb = false;
    let webOrigin = null;

    if (state) {
        try {
            const stateData = JSON.parse(decodeURIComponent(state));
            if (stateData.appRedirect) {
                appRedirect = stateData.appRedirect;
            }
            if (stateData.isWeb) {
                isWeb = true;
                webOrigin = stateData.webOrigin;
            }
        } catch (e) {
            console.log('Could not parse state, using default redirect');
        }
    }

    console.log('LinkedIn callback - appRedirect:', appRedirect, 'isWeb:', isWeb, 'webOrigin:', webOrigin);

    if (error) {
        if (isWeb && webOrigin) {
            // For web, redirect back to the app with error in URL
            return res.redirect(`${webOrigin}?linkedin_error=${encodeURIComponent(error)}`);
        }
        // For native, use custom scheme
        const separator = appRedirect.includes('?') ? '&' : '?';
        return res.redirect(`${appRedirect}${separator}error=${encodeURIComponent(error)}`);
    }

    if (code) {
        // For web platform, exchange the code for user info and redirect with session token
        if (isWeb && webOrigin) {
            try {
                const clientId = process.env.LINKEDIN_CLIENT_ID;
                const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
                const redirectUri = `${process.env.API_BASE_URL}/api/auth/linkedin/callback`;

                console.log('LinkedIn token exchange - using redirectUri:', redirectUri);
                console.log('LinkedIn token exchange - API_BASE_URL:', process.env.API_BASE_URL);
                console.log('LinkedIn token exchange - code (first 20 chars):', code.substring(0, 20));

                // Exchange code for access token
                const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectUri,
                        client_id: clientId,
                        client_secret: clientSecret,
                    }),
                });

                if (!tokenResponse.ok) {
                    const errorData = await tokenResponse.text();
                    console.error('LinkedIn token error:', errorData);
                    return res.redirect(`${webOrigin}?linkedin_error=${encodeURIComponent('Failed to exchange token')}`);
                }

                const tokenData = await tokenResponse.json();
                const accessToken = tokenData.access_token;

                // Fetch user profile
                const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });

                if (!userInfoResponse.ok) {
                    return res.redirect(`${webOrigin}?linkedin_error=${encodeURIComponent('Failed to fetch profile')}`);
                }

                const userInfo = await userInfoResponse.json();
                console.log('LinkedIn user info for web:', JSON.stringify(userInfo));

                // Redirect back to web app with user info encoded in URL
                const userData = encodeURIComponent(JSON.stringify({
                    id: userInfo.sub,
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                }));
                return res.redirect(`${webOrigin}?linkedin_user=${userData}`);
            } catch (err) {
                console.error('LinkedIn web callback error:', err);
                return res.redirect(`${webOrigin}?linkedin_error=${encodeURIComponent('Authentication failed')}`);
            }
        }

        // For native, redirect to app with the authorization code
        const separator = appRedirect.includes('?') ? '&' : '?';
        const redirectUrl = `${appRedirect}${separator}code=${encodeURIComponent(code)}`;
        console.log('Redirecting to app:', redirectUrl);
        return res.redirect(redirectUrl);
    }

    res.status(400).send('Missing authorization code');
});

// LinkedIn OAuth token exchange
router.post('/linkedin/token', async (req, res) => {
    try {
        const { code, redirectUri } = req.body;
        console.log('LinkedIn token exchange - code:', code?.substring(0, 20) + '...', 'redirectUri:', redirectUri);

        if (!code || !redirectUri) {
            return res.status(400).json({ error: 'Code and redirectUri are required' });
        }

        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        console.log('LinkedIn credentials - clientId:', clientId, 'hasSecret:', !!clientSecret);

        if (!clientId || !clientSecret) {
            return res.status(500).json({ error: 'LinkedIn OAuth not configured' });
        }

        // Exchange code for access token
        console.log('Exchanging code for token with LinkedIn...');
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('LinkedIn token error:', errorData);
            return res.status(401).json({ error: 'Failed to exchange code for token', details: errorData });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        console.log('Got LinkedIn access token, fetching user info...');

        // Fetch user profile using OpenID userinfo endpoint
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            console.error('LinkedIn userinfo error:', errorText);
            return res.status(401).json({ error: 'Failed to fetch LinkedIn profile', details: errorText });
        }

        const userInfo = await userInfoResponse.json();
        console.log('LinkedIn user info received:', JSON.stringify(userInfo));

        res.json({
            user: {
                id: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
            },
        });
    } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        res.status(500).json({ error: 'LinkedIn authentication failed' });
    }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
    try {
        const user = prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get profile
        let profile = null;
        if (user.role === 'worker') {
            profile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(user.id);
            if (profile) {
                profile.skills = JSON.parse(profile.skills || '[]');
                profile.images = JSON.parse(profile.images || '[]');
            }
        } else {
            profile = prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(user.id);
            if (profile) {
                profile.images = JSON.parse(profile.images || '[]');
            }
        }

        res.json({ user, profile });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

module.exports = router;
