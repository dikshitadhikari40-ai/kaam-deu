/**
 * Premium Access Hook
 *
 * Provides easy access to premium feature gating throughout the app.
 * Use this hook to check if a user has access to premium features.
 */

import { useState, useEffect, useCallback } from 'react';
import { workIdentityService } from '../services/workIdentityService';
import { PremiumAccess } from '../types/workIdentity';

// BETA MODE: Set to true to unlock all features for free users during testing
const BETA_MODE = true;

const DEFAULT_ACCESS: PremiumAccess = {
  is_premium: BETA_MODE,
  premium_tier: BETA_MODE ? 'business' : 'free',
  can_compare: BETA_MODE,
  can_save_searches: BETA_MODE,
  can_advanced_filter: BETA_MODE,
  max_saved_searches: BETA_MODE ? 20 : 0,
  max_compare_identities: BETA_MODE ? 5 : 0,
};

export function usePremiumAccess() {
  const [access, setAccess] = useState<PremiumAccess>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In beta mode, always grant full access
      if (BETA_MODE) {
        setAccess(DEFAULT_ACCESS);
        return;
      }

      const data = await workIdentityService.checkPremiumAccess();
      setAccess(data);
    } catch (err) {
      console.error('Premium access check error:', err);
      setError('Failed to check premium access');
      // In beta mode, still grant access even on error
      setAccess(DEFAULT_ACCESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...access,
    loading,
    error,
    refresh,
    // Convenience methods
    isPremium: access.is_premium || access.premium_tier !== 'free',
    tierLabel: getTierLabel(access.premium_tier),
  };
}

function getTierLabel(tier: PremiumAccess['premium_tier']): string {
  switch (tier) {
    case 'business':
      return 'Business';
    case 'pro':
      return 'Pro';
    default:
      return 'Free';
  }
}

/**
 * Feature flag hook
 * Checks if a specific feature flag is enabled
 */
export function useFeatureFlag(featureName: string) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const isEnabled = await workIdentityService.isFeatureEnabled(featureName);
        setEnabled(isEnabled);
      } catch (error) {
        console.error(`Feature flag check error for ${featureName}:`, error);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [featureName]);

  return { enabled, loading };
}

/**
 * Combined hook for gating a specific feature
 * Checks both feature flag AND premium access
 */
export function useFeatureGate(
  featureName: string,
  requiresPremium: boolean = false
) {
  const { enabled: featureEnabled, loading: featureLoading } = useFeatureFlag(featureName);
  const { isPremium, loading: premiumLoading } = usePremiumAccess();

  const loading = featureLoading || premiumLoading;
  const hasAccess = featureEnabled && (!requiresPremium || isPremium);

  return {
    hasAccess,
    loading,
    featureEnabled,
    isPremium,
    reason: !featureEnabled
      ? 'feature_disabled'
      : requiresPremium && !isPremium
      ? 'premium_required'
      : null,
  };
}
