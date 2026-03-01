// ============================================
// LEARNING RESOURCES & COURSES
// Kaam Deu - Learning Platform Integration
// ============================================

/**
 * Course Platform Sources
 */
export type CoursePlatform =
    | 'coursera'
    | 'youtube'
    | 'linkedin'
    | 'edx'
    | 'udemy'
    | 'skillshare'
    | 'khan_academy'
    | 'pluralsight';

/**
 * Course Categories
 */
export type CourseCategory =
    | 'technology'
    | 'business'
    | 'design'
    | 'marketing'
    | 'data_science'
    | 'development'
    | 'languages'
    | 'soft_skills'
    | 'entrepreneurship'
    | 'finance';

/**
 * Course Difficulty Level
 */
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';

/**
 * Course/Resource Interface
 */
export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    platform: CoursePlatform;
    category: CourseCategory;
    level: CourseLevel;
    duration: string; // e.g., "5 hours", "10 weeks"
    rating?: number; // 0-5
    enrollments?: number;
    instructor: string;
    isFree: boolean;
    originalUrl: string; // The actual course URL
    affiliateUrl?: string; // Affiliate link for earning commission
    tags: string[];

    // Affiliate tracking
    affiliateCommission?: number; // Commission percentage or amount
    trackingId?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
    featured?: boolean;
}

/**
 * User Course Progress (for tracking enrolled courses)
 */
export interface UserCourseProgress {
    id: string;
    user_id: string;
    course_id: string;
    enrolled_at: string;
    completed_at?: string;
    progress_percentage: number; // 0-100
    last_accessed_at?: string;
    certificate_url?: string;
}

/**
 * Click Tracking for Analytics & Affiliate
 */
export interface CourseClick {
    id: string;
    user_id?: string; // Optional - can track anonymous clicks too
    course_id: string;
    platform: CoursePlatform;
    clicked_at: string;
    ip_address?: string;
    user_agent?: string;
    converted?: boolean; // Did user actually enroll?
    commission_earned?: number;
}

/**
 * Platform Affiliate Info
 */
export interface PlatformAffiliateInfo {
    platform: CoursePlatform;
    affiliateProgramName: string;
    commissionRate: string; // e.g., "10%", "$5 per lead"
    signupUrl: string; // Where user can sign up for affiliate program
    isActive: boolean;
}

/**
 * Platform Display Info
 */
export interface PlatformDisplay {
    key: CoursePlatform;
    name: string;
    icon: string;
    color: string;
    affiliateInfo?: PlatformAffiliateInfo;
}
