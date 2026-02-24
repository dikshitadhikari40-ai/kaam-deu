import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Boost, BoostType } from '../types';

interface BoostConfig {
  type: BoostType;
  name: string;
  description: string;
  duration_minutes: number;
  multiplier: number;
  price: number; // in NPR
  icon: string;
  color: string;
}

export const BOOST_CONFIGS: BoostConfig[] = [
  {
    type: 'standard',
    name: 'Standard Boost',
    description: 'Get 3x more visibility for 30 minutes',
    duration_minutes: 30,
    multiplier: 3,
    price: 99,
    icon: 'zap',
    color: '#4A90D9',
  },
  {
    type: 'super',
    name: 'Super Boost',
    description: 'Get 10x more visibility for 3 hours',
    duration_minutes: 180,
    multiplier: 10,
    price: 299,
    icon: 'trending-up',
    color: '#9B59B6',
  },
  {
    type: 'spotlight',
    name: 'Spotlight',
    description: 'Featured profile for 24 hours',
    duration_minutes: 1440,
    multiplier: 20,
    price: 499,
    icon: 'star',
    color: '#F39C12',
  },
];

export const boostService = {
  /**
   * Get current active boost for the user
   */
  async getActiveBoost(): Promise<Boost | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('boosts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting active boost:', error);
      }

      return data as Boost || null;
    } catch (error) {
      console.error('Error getting active boost:', error);
      return null;
    }
  },

  /**
   * Get all boosts for the user (including expired)
   */
  async getUserBoosts(): Promise<Boost[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('boosts')
        .select('*')
        .eq('user_id', user.id)
        .order('activated_at', { ascending: false });

      if (error) {
        console.error('Error getting user boosts:', error);
        return [];
      }

      return (data as Boost[]) || [];
    } catch (error) {
      console.error('Error getting user boosts:', error);
      return [];
    }
  },

  /**
   * Activate a new boost
   */
  async activateBoost(boostType: BoostType): Promise<Boost | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const config = BOOST_CONFIGS.find(b => b.type === boostType);
      if (!config) throw new Error('Invalid boost type');

      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.duration_minutes * 60 * 1000);

      // Deactivate any existing active boosts
      await supabase
        .from('boosts')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Create new boost
      const { data, error } = await supabase
        .from('boosts')
        .insert({
          user_id: user.id,
          boost_type: boostType,
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return data as Boost;
    } catch (error) {
      console.error('Error activating boost:', error);
      throw error;
    }
  },

  /**
   * Check if user has any active boost
   */
  async hasActiveBoost(): Promise<boolean> {
    const boost = await this.getActiveBoost();
    return boost !== null;
  },

  /**
   * Get remaining time for active boost in minutes
   */
  async getBoostRemainingTime(): Promise<number> {
    const boost = await this.getActiveBoost();
    if (!boost) return 0;

    const now = new Date();
    const expiresAt = new Date(boost.expires_at);
    const remainingMs = expiresAt.getTime() - now.getTime();

    return Math.max(0, Math.ceil(remainingMs / (1000 * 60)));
  },

  /**
   * Get boost config by type
   */
  getBoostConfig(type: BoostType): BoostConfig | undefined {
    return BOOST_CONFIGS.find(b => b.type === type);
  },

  /**
   * Format remaining time for display
   */
  formatRemainingTime(minutes: number): string {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m left`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    }

    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  },

  /**
   * Get users with active boosts (for feed ordering)
   * Returns user IDs ordered by boost strength
   */
  async getBoostedUserIds(): Promise<string[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('boosts')
        .select('user_id, boost_type')
        .eq('is_active', true)
        .gt('expires_at', now);

      if (error) {
        console.error('Error getting boosted users:', error);
        return [];
      }

      // Sort by boost power (spotlight > super > standard)
      const boostOrder = { spotlight: 3, super: 2, standard: 1 };
      const sorted = (data || []).sort((a, b) => {
        return (boostOrder[b.boost_type as BoostType] || 0) - (boostOrder[a.boost_type as BoostType] || 0);
      });

      return sorted.map(b => b.user_id);
    } catch (error) {
      console.error('Error getting boosted users:', error);
      return [];
    }
  },
};
