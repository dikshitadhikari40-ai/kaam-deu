import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Subscription, SubscriptionTier } from '../types';

interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number; // in NPR per month
  features: string[];
  highlighted?: boolean;
  icon: string;
  color: string;
}

export const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    features: [
      '20 swipes per day',
      'Basic profile',
      'Standard messaging',
      'View job posts',
      '3 saved searches',
      '5 contacts/month',
      '1 active job post',
    ],
    icon: 'user',
    color: '#6B7280',
  },
  {
    tier: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: 499,
    features: [
      'Unlimited swipes',
      'Advanced search filters',
      'Decision Cards with explanations',
      'Compare up to 3 workers',
      '10 saved searches',
      '25 contacts/month',
      '5 active job posts',
      'Email support',
      'Basic analytics',
    ],
    highlighted: true,
    icon: 'star',
    color: '#4A90D9',
  },
  {
    tier: 'premium',
    name: 'Business',
    description: 'For established businesses',
    price: 999,
    features: [
      'All Pro features',
      'Compare up to 5 workers',
      '20 saved searches',
      'Unlimited contacts',
      'Unlimited job posts',
      'Email + Phone support',
      'Advanced analytics',
      'Verified Business badge',
      'Featured in search results',
      'Priority matching',
    ],
    icon: 'award',
    color: '#C9A962',
  },
];

export const subscriptionService = {
  /**
   * Get current subscription for the user
   */
  async getSubscription(): Promise<Subscription | null> {
    if (!isSupabaseConfigured()) {
      return this.getMockSubscription();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting subscription:', error);
      }

      return (data as Subscription) || this.getMockSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return this.getMockSubscription();
    }
  },

  /**
   * Get current tier
   */
  async getCurrentTier(): Promise<SubscriptionTier> {
    const subscription = await this.getSubscription();
    if (!subscription || !subscription.is_active) return 'free';

    // Check if expired
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      return 'free';
    }

    return subscription.tier;
  },

  /**
   * Check if user is premium (pro or premium)
   */
  async isPremiumUser(): Promise<boolean> {
    const tier = await this.getCurrentTier();
    return tier === 'pro' || tier === 'premium';
  },

  /**
   * Subscribe to a tier (UI only - payment integration needed)
   */
  async subscribe(tier: SubscriptionTier): Promise<Subscription | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

      // Upsert subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          tier,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: tier !== 'free',
          updated_at: now.toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;

      return data as Subscription;
    } catch (error) {
      console.error('Error subscribing:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription (downgrade to free)
   */
  async cancelSubscription(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('subscriptions')
        .update({
          tier: 'free',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  },

  /**
   * Get tier config
   */
  getTierConfig(tier: SubscriptionTier): TierConfig | undefined {
    return TIER_CONFIGS.find(t => t.tier === tier);
  },

  /**
   * Check if user has specific feature access
   */
  async hasFeatureAccess(feature: string): Promise<boolean> {
    const tier = await this.getCurrentTier();
    const config = this.getTierConfig(tier);
    if (!config) return false;
    return config.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
  },

  /**
   * Get remaining days on subscription
   */
  async getRemainingDays(): Promise<number> {
    const subscription = await this.getSubscription();
    if (!subscription || !subscription.is_active || !subscription.expires_at) return 0;

    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const remainingMs = expiresAt.getTime() - now.getTime();

    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  },

  /**
   * Get daily swipe limit based on tier
   */
  async getSwipeLimit(): Promise<number> {
    const tier = await this.getCurrentTier();
    switch (tier) {
      case 'premium':
      case 'pro':
        return Infinity;
      default:
        return 20;
    }
  },

  /**
   * Get monthly boost count based on tier
   */
  async getMonthlyBoostCount(): Promise<number> {
    const tier = await this.getCurrentTier();
    switch (tier) {
      case 'premium':
        return 5;
      case 'pro':
        return 1;
      default:
        return 0;
    }
  },

  /**
   * Mock subscription for development
   */
  getMockSubscription(): Subscription {
    return {
      id: 'mock-sub-id',
      user_id: 'mock-user-id',
      tier: 'free',
      started_at: undefined,
      expires_at: undefined,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
};
