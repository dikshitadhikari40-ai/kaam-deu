import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// ============================================
// ESEWA PAYMENT CONFIGURATION
// ============================================

const config = Constants.expoConfig?.extra || {};

// ============================================
// ESEWA CONFIGURATION
// ============================================
// For sandbox/testing: Use EPAYTEST credentials
// For production: Use real credentials from eSewa merchant dashboard
//
// TODO: Replace EPAYTEST with real merchant ID from eSewa for production
const ESEWA_CONFIG = {
  // Sandbox URL for testing
  sandboxUrl: 'https://uat.esewa.com.np/epay/main',
  // Production URL
  productionUrl: 'https://esewa.com.np/epay/main',
  // Verification URLs
  sandboxVerifyUrl: 'https://uat.esewa.com.np/epay/transrec',
  productionVerifyUrl: 'https://esewa.com.np/epay/transrec',
  // Merchant credentials from environment config
  // IMPORTANT: Must be set in .env
  // - For sandbox: ESEWA_MERCHANT_ID=EPAYTEST
  // - For production: Use real merchant ID from eSewa dashboard
  merchantId: config.esewaMerchantId || '',
  merchantSecret: config.esewaMerchantSecret || '',
  // Environment flag - controls which URLs and credentials are used
  // Set ESEWA_PRODUCTION=true in .env for production
  isProduction: config.esewaProduction === 'true' || config.esewaProduction === true,
};

// Backend API URL - single source of truth from config
// This URL is used for payment callbacks and must be publicly accessible
const API_BASE_URL = config.apiBaseUrl || config.publicBaseUrl || 'https://kaamdeu.aghealthindustries.com';

// App deep link for payment callback
const APP_SCHEME = 'kaamdeu';

// ============================================
// TYPES
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type ProductType = 'subscription' | 'boost' | 'super_like' | 'spotlight';

export interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  price: number; // in NPR
  currency: 'NPR';
  duration_days?: number; // for subscriptions
  quantity?: number; // for consumables like super likes
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  product_id: string;
  product_type: ProductType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: 'esewa' | 'khalti' | 'card';
  transaction_id?: string; // eSewa reference ID
  esewa_ref_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  auto_renew: boolean;
  payment_transaction_id?: string;
}

export interface UserCredits {
  user_id: string;
  super_likes: number;
  boosts: number;
  spotlights: number;
}

// ============================================
// PRODUCT CATALOG
// ============================================

export const PRODUCTS: Product[] = [
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
// ESEWA PAYMENT SERVICE
// ============================================

export const esewaPaymentService = {
  /**
   * Generate a unique transaction ID
   */
  generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `KD-${timestamp}-${randomStr}`.toUpperCase();
  },

  /**
   * Get eSewa payment URL
   */
  getEsewaUrl(): string {
    return ESEWA_CONFIG.isProduction
      ? ESEWA_CONFIG.productionUrl
      : ESEWA_CONFIG.sandboxUrl;
  },

  /**
   * Get eSewa verification URL
   */
  getVerifyUrl(): string {
    return ESEWA_CONFIG.isProduction
      ? ESEWA_CONFIG.productionVerifyUrl
      : ESEWA_CONFIG.sandboxVerifyUrl;
  },

  /**
   * Initiate eSewa payment
   * Opens eSewa payment page in browser
   */
  async initiatePayment(
    product: Product,
    userId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const transactionId = this.generateTransactionId();

      // Create pending transaction in database
      const { data: transaction, error: dbError } = await supabase
        .from('payment_transactions')
        .insert({
          id: transactionId,
          user_id: userId,
          product_id: product.id,
          product_type: product.type,
          amount: product.price,
          currency: product.currency,
          status: 'pending',
          payment_method: 'esewa',
          metadata: {
            product_name: product.name,
            quantity: product.quantity,
            duration_days: product.duration_days,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to create transaction:', dbError);
        return { success: false, error: 'Failed to create transaction' };
      }

      // Build eSewa payment URL with parameters
      const successUrl = `${API_BASE_URL}/api/payments/esewa/success`;
      const failureUrl = `${API_BASE_URL}/api/payments/esewa/failure`;

      // eSewa requires these parameters
      const params = new URLSearchParams({
        amt: product.price.toString(), // Amount
        psc: '0', // Service charge
        pdc: '0', // Delivery charge
        txAmt: '0', // Tax amount
        tAmt: product.price.toString(), // Total amount
        pid: transactionId, // Product/Transaction ID
        scd: ESEWA_CONFIG.merchantId, // Merchant code
        su: successUrl, // Success URL
        fu: failureUrl, // Failure URL
      });

      const paymentUrl = `${this.getEsewaUrl()}?${params.toString()}`;

      console.log('Opening eSewa payment URL:', paymentUrl);

      // Open eSewa in browser
      const result = await WebBrowser.openAuthSessionAsync(
        paymentUrl,
        `${APP_SCHEME}://payment/esewa`
      );

      console.log('eSewa browser result:', result);

      if (result.type === 'success' && result.url) {
        // Parse the callback URL for payment status
        const url = new URL(result.url);
        const refId = url.searchParams.get('refId');
        const status = url.searchParams.get('status');

        if (status === 'success' && refId) {
          // Verify and complete the payment
          return await this.verifyAndCompletePayment(transactionId, refId, product, userId);
        } else {
          // Payment failed or cancelled
          await this.updateTransactionStatus(transactionId, 'failed');
          return { success: false, error: 'Payment was not completed' };
        }
      }

      // User cancelled or dismissed
      await this.updateTransactionStatus(transactionId, 'failed');
      return { success: false, error: 'Payment cancelled' };
    } catch (error: any) {
      console.error('eSewa payment error:', error);
      return { success: false, error: error.message || 'Payment failed' };
    }
  },

  /**
   * Verify payment with eSewa and complete transaction
   */
  async verifyAndCompletePayment(
    transactionId: string,
    esewaRefId: string,
    product: Product,
    userId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Verify with backend (which calls eSewa verification API)
      const verifyResponse = await fetch(`${API_BASE_URL}/api/payments/esewa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          esewaRefId,
          amount: product.price,
          productId: product.id,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        console.error('Payment verification failed:', errorData);
        await this.updateTransactionStatus(transactionId, 'failed');
        return { success: false, error: errorData.error || 'Payment verification failed' };
      }

      // Update transaction as completed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          esewa_ref_id: esewaRefId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      // Fulfill the purchase
      await this.fulfillPurchase(product, userId, transactionId);

      return { success: true, transactionId };
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return { success: false, error: error.message || 'Verification failed' };
    }
  },

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus
  ): Promise<void> {
    await supabase
      .from('payment_transactions')
      .update({ status })
      .eq('id', transactionId);
  },

  /**
   * Fulfill the purchase (add subscription, credits, etc.)
   */
  async fulfillPurchase(
    product: Product,
    userId: string,
    transactionId: string
  ): Promise<void> {
    switch (product.type) {
      case 'subscription':
        await this.activateSubscription(product, userId, transactionId);
        break;
      case 'boost':
        await this.addCredits(userId, 'boosts', product.quantity || 1);
        break;
      case 'super_like':
        await this.addCredits(userId, 'super_likes', product.quantity || 1);
        break;
      case 'spotlight':
        await this.addCredits(userId, 'spotlights', product.quantity || 1);
        break;
    }
  },

  /**
   * Activate subscription for user
   */
  async activateSubscription(
    product: Product,
    userId: string,
    transactionId: string
  ): Promise<void> {
    const tier: SubscriptionTier = product.id.includes('premium') ? 'premium' : 'pro';
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (product.duration_days || 30) * 24 * 60 * 60 * 1000);

    // Deactivate any existing subscription
    await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Create new subscription
    await supabase.from('subscriptions').insert({
      user_id: userId,
      tier,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true,
      auto_renew: false,
      payment_transaction_id: transactionId,
    });

    // Update user profile with subscription tier
    await supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', userId);
  },

  /**
   * Add credits to user account
   */
  async addCredits(
    userId: string,
    creditType: 'super_likes' | 'boosts' | 'spotlights',
    amount: number
  ): Promise<void> {
    // Get current credits
    const { data: existing } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing credits
      await supabase
        .from('user_credits')
        .update({ [creditType]: (existing[creditType] || 0) + amount })
        .eq('user_id', userId);
    } else {
      // Create new credits record
      await supabase.from('user_credits').insert({
        user_id: userId,
        super_likes: creditType === 'super_likes' ? amount : 0,
        boosts: creditType === 'boosts' ? amount : 0,
        spotlights: creditType === 'spotlights' ? amount : 0,
      });
    }
  },
};

// ============================================
// SUBSCRIPTION SERVICE
// ============================================

export const subscriptionService = {
  /**
   * Get current user subscription
   */
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Subscription expired, deactivate it
      await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('id', data.id);

      await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', userId);

      return null;
    }

    return data;
  },

  /**
   * Get user's subscription tier
   */
  async getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getCurrentSubscription(userId);
    return subscription?.tier || 'free';
  },

  /**
   * Check if user has premium features
   */
  async hasPremiumFeatures(userId: string): Promise<boolean> {
    const tier = await this.getSubscriptionTier(userId);
    return tier === 'pro' || tier === 'premium';
  },

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  },
};

// ============================================
// CREDITS SERVICE
// ============================================

export const creditsService = {
  /**
   * Get user credits
   */
  async getUserCredits(userId: string): Promise<UserCredits> {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        user_id: userId,
        super_likes: 0,
        boosts: 0,
        spotlights: 0,
      };
    }

    return data;
  },

  /**
   * Use a super like
   */
  async useSuperLike(userId: string): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    if (credits.super_likes <= 0) return false;

    await supabase
      .from('user_credits')
      .update({ super_likes: credits.super_likes - 1 })
      .eq('user_id', userId);

    return true;
  },

  /**
   * Use a boost
   */
  async useBoost(userId: string): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    if (credits.boosts <= 0) return false;

    await supabase
      .from('user_credits')
      .update({ boosts: credits.boosts - 1 })
      .eq('user_id', userId);

    // Activate boost on profile
    const boostExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await supabase
      .from('profiles')
      .update({
        is_boosted: true,
        boost_expires_at: boostExpiresAt.toISOString(),
      })
      .eq('id', userId);

    return true;
  },

  /**
   * Use spotlight
   */
  async useSpotlight(userId: string): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    if (credits.spotlights <= 0) return false;

    await supabase
      .from('user_credits')
      .update({ spotlights: credits.spotlights - 1 })
      .eq('user_id', userId);

    // Activate spotlight on profile
    const spotlightExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await supabase
      .from('profiles')
      .update({
        is_spotlight: true,
        spotlight_expires_at: spotlightExpiresAt.toISOString(),
      })
      .eq('id', userId);

    return true;
  },
};

// ============================================
// TRANSACTION HISTORY SERVICE
// ============================================

export const transactionService = {
  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  },

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    return data || null;
  },
};
