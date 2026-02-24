/**
 * Work Identity Service
 *
 * Handles all Work Identity CRUD operations with Supabase.
 * This is the core service for the new identity-based matching system.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  WorkIdentity,
  IdentitySkill,
  CVSnapshot,
  JobCategory,
  BusinessSavedSearch,
  IdentityContactRequest,
  CreateWorkIdentityParams,
  UpdateWorkIdentityParams,
  AddSkillParams,
  SearchIdentitiesParams,
  SearchIdentitiesResult,
  CVType,
  DecisionCardResult,
  DecisionCardSearchParams,
  CompareIdentityResult,
  PremiumAccess,
} from '../types/workIdentity';

// ============================================
// WORK IDENTITY CRUD
// ============================================

export const workIdentityService = {
  /**
   * Get all work identities for the current user
   */
  async getMyIdentities(): Promise<WorkIdentity[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('work_identities')
      .select(`
        *,
        skills:identity_skills(*),
        current_cv:cv_snapshots(*)
      `)
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('capability_score', { ascending: false });

    if (error) {
      console.error('Get identities error:', error);
      throw new Error(error.message);
    }

    // Filter to get only current CV
    return (data || []).map(identity => ({
      ...identity,
      current_cv: identity.current_cv?.find((cv: CVSnapshot) => cv.is_current && cv.cv_type === 'worker_confidence'),
    }));
  },

  /**
   * Get a single work identity by ID
   */
  async getIdentityById(identityId: string): Promise<WorkIdentity | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('work_identities')
      .select(`
        *,
        skills:identity_skills(*),
        current_cv:cv_snapshots(*)
      `)
      .eq('id', identityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return {
      ...data,
      current_cv: data.current_cv?.find((cv: CVSnapshot) => cv.is_current),
    };
  },

  /**
   * Create a new work identity
   */
  async createIdentity(params: CreateWorkIdentityParams): Promise<WorkIdentity> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if identity for this category already exists
    const { data: existing } = await supabase
      .from('work_identities')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_category', params.job_category)
      .single();

    if (existing) {
      throw new Error(`You already have a work identity for ${params.job_category}`);
    }

    // Check if this should be primary (first identity)
    const { count } = await supabase
      .from('work_identities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isPrimary = count === 0;

    const { data, error } = await supabase
      .from('work_identities')
      .insert({
        user_id: user.id,
        ...params,
        is_primary: isPrimary,
        visibility_status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Create identity error:', error);
      throw new Error(error.message);
    }

    // Generate initial CV snapshots
    await this.generateCV(data.id, 'worker_confidence');
    await this.generateCV(data.id, 'business_decision');

    return data;
  },

  /**
   * Update a work identity
   */
  async updateIdentity(identityId: string, params: UpdateWorkIdentityParams): Promise<WorkIdentity> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // If setting as primary, unset other primaries first
    if (params.is_primary) {
      await supabase
        .from('work_identities')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', identityId);
    }

    const { data, error } = await supabase
      .from('work_identities')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('id', identityId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update identity error:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete a work identity
   */
  async deleteIdentity(identityId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('work_identities')
      .delete()
      .eq('id', identityId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete identity error:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Toggle visibility of a work identity
   */
  async toggleVisibility(identityId: string, status: 'active' | 'hidden' | 'paused'): Promise<WorkIdentity> {
    return this.updateIdentity(identityId, { visibility_status: status });
  },

  // ============================================
  // SKILLS MANAGEMENT
  // ============================================

  /**
   * Add a skill to an identity
   */
  async addSkill(identityId: string, params: AddSkillParams): Promise<IdentitySkill> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('identity_skills')
      .insert({
        identity_id: identityId,
        skill: params.skill,
        skill_level: params.skill_level || 'basic',
        years_experience: params.years_experience || 0,
        certificate_url: params.certificate_url,
        notes: params.notes,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('This skill already exists for this identity');
      }
      console.error('Add skill error:', error);
      throw new Error(error.message);
    }

    // Recalculate capability score
    await this.recalculateScore(identityId);

    return data;
  },

  /**
   * Update a skill
   */
  async updateSkill(skillId: string, params: Partial<AddSkillParams>): Promise<IdentitySkill> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('identity_skills')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('id', skillId)
      .select()
      .single();

    if (error) {
      console.error('Update skill error:', error);
      throw new Error(error.message);
    }

    // Recalculate capability score
    await this.recalculateScore(data.identity_id);

    return data;
  },

  /**
   * Remove a skill
   */
  async removeSkill(skillId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get identity_id before deleting
    const { data: skill } = await supabase
      .from('identity_skills')
      .select('identity_id')
      .eq('id', skillId)
      .single();

    const { error } = await supabase
      .from('identity_skills')
      .delete()
      .eq('id', skillId);

    if (error) {
      console.error('Remove skill error:', error);
      throw new Error(error.message);
    }

    // Recalculate capability score
    if (skill) {
      await this.recalculateScore(skill.identity_id);
    }
  },

  // ============================================
  // CV & SCORING
  // ============================================

  /**
   * Generate/regenerate CV snapshot
   */
  async generateCV(identityId: string, cvType: CVType = 'worker_confidence'): Promise<CVSnapshot> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .rpc('generate_cv_snapshot', {
        p_identity_id: identityId,
        p_cv_type: cvType,
        p_trigger: 'manual',
      });

    if (error) {
      console.error('Generate CV error:', error);
      throw new Error(error.message);
    }

    // Fetch the generated snapshot
    const { data: snapshot } = await supabase
      .from('cv_snapshots')
      .select('*')
      .eq('id', data)
      .single();

    return snapshot;
  },

  /**
   * Get current CV for an identity
   */
  async getCurrentCV(identityId: string, cvType: CVType = 'worker_confidence'): Promise<CVSnapshot | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('cv_snapshots')
      .select('*')
      .eq('identity_id', identityId)
      .eq('cv_type', cvType)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get CV error:', error);
    }

    return data || null;
  },

  /**
   * Recalculate capability score
   */
  async recalculateScore(identityId: string): Promise<number> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .rpc('calculate_capability_score', {
        p_identity_id: identityId,
      });

    if (error) {
      console.error('Recalculate score error:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // ============================================
  // JOB CATEGORIES
  // ============================================

  /**
   * Get all active job categories
   */
  async getJobCategories(): Promise<JobCategory[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('job_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Get categories error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get default skills for a category
   */
  async getCategoryDefaultSkills(categoryName: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];

    const { data } = await supabase
      .from('job_categories')
      .select('default_skills')
      .eq('name', categoryName)
      .single();

    return data?.default_skills || [];
  },

  // ============================================
  // BUSINESS SEARCH
  // ============================================

  /**
   * Search work identities (for business users)
   */
  async searchIdentities(params: SearchIdentitiesParams): Promise<SearchIdentitiesResult[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .rpc('search_work_identities', {
        p_categories: params.categories || null,
        p_min_capability: params.min_capability || null,
        p_experience_levels: params.experience_levels || null,
        p_pay_max: params.pay_max || null,
        p_availability_types: params.availability_types || null,
        p_required_skills: params.required_skills || null,
        p_limit: params.limit || 20,
        p_offset: params.offset || 0,
      });

    if (error) {
      console.error('Search identities error:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Get identity with business decision CV
   */
  async getIdentityForBusiness(identityId: string): Promise<{
    identity: WorkIdentity;
    cv: CVSnapshot | null;
  } | null> {
    if (!isSupabaseConfigured()) return null;

    const identity = await this.getIdentityById(identityId);
    if (!identity) return null;

    const cv = await this.getCurrentCV(identityId, 'business_decision');

    // Increment profile views
    await supabase
      .from('work_identities')
      .update({
        profile_views: (identity.profile_views || 0) + 1,
      })
      .eq('id', identityId);

    return { identity, cv };
  },

  // ============================================
  // SAVED SEARCHES (BUSINESS)
  // ============================================

  /**
   * Get saved searches for business
   */
  async getMySavedSearches(): Promise<BusinessSavedSearch[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('business_saved_searches')
      .select('*')
      .eq('business_id', user.id)
      .order('use_count', { ascending: false });

    if (error) {
      console.error('Get saved searches error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Save a search
   */
  async saveSearch(name: string, params: SearchIdentitiesParams): Promise<BusinessSavedSearch> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('business_saved_searches')
      .insert({
        business_id: user.id,
        name,
        job_categories: params.categories || [],
        min_capability_score: params.min_capability,
        experience_levels: params.experience_levels || [],
        pay_range_max: params.pay_max,
        availability_types: params.availability_types || [],
        required_skills: params.required_skills || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Save search error:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { error } = await supabase
      .from('business_saved_searches')
      .delete()
      .eq('id', searchId);

    if (error) {
      console.error('Delete saved search error:', error);
      throw new Error(error.message);
    }
  },

  // ============================================
  // CONTACT REQUESTS
  // ============================================

  /**
   * Send a contact request to a worker
   */
  async sendContactRequest(identityId: string, message?: string, jobPostId?: string): Promise<IdentityContactRequest> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('identity_contact_requests')
      .insert({
        identity_id: identityId,
        requester_id: user.id,
        message,
        job_post_id: jobPostId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already sent a contact request');
      }
      console.error('Send contact request error:', error);
      throw new Error(error.message);
    }

    // Increment contact requests counter
    await supabase
      .from('work_identities')
      .update({
        contact_requests: supabase.rpc('increment', { x: 1 }),
      })
      .eq('id', identityId);

    return data;
  },

  /**
   * Get contact requests for my identities (worker view)
   */
  async getMyContactRequests(): Promise<IdentityContactRequest[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('identity_contact_requests')
      .select(`
        *,
        identity:work_identities!inner(user_id, job_category, job_title),
        requester:profiles!identity_contact_requests_requester_id_fkey(company_name, logo_url)
      `)
      .eq('identity.user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get contact requests error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Respond to a contact request
   */
  async respondToContactRequest(
    requestId: string,
    status: 'accepted' | 'rejected'
  ): Promise<IdentityContactRequest> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('identity_contact_requests')
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Respond to request error:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // ============================================
  // DECISION CARDS (SR Decision Engine)
  // ============================================

  /**
   * Get decision cards with explanations (for business users)
   */
  async getDecisionCards(params: DecisionCardSearchParams): Promise<DecisionCardResult[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .rpc('get_decision_cards', {
        p_categories: params.categories || null,
        p_min_capability: params.min_capability || null,
        p_experience_levels: params.experience_levels || null,
        p_budget_max: params.budget_max || null,
        p_availability_types: params.availability_types || null,
        p_required_skills: params.required_skills || null,
        p_locations: params.locations || null,
        p_limit: params.limit || 20,
        p_offset: params.offset || 0,
      });

    if (error) {
      console.error('Get decision cards error:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Compare multiple identities side by side
   */
  async compareIdentities(
    identityIds: string[],
    budgetMax?: number,
    requiredSkills?: string[]
  ): Promise<CompareIdentityResult[]> {
    if (!isSupabaseConfigured()) return [];

    if (identityIds.length > 5) {
      throw new Error('Cannot compare more than 5 identities');
    }

    const { data, error } = await supabase
      .rpc('compare_identities', {
        p_identity_ids: identityIds,
        p_budget_max: budgetMax || null,
        p_required_skills: requiredSkills || null,
      });

    if (error) {
      console.error('Compare identities error:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Check premium access for current user
   */
  async checkPremiumAccess(): Promise<PremiumAccess> {
    if (!isSupabaseConfigured()) {
      return {
        is_premium: false,
        premium_tier: 'free',
        can_compare: false,
        can_save_searches: false,
        can_advanced_filter: false,
        max_saved_searches: 0,
        max_compare_identities: 0,
      };
    }

    const { data, error } = await supabase.rpc('check_premium_access');

    if (error) {
      console.error('Check premium error:', error);
      return {
        is_premium: false,
        premium_tier: 'free',
        can_compare: false,
        can_save_searches: false,
        can_advanced_filter: false,
        max_saved_searches: 0,
        max_compare_identities: 0,
      };
    }

    return data?.[0] || {
      is_premium: false,
      premium_tier: 'free',
      can_compare: false,
      can_save_searches: false,
      can_advanced_filter: false,
      max_saved_searches: 0,
      max_compare_identities: 0,
    };
  },

  /**
   * Check if a feature flag is enabled
   */
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data, error } = await supabase
      .rpc('is_feature_enabled', { p_feature_name: featureName });

    if (error) {
      console.error('Feature flag check error:', error);
      return false;
    }

    return data || false;
  },
};

export default workIdentityService;
