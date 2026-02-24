require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ============================================
// ENVIRONMENT VALIDATION (Beta/Production)
// ============================================
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file');
    // Don't exit in development, just warn
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const swipeRoutes = require('./routes/swipes');
const messageRoutes = require('./routes/messages');
const socialAuthRoutes = require('./routes/social_auth');
const paymentRoutes = require('./routes/payments');
const jobRoutes = require('./routes/jobs');
const reviewRoutes = require('./routes/reviews');
const reportRoutes = require('./routes/reports');
const blockRoutes = require('./routes/blocks');
const streakRoutes = require('./routes/streaks');

// Import database
const { initializeDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'];

app.use(cors({
    origin: isProduction
        ? allowedOrigins
        : true, // Allow all in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting - General API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting - Auth routes (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 auth requests per 15 minutes
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting - Payment routes (very strict)
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 payment requests per hour
    message: { error: 'Too many payment requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiting
app.use(generalLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        console.log(`[${level}] ${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'kaamdeu-api',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});

// ============================================
// API ROUTES
// ============================================

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, socialAuthRoutes);

// Profile routes
app.use('/api/profiles', profileRoutes);

// Swipe and matching routes
app.use('/api/swipes', swipeRoutes);

// Messaging routes
app.use('/api/messages', messageRoutes);

// Social auth routes
app.use('/api/social', socialAuthRoutes);

// Payment routes with strict rate limiting
app.use('/api/payments', paymentLimiter, paymentRoutes);

// Job board routes
app.use('/api/jobs', jobRoutes);

// Review system
app.use('/api/reviews', reviewRoutes);

// Report system
app.use('/api/reports', reportRoutes);

// Block system
app.use('/api/blocks', blockRoutes);

// Login streaks
app.use('/api/streaks', streakRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', {
        error: err.message,
        stack: isProduction ? undefined : err.stack,
        path: req.path,
        method: req.method,
    });

    // Don't leak error details in production
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: isProduction ? 'Internal server error' : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        console.log('Database initialized successfully');

        app.listen(PORT, HOST, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Kaam Deu API Server                                  ║
║                                                           ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║   Running on: ${HOST}:${PORT}                                 ║
║   Health check: http://${HOST}:${PORT}/health                 ║
║                                                           ║
║   Security:                                               ║
║   ✓ Helmet security headers enabled                       ║
║   ✓ CORS configured                                       ║
║   ✓ Rate limiting enabled                                 ║
║   ✓ Request logging enabled                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

startServer();

module.exports = app;
