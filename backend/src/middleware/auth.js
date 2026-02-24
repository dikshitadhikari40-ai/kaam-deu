const jwt = require('jsonwebtoken');

// SECURITY: Require JWT_SECRET in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set and at least 32 characters in production');
    }
    console.warn('WARNING: Using insecure JWT_SECRET. Set JWT_SECRET env var for production.');
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = { generateToken, verifyToken, authMiddleware, JWT_SECRET };
