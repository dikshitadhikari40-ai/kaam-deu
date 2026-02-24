// ============================================
// DATABASE SCHEMA & TYPE DEFINITIONS
// Kaam Deu - Tinder-style Hiring App for Nepal
// ============================================

// ============================================
// 1. USER & AUTHENTICATION
// ============================================

export type UserRole = 'worker' | 'business';
export type AuthProvider = 'email' | 'google' | 'linkedin';
export type Gender = 'male' | 'female' | 'other';
export type ActiveStatus = 'online' | 'recently_active' | 'offline';

/**
 * Career Tier System
 * - 'higher': LinkedIn users (career-driven professionals)
 * - 'standard': Google/Email users (general users)
 * LinkedIn login indicates higher career focus
 */
export type CareerTier = 'higher' | 'standard';

/**
 * Get career tier based on auth provider
 */
export const getCareerTierFromProvider = (provider: AuthProvider): CareerTier => {
    return provider === 'linkedin' ? 'higher' : 'standard';
};

/**
 * Core User Table
 * Stores authentication and basic user information
 */
export interface User {
    id: string;                          // UUID primary key
    email: string;                       // Unique email address
    password_hash?: string;              // Hashed password (null for social logins)
    role: UserRole;                      // 'worker' or 'business'

    // Social Auth Fields
    auth_provider: AuthProvider;         // How user signed up
    google_uid?: string;                 // Google OAuth ID
    linkedin_uid?: string;               // LinkedIn OAuth ID
    career_tier: CareerTier;             // 'higher' (LinkedIn) or 'standard' (Google/Email)

    // Basic Profile
    name: string;                        // Full name
    profile_pic?: string;                // Profile picture URL
    phone?: string;                      // Phone number (for Nepal: +977)

    // Status & Timestamps
    is_verified: boolean;                // Email/phone verified
    is_active: boolean;                  // Account active
    last_online?: string;                // ISO timestamp
    created_at: string;                  // ISO timestamp
    updated_at: string;                  // ISO timestamp
}

/**
 * User Registration Input
 */
export interface RegisterInput {
    email: string;
    password: string;
    name: string;
    role: UserRole;
}

/**
 * Social Login Input
 */
export interface SocialLoginInput {
    provider: 'google' | 'linkedin';
    providerId: string;
    email: string;
    name: string;
    photoUrl?: string;
    role?: UserRole;
}

/**
 * Auth Response from API
 */
export interface AuthResponse {
    user: User;
    profile: WorkerProfile | BusinessProfile;
    token: string;
    isNewUser?: boolean;
}

// ============================================
// 2. WORKER PROFILE
// ============================================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'daily_wage';
export type AvailabilityStatus = 'available' | 'employed' | 'looking';

/**
 * Worker Profile Table
 * Extended profile for job seekers
 */
export interface WorkerProfile {
    id: string;                          // UUID primary key
    user_id: string;                     // FK to users table

    // Professional Info
    job_title: string;                   // Current/desired job title
    bio?: string;                        // About me (max 500 chars)
    skills: string[];                    // Array of skills
    experience_years: number;            // Years of experience

    // Work Preferences
    expected_salary_min?: number;        // Minimum salary (NPR)
    expected_salary_max?: number;        // Maximum salary (NPR)
    preferred_employment: EmploymentType[];
    availability: AvailabilityStatus;
    available_from?: string;             // ISO date when available
    willing_to_relocate: boolean;

    // Location
    current_location: string;            // City/Area
    preferred_locations: string[];       // Preferred work locations

    // Documents & Verification
    resume_url?: string;                 // Uploaded resume
    certifications?: string[];           // List of certifications
    portfolio_urls?: string[];           // Portfolio/work samples

    // Additional
    languages: string[];                 // Languages spoken
    education?: string;                  // Highest education

    // Profile Media
    photos: string[];                    // Profile photos (up to 5)
    video_intro_url?: string;            // Video introduction

    // Timestamps
    created_at: string;
    updated_at: string;
}

// ============================================
// 3. BUSINESS PROFILE
// ============================================

export type BusinessType = 'company' | 'startup' | 'agency' | 'individual';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

/**
 * Business Profile Table
 * Extended profile for employers/businesses
 */
export interface BusinessProfile {
    id: string;                          // UUID primary key
    user_id: string;                     // FK to users table

    // Company Info
    company_name: string;                // Business name
    company_type: BusinessType;
    company_size: CompanySize;
    industry: string;                    // Industry category
    description?: string;                // About the company
    website?: string;                    // Company website

    // Contact Person
    contact_person: string;              // HR/Hiring manager name
    contact_position?: string;           // Position of contact
    contact_phone?: string;              // Contact phone

    // Location
    location: string;                    // Office location
    multiple_locations?: string[];       // Other office locations

    // Verification
    is_verified_business: boolean;       // Verified employer badge
    pan_number?: string;                 // PAN for verification
    registration_number?: string;        // Business registration

    // Media
    logo_url?: string;                   // Company logo
    cover_photo_url?: string;            // Cover/banner image
    office_photos?: string[];            // Office environment photos

    // Hiring Preferences
    typically_hiring: string[];          // Job categories they hire for
    benefits_offered?: string[];         // Benefits they offer

    // Timestamps
    created_at: string;
    updated_at: string;
}

// ============================================
// 4. SWIPES & MATCHING
// ============================================

export type SwipeDirection = 'left' | 'right' | 'up'; // left=nope, right=like, up=super

/**
 * Swipe Table
 * Records all swipe actions
 */
export interface Swipe {
    id: string;                          // UUID primary key
    swiper_id: string;                   // User who swiped
    swiped_id: string;                   // User who was swiped on
    direction: SwipeDirection;
    created_at: string;
}

/**
 * Match Table
 * Created when both users swipe right
 */
export interface Match {
    id: string;                          // UUID primary key
    user1_id: string;                    // First user (worker or business)
    user2_id: string;                    // Second user (worker or business)
    matched_at: string;                  // When match occurred

    // Chat Status
    last_message?: string;               // Preview of last message
    last_message_at?: string;            // Timestamp of last message
    unread_count_user1: number;          // Unread count for user1
    unread_count_user2: number;          // Unread count for user2

    // Match Status
    is_active: boolean;                  // Match still active
    unmatch_by?: string;                 // User who unmatched (if any)
}

// ============================================
// 5. MESSAGING
// ============================================

export type MessageType = 'text' | 'image' | 'file' | 'location';

/**
 * Chat Message Table
 */
export interface ChatMessage {
    id: string;                          // UUID primary key
    match_id: string;                    // FK to matches table
    sender_id: string;                   // FK to users table

    message_type: MessageType;
    content: string;                     // Message text or URL

    // Status
    is_read: boolean;
    read_at?: string;

    // Timestamps
    created_at: string;
    edited_at?: string;
    deleted_at?: string;                 // Soft delete
}

// ============================================
// 6. JOB POSTS (Optional - for businesses)
// ============================================

export type JobStatus = 'active' | 'paused' | 'filled' | 'expired';

/**
 * Job Post Table
 * Businesses can create job listings
 */
export interface JobPost {
    id: string;
    business_id: string;                 // FK to business_profiles

    title: string;
    description: string;
    requirements: string[];
    skills_required: string[];

    employment_type: EmploymentType;
    salary_min?: number;
    salary_max?: number;
    salary_negotiable: boolean;

    location: string;
    is_remote: boolean;

    status: JobStatus;
    applications_count: number;

    expires_at?: string;
    created_at: string;
    updated_at: string;
}

// ============================================
// 7. UI/DISPLAY TYPES
// ============================================

/**
 * Match Score from Smart Matching Algorithm
 */
export interface MatchScore {
    overall: number;        // 0-100 overall match score
    skillMatch: number;     // 0-100 skill compatibility
    locationMatch: number;  // 0-100 location proximity
    salaryFit: number;      // 0-100 salary compatibility
    experienceScore: number;// 0-100 experience relevance
    availabilityScore: number; // 0-100 availability
    profileQuality: number; // 0-100 profile completeness
}

/**
 * Profile Card for Swipe Interface
 * Combines data for display
 */
export interface ProfileCard {
    id: string;
    userId: string;
    role: UserRole;

    // Display Info
    name: string;
    age?: number;
    bio?: string;

    // For Workers
    jobTitle?: string;
    experienceYears?: number;
    expectedSalary?: number;            // NPR
    skills?: string[];

    // For Businesses
    companyName?: string;
    industry?: string;
    companySize?: CompanySize;
    benefits?: string[];

    // Common
    location: string;
    distance?: number;                   // km from user
    images: string[];
    verified: boolean;
    activeStatus: ActiveStatus;

    // Interests/Tags
    interests?: string[];

    // Smart Matching
    matchScore?: MatchScore;            // Algorithm-calculated match score

    // Job Post Integration (for workers swiping on jobs)
    isJobPost?: boolean;                // True if this card represents a job post
    jobId?: string;                     // Job post ID if isJobPost is true
    jobDetails?: {                      // Job-specific details
        title: string;
        description: string;
        requirements: string[];
        skills_required: string[];
        employment_type: EmploymentType;
        salary_min?: number;
        salary_max?: number;
        salary_negotiable: boolean;
        is_remote: boolean;
        business_id: string;
    };
}

/**
 * Conversation Preview for Chat List
 */
export interface ConversationPreview {
    matchId: string;
    otherUser: {
        id: string;
        name: string;
        profilePic?: string;
        role: UserRole;
    };
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    isOnline: boolean;
}

// ============================================
// 8. NOTIFICATION & PREFERENCES
// ============================================

export interface UserPreferences {
    user_id: string;

    // Discovery Preferences
    show_me: UserRole | 'both';          // Who to show in feed
    max_distance: number;                // km
    min_age?: number;
    max_age?: number;

    // Notification Settings
    push_enabled: boolean;
    email_notifications: boolean;
    new_match_alert: boolean;
    message_alert: boolean;

    // Privacy
    show_online_status: boolean;
    show_read_receipts: boolean;
}

// ============================================
// 9. ANALYTICS & TRACKING
// ============================================

export interface ProfileView {
    id: string;
    viewer_id: string;
    viewed_id: string;
    viewed_at: string;
}

export interface UserStats {
    user_id: string;
    profile_views: number;
    swipes_received: number;
    matches_count: number;
    response_rate: number;               // % of messages responded to
    avg_response_time: number;           // minutes
}

// ============================================
// 10. FILTER & MATCHING PREFERENCES
// ============================================

/**
 * Feed Filter Options
 * Used to filter profiles in the swipe feed
 */
export interface FeedFilters {
    skills?: string[];                   // Filter by skills (for workers)
    maxDistance?: number;                // Maximum distance in km
    location?: string;                   // Specific location
    minSalary?: number;                  // Minimum salary expectation
    maxSalary?: number;                  // Maximum salary expectation
    experienceMin?: number;              // Minimum years of experience
    experienceMax?: number;              // Maximum years of experience
    employmentTypes?: EmploymentType[];  // Employment type preferences
    verifiedOnly?: boolean;              // Only show verified profiles
}

// ============================================
// 11. REVIEWS & RATINGS
// ============================================

/**
 * Review Table
 * Users can rate and review after job completion
 */
export interface Review {
    id: string;
    reviewer_id: string;
    reviewed_id: string;
    match_id: string;
    rating: number;                      // 1-5 stars
    comment?: string;
    created_at: string;
    // Joined fields (from reviewer profile)
    reviewer_name?: string;
    reviewer_photo?: string;
}

// ============================================
// 12. REPORTS & BLOCKS
// ============================================

export type ReportReason =
    | 'inappropriate_content'
    | 'harassment'
    | 'spam'
    | 'fake_profile'
    | 'scam'
    | 'other';

/**
 * Report Table
 * Users can report inappropriate behavior
 */
export interface Report {
    id: string;
    reporter_id: string;
    reported_id: string;
    reason: ReportReason;
    description?: string;
    status: 'pending' | 'reviewed' | 'resolved';
    created_at: string;
}

/**
 * Block Table
 * Users can block other users
 */
export interface Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    created_at: string;
}

// ============================================
// 13. GAMIFICATION - BADGES & ACHIEVEMENTS
// ============================================

export type BadgeCategory = 'engagement' | 'quality' | 'milestone' | 'special' | 'verification';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'special';

/**
 * Badge Definition
 */
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;                        // Feather icon name
    category: BadgeCategory;
    tier: BadgeTier;
    criteria?: Record<string, any>;      // JSON criteria for awarding
    created_at: string;
}

/**
 * User's Earned Badge
 */
export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;
    progress: number;                    // 0-100 completion percentage
    // Joined fields
    badge?: Badge;
}

// ============================================
// 14. LOGIN STREAKS
// ============================================

export interface UserStreak {
    id: string;
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_login_date: string;
    updated_at: string;
}

// ============================================
// 15. USER ANALYTICS & INSIGHTS
// ============================================

export interface UserInsights {
    profile_views: number;
    profile_views_change: number;        // week-over-week change percentage
    match_rate: number;                  // percentage
    total_matches: number;
    total_swipes_received: number;
    response_rate: number;               // percentage
    avg_response_time_minutes: number;   // minutes
    total_messages_sent: number;
    total_messages_received: number;
    average_rating: number;
    total_reviews: number;
    jobs_completed: number;
    last_updated: string;                // ISO date string
}

// ============================================
// 16. PROFILE BOOST
// ============================================

export type BoostType = 'standard' | 'super' | 'spotlight';

export interface Boost {
    id: string;
    user_id: string;
    boost_type: BoostType;
    activated_at: string;
    expires_at: string;
    is_active: boolean;
}

// ============================================
// 17. PREMIUM SUBSCRIPTION
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface Subscription {
    id: string;
    user_id: string;
    tier: SubscriptionTier;
    started_at?: string;
    expires_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================
// 18. BUSINESS FEED / POSTS
// ============================================

export type PostType = 'update' | 'job_highlight' | 'company_news' | 'hiring_event' | 'achievement';

/**
 * Business Feed Post
 * Businesses can share updates, news, and highlights
 */
export interface BusinessPost {
    id: string;
    business_id: string;            // FK to business_profiles
    author_id: string;              // FK to users table

    // Content
    post_type: PostType;
    title?: string;                 // Optional title
    content: string;                // Main post content
    media_urls?: string[];          // Images/videos

    // Engagement
    likes_count: number;
    dislikes_count: number;
    comments_count: number;
    shares_count: number;

    // Visibility
    is_pinned: boolean;
    is_active: boolean;

    // Timestamps
    created_at: string;
    updated_at: string;

    // Joined fields from business profile
    business_name?: string;
    business_logo?: string;
    business_industry?: string;
    is_verified_business?: boolean;
}

/**
 * Post Like
 */
export interface PostLike {
    id: string;
    post_id: string;
    user_id: string;
    created_at: string;
}

/**
 * Post Comment
 */
export interface PostComment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at?: string;

    // Joined fields
    user_name?: string;
    user_photo?: string;
    user_role?: UserRole;
}

/**
 * Create Post Input
 */
export interface CreatePostInput {
    post_type: PostType;
    title?: string;
    content: string;
    media_urls?: string[];
}
// ============================================
// 19. NEWS FEED
// ============================================

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    image_url?: string;
    source: string;
    category: 'industry' | 'job_market' | 'economy' | 'general';
    url?: string;
    published_at: string;
}

// ============================================
// 20. NOTIFICATIONS
// ============================================

export type NotificationType = 'badge_earned' | 'new_match' | 'message' | 'job_update' | 'system_alert';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}
