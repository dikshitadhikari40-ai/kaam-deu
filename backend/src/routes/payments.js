const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client for payment storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase initialized for payments');
} else {
    console.warn('Supabase not configured - payment storage disabled');
}

// ============================================
// ESEWA CONFIGURATION
// ============================================

const ESEWA_CONFIG = {
    merchantId: process.env.ESEWA_MERCHANT_ID || '',
    merchantSecret: process.env.ESEWA_MERCHANT_SECRET || '',
    sandboxVerifyUrl: 'https://uat.esewa.com.np/epay/transrec',
    productionVerifyUrl: 'https://esewa.com.np/epay/transrec',
    isProduction: process.env.ESEWA_PRODUCTION === 'true',
};

if (!ESEWA_CONFIG.merchantId) {
    console.warn('eSewa payment: ESEWA_MERCHANT_ID not configured in .env');
}

const APP_SCHEME = process.env.APP_REDIRECT_SCHEME || 'kaamdeu';

// ============================================
// INPUT VALIDATION HELPERS
// ============================================

const validateRequired = (fields, body) => {
    const missing = [];
    for (const field of fields) {
        if (!body[field]) {
            missing.push(field);
        }
    }
    return missing;
};

const validateUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

const validateAmount = (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000; // Max 10 lakh NPR
};

// ============================================
// DATABASE OPERATIONS
// ============================================

async function createPaymentTransaction(data) {
    if (!supabase) {
        console.warn('Supabase not available - skipping payment storage');
        return null;
    }

    const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .insert({
            id: data.transactionId,
            user_id: data.userId,
            product_id: data.productId,
            amount: data.amount,
            currency: 'NPR',
            payment_method: 'esewa',
            status: 'pending',
            metadata: data.metadata || {},
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create payment transaction:', error);
        return null;
    }
    return transaction;
}

async function updatePaymentStatus(transactionId, status, esewaRefId = null) {
    if (!supabase) {
        console.warn('Supabase not available - skipping payment update');
        return null;
    }

    const updateData = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (esewaRefId) {
        updateData.esewa_ref_id = esewaRefId;
    }

    if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
    }

    const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

    if (error) {
        console.error('Failed to update payment status:', error);
        return null;
    }
    return transaction;
}

async function getPaymentTransaction(transactionId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

    if (error) return null;
    return data;
}

async function getUserPaymentHistory(userId, limit = 20) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data;
}

async function grantUserPurchase(userId, productId, transaction) {
    if (!supabase) return false;

    // Find the product to determine what to grant
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return false;

    try {
        if (product.type === 'subscription') {
            // Grant subscription
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + product.duration_days);

            await supabase.from('user_subscriptions').upsert({
                user_id: userId,
                plan_type: product.id.includes('premium') ? 'premium' : 'pro',
                status: 'active',
                started_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                payment_transaction_id: transaction.id,
            });
        } else if (product.type === 'boost') {
            // Grant boosts
            await supabase.rpc('increment_user_boosts', {
                p_user_id: userId,
                p_count: product.quantity,
            });
        } else if (product.type === 'super_like') {
            // Grant super likes
            await supabase.rpc('increment_user_super_likes', {
                p_user_id: userId,
                p_count: product.quantity,
            });
        }
        return true;
    } catch (error) {
        console.error('Failed to grant purchase:', error);
        return false;
    }
}

// ============================================
// PRODUCT CATALOG
// ============================================

const PRODUCTS = [
    // Subscriptions
    {
        id: 'sub_pro_monthly',
        name: 'Pro Monthly',
        description: 'Unlimited swipes, see who liked you, 5 super likes/day',
        type: 'subscription',
        price: 499,
        currency: 'NPR',
        duration_days: 30,
    },
    {
        id: 'sub_pro_yearly',
        name: 'Pro Yearly',
        description: 'Save 40%! All Pro features for a year',
        type: 'subscription',
        price: 3599,
        currency: 'NPR',
        duration_days: 365,
    },
    {
        id: 'sub_premium_monthly',
        name: 'Premium Monthly',
        description: 'All Pro features + priority matching, profile boost, unlimited super likes',
        type: 'subscription',
        price: 999,
        currency: 'NPR',
        duration_days: 30,
    },
    {
        id: 'sub_premium_yearly',
        name: 'Premium Yearly',
        description: 'Save 50%! All Premium features for a year',
        type: 'subscription',
        price: 5999,
        currency: 'NPR',
        duration_days: 365,
    },
    // One-time purchases
    {
        id: 'boost_1',
        name: '1 Boost',
        description: 'Get seen by 10x more people for 30 minutes',
        type: 'boost',
        price: 99,
        currency: 'NPR',
        quantity: 1,
    },
    {
        id: 'boost_5',
        name: '5 Boosts',
        description: 'Save 20%! 5 profile boosts',
        type: 'boost',
        price: 399,
        currency: 'NPR',
        quantity: 5,
    },
    {
        id: 'super_like_5',
        name: '5 Super Likes',
        description: 'Stand out and show extra interest',
        type: 'super_like',
        price: 149,
        currency: 'NPR',
        quantity: 5,
    },
    {
        id: 'super_like_15',
        name: '15 Super Likes',
        description: 'Save 25%! 15 super likes',
        type: 'super_like',
        price: 349,
        currency: 'NPR',
        quantity: 15,
    },
    {
        id: 'spotlight_1',
        name: 'Spotlight',
        description: 'Be a top profile in your area for 1 hour',
        type: 'spotlight',
        price: 199,
        currency: 'NPR',
        quantity: 1,
    },
];

// ============================================
// ROUTES
// ============================================

/**
 * eSewa Success Callback
 */
router.get('/esewa/success', async (req, res) => {
    try {
        const { oid, amt, refId } = req.query;
        console.log('eSewa success callback:', { oid, amt, refId });

        if (!oid || !amt || !refId) {
            console.error('Missing required parameters');
            return res.redirect(`${APP_SCHEME}://payment/esewa?status=error&error=Missing%20parameters`);
        }

        // Update transaction status
        await updatePaymentStatus(oid, 'success', refId);

        const redirectUrl = `${APP_SCHEME}://payment/esewa?status=success&refId=${refId}&transactionId=${oid}&amount=${amt}`;
        console.log('Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('eSewa success callback error:', error);
        res.redirect(`${APP_SCHEME}://payment/esewa?status=error&error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * eSewa Failure Callback
 */
router.get('/esewa/failure', async (req, res) => {
    try {
        const { oid } = req.query;
        console.log('eSewa failure callback:', { oid });

        // Update transaction status
        if (oid) {
            await updatePaymentStatus(oid, 'failed');
        }

        res.redirect(`${APP_SCHEME}://payment/esewa?status=failed&transactionId=${oid || ''}`);
    } catch (error) {
        console.error('eSewa failure callback error:', error);
        res.redirect(`${APP_SCHEME}://payment/esewa?status=error&error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * Verify eSewa Payment (SECURED)
 */
router.post('/esewa/verify', authMiddleware, async (req, res) => {
    try {
        const { transactionId, esewaRefId, amount, productId } = req.body;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.user.id;

        // Validate input
        const missing = validateRequired(['transactionId', 'esewaRefId', 'amount'], req.body);
        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        if (!validateAmount(amount)) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // SECURITY: Verify transaction belongs to this user
        const existingTransaction = await getPaymentTransaction(transactionId);
        if (existingTransaction && existingTransaction.user_id !== userId) {
            return res.status(403).json({ error: 'Transaction does not belong to this user' });
        }

        console.log('Verifying eSewa payment:', { transactionId, esewaRefId, amount, productId, userId });

        // Call eSewa verification API
        const verifyUrl = ESEWA_CONFIG.isProduction
            ? ESEWA_CONFIG.productionVerifyUrl
            : ESEWA_CONFIG.sandboxVerifyUrl;

        const verifyParams = new URLSearchParams({
            amt: amount.toString(),
            rid: esewaRefId,
            pid: transactionId,
            scd: ESEWA_CONFIG.merchantId,
        });

        const verifyResponse = await fetch(`${verifyUrl}?${verifyParams.toString()}`, {
            method: 'GET',
        });

        const responseText = await verifyResponse.text();
        console.log('eSewa verify response:', responseText);

        if (responseText.includes('<response_code>Success</response_code>')) {
            // Update transaction as completed
            const transaction = await updatePaymentStatus(transactionId, 'completed', esewaRefId);

            // Grant the purchase to user
            if (productId && userId) {
                await grantUserPurchase(userId, productId, transaction);
            }

            res.json({
                success: true,
                message: 'Payment verified successfully',
                transactionId,
                esewaRefId,
            });
        } else {
            await updatePaymentStatus(transactionId, 'verification_failed');
            res.status(400).json({
                success: false,
                error: 'Payment verification failed',
                details: responseText,
            });
        }
    } catch (error) {
        console.error('eSewa verification error:', error);
        res.status(500).json({ error: 'Verification failed', message: error.message });
    }
});

/**
 * Get Payment Status
 */
router.get('/status/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await getPaymentTransaction(transactionId);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({
            transactionId: transaction.id,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currency,
            productId: transaction.product_id,
            createdAt: transaction.created_at,
            completedAt: transaction.completed_at,
        });
    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ error: 'Failed to get payment status' });
    }
});

/**
 * Get User Payment History (SECURED)
 */
router.get('/history/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        if (!validateUUID(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // SECURITY: Users can only view their own payment history
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const transactions = await getUserPaymentHistory(userId);

        res.json({ transactions });
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});

/**
 * Get Products/Pricing
 */
router.get('/products', (req, res) => {
    res.json({ products: PRODUCTS });
});

/**
 * Initiate Payment
 */
router.post('/initiate', async (req, res) => {
    try {
        const { productId, userId, amount } = req.body;

        // Validate input
        const missing = validateRequired(['productId', 'userId', 'amount'], req.body);
        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        if (!validateUUID(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (!validateAmount(amount)) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Verify product exists and amount matches
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        if (product.price !== parseFloat(amount)) {
            return res.status(400).json({ error: 'Amount does not match product price' });
        }

        // Generate transaction ID
        const transactionId = `KD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

        // Store transaction in database
        await createPaymentTransaction({
            transactionId,
            userId,
            productId,
            amount: parseFloat(amount),
            metadata: { productName: product.name },
        });

        // Build eSewa payment URL
        const baseUrl = ESEWA_CONFIG.isProduction
            ? 'https://esewa.com.np/epay/main'
            : 'https://uat.esewa.com.np/epay/main';

        const successUrl = `${process.env.API_BASE_URL || 'https://kaamdeu.aghealthindustries.com/api'}/api/payments/esewa/success`;
        const failureUrl = `${process.env.API_BASE_URL || 'https://kaamdeu.aghealthindustries.com/api'}/api/payments/esewa/failure`;

        const params = new URLSearchParams({
            amt: amount.toString(),
            psc: '0',
            pdc: '0',
            txAmt: '0',
            tAmt: amount.toString(),
            pid: transactionId,
            scd: ESEWA_CONFIG.merchantId,
            su: successUrl,
            fu: failureUrl,
        });

        const paymentUrl = `${baseUrl}?${params.toString()}`;

        res.json({
            success: true,
            transactionId,
            paymentUrl,
            message: 'Payment initiated successfully',
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

module.exports = router;
