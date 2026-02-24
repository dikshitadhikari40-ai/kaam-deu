/**
 * Work Identity Types
 *
 * Core concept: A Work Identity = How one person is evaluated for ONE type of work
 * One user can have MULTIPLE work identities (e.g., Driver + Helper)
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'expert';
export type SkillLevel = 'basic' | 'intermediate' | 'good' | 'expert';
export type AvailabilityType = 'full_time' | 'part_time' | 'contract' | 'daily_wage' | 'flexible';
export type PayType = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type VisibilityStatus = 'active' | 'hidden' | 'paused';
export type CVType = 'worker_confidence' | 'business_decision' | 'public_summary';

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  junior: 'Junior (0-2 years)',
  mid: 'Mid-Level (2-5 years)',
  senior: 'Senior (5-10 years)',
  expert: 'Expert (10+ years)',
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  good: 'Good',
  expert: 'Expert',
};

export const AVAILABILITY_LABELS: Record<AvailabilityType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  daily_wage: 'Daily Wage',
  flexible: 'Flexible',
};

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  hourly: 'per hour',
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
};

// ============================================
// CORE INTERFACES
// ============================================

export interface WorkIdentity {
  id: string;
  user_id: string;

  // Job Category
  job_category: string;
  job_title?: string;

  // Capability
  capability_score: number; // 0-100
  experience_level: ExperienceLevel;
  experience_years: number;

  // Pay
  expected_pay_min?: number;
  expected_pay_max?: number;
  pay_type: PayType;

  // Availability
  availability: AvailabilityType;
  available_from?: string;
  preferred_locations: string[];
  is_remote_ok: boolean;

  // Visibility
  visibility_status: VisibilityStatus;
  is_primary: boolean;

  // Metrics
  profile_views: number;
  search_appearances: number;
  contact_requests: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data (from queries)
  skills?: IdentitySkill[];
  current_cv?: CVSnapshot;
}

export interface IdentitySkill {
  id: string;
  identity_id: string;
  skill: string;
  skill_level: SkillLevel;
  years_experience: number;
  is_verified: boolean;
  verified_at?: string;
  certificate_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CVSnapshot {
  id: string;
  identity_id: string;
  cv_type: CVType;
  content_json: CVContent;
  version: number;
  is_current: boolean;
  generated_at: string;
  generation_trigger?: string;
}

// CV Content structures based on type
export interface CVContent {
  // Worker Confidence View
  header?: {
    job_category: string;
    job_title?: string;
    capability_score: number;
    experience_level: string;
  };
  strengths?: IdentitySkill[];
  availability?: {
    type: string;
    available_from?: string;
    locations: string[];
    remote_ok: boolean;
  };
  expectations?: {
    pay_min?: number;
    pay_max?: number;
    pay_type: string;
  };
  metrics?: {
    profile_views: number;
    contact_requests: number;
  };

  // Business Decision View
  summary?: {
    category: string;
    title?: string;
    capability: number;
    experience: string;
    years: number;
  };
  skills_match?: IdentitySkill[];
  availability_fit?: {
    type: string;
    start_date?: string;
    locations: string[];
  };
  cost?: {
    range_min?: number;
    range_max?: number;
    period: string;
  };
  reliability_indicators?: {
    search_appearances: number;
    contact_rate: number;
  };
}

export interface JobCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  parent_category?: string;
  default_skills: string[];
  is_active: boolean;
  sort_order: number;
}

// ============================================
// BUSINESS FEATURES
// ============================================

export interface BusinessSavedSearch {
  id: string;
  business_id: string;
  name: string;

  // Search criteria
  job_categories: string[];
  min_capability_score?: number;
  max_capability_score?: number;
  experience_levels: ExperienceLevel[];
  pay_range_min?: number;
  pay_range_max?: number;
  availability_types: AvailabilityType[];
  required_skills: string[];
  locations: string[];

  // Notifications
  notify_on_match: boolean;
  notification_frequency: 'instant' | 'daily' | 'weekly';

  // Usage
  last_used_at?: string;
  use_count: number;

  created_at: string;
  updated_at: string;
}

export interface IdentityContactRequest {
  id: string;
  identity_id: string;
  requester_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  job_post_id?: string;
  responded_at?: string;
  expires_at: string;
  created_at: string;

  // Joined data
  identity?: WorkIdentity;
  requester_profile?: {
    company_name: string;
    logo_url?: string;
  };
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateWorkIdentityParams {
  job_category: string;
  job_title?: string;
  experience_level?: ExperienceLevel;
  experience_years?: number;
  expected_pay_min?: number;
  expected_pay_max?: number;
  pay_type?: PayType;
  availability?: AvailabilityType;
  available_from?: string;
  preferred_locations?: string[];
  is_remote_ok?: boolean;
}

export interface UpdateWorkIdentityParams extends Partial<CreateWorkIdentityParams> {
  visibility_status?: VisibilityStatus;
  is_primary?: boolean;
}

export interface AddSkillParams {
  skill: string;
  skill_level?: SkillLevel;
  years_experience?: number;
  certificate_url?: string;
  notes?: string;
}

export interface SearchIdentitiesParams {
  categories?: string[];
  min_capability?: number;
  experience_levels?: ExperienceLevel[];
  pay_max?: number;
  availability_types?: AvailabilityType[];
  required_skills?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchIdentitiesResult {
  identity_id: string;
  user_id: string;
  job_category: string;
  job_title?: string;
  capability_score: number;
  experience_level: ExperienceLevel;
  expected_pay_min?: number;
  expected_pay_max?: number;
  availability: AvailabilityType;
  skill_match_count: number;
}

// ============================================
// DECISION CARD TYPES (SR Decision Engine)
// ============================================

export interface DecisionCardResult {
  identity_id: string;
  user_id: string;
  job_category: string;
  job_title?: string;
  capability_score: number;
  experience_level: ExperienceLevel;
  experience_years: number;
  expected_pay_min?: number;
  expected_pay_max?: number;
  pay_type: PayType;
  availability: AvailabilityType;
  preferred_locations: string[];
  is_remote_ok: boolean;
  skill_count: number;
  verified_skill_count: number;
  matching_skill_count: number;
  pay_fit_score: number;
  availability_score: number;
  overall_fit_score: number;
  explanation: string;
  explanation_points: string[];
}

export interface CompareIdentityResult {
  identity_id: string;
  job_category: string;
  job_title?: string;
  capability_score: number;
  experience_level: ExperienceLevel;
  experience_years: number;
  pay_range: string;
  availability: AvailabilityType;
  skill_count: number;
  verified_skill_count: number;
  matching_skill_count: number;
  pay_fit_score: number;
  overall_fit_score: number;
  skills_json: IdentitySkill[];
  strengths: string[];
  considerations: string[];
}

export interface PremiumAccess {
  is_premium: boolean;
  premium_tier: 'free' | 'pro' | 'business';
  can_compare: boolean;
  can_save_searches: boolean;
  can_advanced_filter: boolean;
  max_saved_searches: number;
  max_compare_identities: number;
}

export interface DecisionCardSearchParams {
  categories?: string[];
  min_capability?: number;
  experience_levels?: ExperienceLevel[];
  budget_max?: number;
  availability_types?: AvailabilityType[];
  required_skills?: string[];
  locations?: string[];
  limit?: number;
  offset?: number;
}

// ============================================
// UI HELPER TYPES
// ============================================

export interface CapabilityScoreDisplay {
  score: number;
  label: string;
  color: string;
  icon: string;
}

export function getCapabilityDisplay(score: number): CapabilityScoreDisplay {
  if (score >= 80) {
    return { score, label: 'Excellent', color: '#10B981', icon: 'award' };
  } else if (score >= 60) {
    return { score, label: 'Good', color: '#3B82F6', icon: 'thumbs-up' };
  } else if (score >= 40) {
    return { score, label: 'Average', color: '#F59E0B', icon: 'minus' };
  } else {
    return { score, label: 'Building', color: '#6B7280', icon: 'trending-up' };
  }
}

export function formatPayRange(
  min?: number,
  max?: number,
  type: PayType = 'monthly'
): string {
  if (!min && !max) return 'Negotiable';

  const format = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const suffix = PAY_TYPE_LABELS[type];

  if (min && max) {
    return `Rs. ${format(min)} - ${format(max)} ${suffix}`;
  } else if (min) {
    return `Rs. ${format(min)}+ ${suffix}`;
  } else if (max) {
    return `Up to Rs. ${format(max)} ${suffix}`;
  }

  return 'Negotiable';
}
