// ============================================
// LEARNING RESOURCES SERVICE
// Handles course data, affiliate links, and click tracking
// ============================================

import { supabase } from '../lib/supabaseClient';
import {
    Course,
    CoursePlatform,
    CourseCategory,
    PlatformDisplay,
    CourseClick,
    PlatformAffiliateInfo
} from '../types/learning';

/**
 * Platform Display Information
 */
export const PLATFORMS: Record<CoursePlatform, PlatformDisplay> = {
    coursera: {
        key: 'coursera',
        name: 'Coursera',
        icon: 'book-open',
        color: '#0056D2',
        affiliateInfo: {
            platform: 'coursera',
            affiliateProgramName: 'Coursera Affiliate Program',
            commissionRate: '10-20% commission',
            signupUrl: 'https://partners.coursera.com/',
            isActive: true
        }
    },
    youtube: {
        key: 'youtube',
        name: 'YouTube',
        icon: 'youtube',
        color: '#FF0000',
        affiliateInfo: {
            platform: 'youtube',
            affiliateProgramName: 'YouTube Partner Program',
            commissionRate: 'Ad revenue share',
            signupUrl: 'https://www.youtube.com/partners',
            isActive: true
        }
    },
    linkedin: {
        key: 'linkedin',
        name: 'LinkedIn Learning',
        icon: 'linkedin',
        color: '#0077B5',
        affiliateInfo: {
            platform: 'linkedin',
            affiliateProgramName: 'LinkedIn Partner Program',
            commissionRate: 'Varies',
            signupUrl: 'https://learning.linkedin.com/partners',
            isActive: true
        }
    },
    edx: {
        key: 'edx',
        name: 'edX',
        icon: 'globe',
        color: '#02262B',
        affiliateInfo: {
            platform: 'edx',
            affiliateProgramName: 'edX Affiliate Program',
            commissionRate: '5-10% commission',
            signupUrl: 'https://www.edx.org/partners',
            isActive: true
        }
    },
    udemy: {
        key: 'udemy',
        name: 'Udemy',
        icon: 'play-circle',
        color: '#A435F0',
        affiliateInfo: {
            platform: 'udemy',
            affiliateProgramName: 'Udemy Affiliate Program',
            commissionRate: '15% commission',
            signupUrl: 'https://www.udemy.com/teaching/?ref=teach_footer',
            isActive: true
        }
    },
    skillshare: {
        key: 'skillshare',
        name: 'Skillshare',
        icon: 'film',
        color: '#00FF84',
        affiliateInfo: {
            platform: 'skillshare',
            affiliateProgramName: 'Skillshare Partner Program',
            commissionRate: '$10 per premium referral',
            signupUrl: 'https://www.skillshare.com/affiliates',
            isActive: true
        }
    },
    khan_academy: {
        key: 'khan_academy',
        name: 'Khan Academy',
        icon: 'graduation-cap',
        color: '#14BF96',
        affiliateInfo: {
            platform: 'khan_academy',
            affiliateProgramName: 'Khan Academy (Free)',
            commissionRate: 'N/A - All free content',
            signupUrl: 'https://www.khanacademy.org/partners',
            isActive: false
        }
    },
    pluralsight: {
        key: 'pluralsight',
        name: 'Pluralsight',
        icon: 'code',
        color: '#F15B25',
        affiliateInfo: {
            platform: 'pluralsight',
            affiliateProgramName: 'Pluralsight Affiliate Program',
            commissionRate: '20% commission',
            signupUrl: 'https://www.pluralsight.com/partners',
            isActive: true
        }
    }
};

/**
 * COURSE CATALOG - Free & Paid Courses
 *
 * NOTE: To enable affiliate links, sign up for each platform's affiliate program
 * and replace the affiliateUrl with your actual affiliate links.
 *
 * For now, these are direct links. Add your affiliate IDs to start earning!
 */
export const COURSE_CATALOG: Course[] = [
    // ============================================
    // TECHNOLOGY & DEVELOPMENT
    // ============================================
    {
        id: 'coursera-python-google',
        title: 'Python for Everybody',
        description: 'Learn to Program and Analyze Data with Python. Specialization from University of Michigan.',
        thumbnail: 'https://images.coursera.org/api/courseCardImages/course-card-v3.jpg',
        platform: 'coursera',
        category: 'development',
        level: 'beginner',
        duration: '3 months',
        rating: 4.8,
        enrollments: 2500000,
        instructor: 'Charles Severance',
        isFree: true,
        originalUrl: 'https://www.coursera.org/specializations/python',
        affiliateUrl: 'https://www.coursera.org/specializations/python?referralCode=YOUR_CODE',
        tags: ['python', 'programming', 'data science'],
        affiliateCommission: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        featured: true
    },
    {
        id: 'coursera-google-it',
        title: 'Google IT Automation with Python',
        description: 'Professional Certificate in IT Automation using Python.',
        thumbnail: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/google-it-automation.jpg',
        platform: 'coursera',
        category: 'technology',
        level: 'beginner',
        duration: '6 months',
        rating: 4.7,
        enrollments: 500000,
        instructor: 'Google',
        isFree: true, // Free trials available
        originalUrl: 'https://www.coursera.org/professional-certificates/google-it-automation',
        affiliateUrl: 'https://www.coursera.org/professional-certificates/google-it-automation?referralCode=YOUR_CODE',
        tags: ['python', 'it', 'google', 'automation'],
        affiliateCommission: 15,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        featured: true
    },
    {
        id: 'youtube-js-crash',
        title: 'JavaScript Crash Course for Beginners',
        description: 'Learn JavaScript programming from scratch. Free full course.',
        thumbnail: 'https://img.youtube.com/vi/hdI2bqOjy3c/maxresdefault.jpg',
        platform: 'youtube',
        category: 'development',
        level: 'beginner',
        duration: '3.5 hours',
        rating: 4.9,
        instructor: 'Web Dev Simplified',
        isFree: true,
        originalUrl: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
        affiliateUrl: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
        tags: ['javascript', 'web development', 'programming'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    {
        id: 'youtube-react-native',
        title: 'React Native Full Course',
        description: 'Complete React Native tutorial for mobile app development.',
        thumbnail: 'https://img.youtube.com/vi/fOJKQdO_LqE/maxresdefault.jpg',
        platform: 'youtube',
        category: 'development',
        level: 'intermediate',
        duration: '6 hours',
        rating: 4.8,
        instructor: 'Programming with Mash',
        isFree: true,
        originalUrl: 'https://www.youtube.com/watch?v=fOJKQdO_LqE',
        affiliateUrl: 'https://www.youtube.com/watch?v=fOJKQdO_LqE',
        tags: ['react native', 'mobile', 'javascript'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        featured: true
    },
    // ============================================
    // DATA SCIENCE
    // ============================================
    {
        id: 'coursera-dsIBM',
        title: 'Data Science Professional Certificate',
        description: 'Launch your career in Data Science. IBM Professional Certificate.',
        thumbnail: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/professional-certificate.png',
        platform: 'coursera',
        category: 'data_science',
        level: 'beginner',
        duration: '11 months',
        rating: 4.6,
        enrollments: 800000,
        instructor: 'IBM',
        isFree: true,
        originalUrl: 'https://www.coursera.org/professional-certificates/ibm-data-science',
        affiliateUrl: 'https://www.coursera.org/professional-certificates/ibm-data-science?referralCode=YOUR_CODE',
        tags: ['data science', 'python', 'machine learning', 'ibm'],
        affiliateCommission: 15,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        featured: true
    },
    {
        id: 'edx-data-science',
        title: 'Data Science Fundamentals',
        description: 'Introduction to Data Science by Microsoft.',
        thumbnail: 'https://prod-discovery.edx-hdr.s3.amazonaws.com/course/card/image/691b7b7f-1f36-4c9b-bc44-6675fd8ae17f-ae45f06c1949.jpg',
        platform: 'edx',
        category: 'data_science',
        level: 'beginner',
        duration: '6 weeks',
        rating: 4.5,
        instructor: 'Microsoft',
        isFree: true,
        originalUrl: 'https://www.edx.org/learn/data-science/microsoft-dat210x-introduction-to-data-science',
        affiliateUrl: 'https://www.edx.org/course/data-science?utm_source=affiliates',
        tags: ['data science', 'excel', 'analytics'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // BUSINESS & ENTREPRENEURSHIP
    // ============================================
    {
        id: 'coursera-entrepreneurship',
        title: 'Entrepreneurship: Launching an Innovative Business',
        description: 'Specialization by University of Maryland. Learn to start your business.',
        thumbnail: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/umd-entrepreneurship.jpg',
        platform: 'coursera',
        category: 'entrepreneurship',
        level: 'beginner',
        duration: '4 months',
        rating: 4.7,
        enrollments: 150000,
        instructor: 'University of Maryland',
        isFree: true,
        originalUrl: 'https://www.coursera.org/specializations/entrepreneurship',
        affiliateUrl: 'https://www.coursera.org/specializations/entrepreneurship?referralCode=YOUR_CODE',
        tags: ['business', 'startup', 'innovation'],
        affiliateCommission: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    {
        id: 'linkedin-business-foundation',
        title: 'Business Foundations',
        description: 'Core business skills for professionals.',
        thumbnail: 'https://media.licdn.com/dms/image/C4E0DAQEuJgJMYuF5cQ/learning-public-crop_675_1200/0/1630720306541?e=2147483647&v=beta&t=XXX',
        platform: 'linkedin',
        category: 'business',
        level: 'all',
        duration: '10 hours',
        rating: 4.6,
        instructor: 'Various Experts',
        isFree: false,
        originalUrl: 'https://www.linkedin.com/learning/topics/business-foundations',
        affiliateUrl: 'https://www.linkedin.com/learning/topics/business-foundations?trk=affiliation',
        tags: ['business', 'management', 'leadership'],
        affiliateCommission: 5,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // DESIGN
    // ============================================
    {
        id: 'coursera-ui-ux',
        title: 'UI/UX Design Specialization',
        description: 'Complete UI/UX Design course by CalArts.',
        thumbnail: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/calarts-ux-design.jpg',
        platform: 'coursera',
        category: 'design',
        level: 'beginner',
        duration: '4 months',
        rating: 4.8,
        enrollments: 300000,
        instructor: 'California Institute of the Arts',
        isFree: true,
        originalUrl: 'https://www.coursera.org/specializations/ui-ux-design',
        affiliateUrl: 'https://www.coursera.org/specializations/ui-ux-design?referralCode=YOUR_CODE',
        tags: ['ui', 'ux', 'design', 'figma'],
        affiliateCommission: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        featured: true
    },
    {
        id: 'youtube-design-course',
        title: 'Graphic Design Full Course',
        description: 'Learn graphic design fundamentals. Complete free course.',
        thumbnail: 'https://img.youtube.com/vi/W9NZCfoGNzU/maxresdefault.jpg',
        platform: 'youtube',
        category: 'design',
        level: 'beginner',
        duration: '4 hours',
        rating: 4.7,
        instructor: 'Envato Tuts+',
        isFree: true,
        originalUrl: 'https://www.youtube.com/watch?v=W9NZCfoGNzU',
        affiliateUrl: 'https://www.youtube.com/watch?v=W9NZCfoGNzU',
        tags: ['design', 'graphic design', 'photoshop'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // MARKETING
    // ============================================
    {
        id: 'coursera-digital-marketing',
        title: 'Digital Marketing Specialization',
        description: 'Master digital marketing with this University of Illinois program.',
        thumbnail: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/digital-marketing.jpg',
        platform: 'coursera',
        category: 'marketing',
        level: 'intermediate',
        duration: '4 months',
        rating: 4.6,
        enrollments: 200000,
        instructor: 'University of Illinois',
        isFree: true,
        originalUrl: 'https://www.coursera.org/specializations/digital-marketing',
        affiliateUrl: 'https://www.coursera.org/specializations/digital-marketing?referralCode=YOUR_CODE',
        tags: ['marketing', 'seo', 'social media', 'analytics'],
        affiliateCommission: 12,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // SOFT SKILLS
    // ============================================
    {
        id: 'linkedin-communication',
        title: 'Communicating with Confidence',
        description: 'Improve your communication skills for professional success.',
        thumbnail: 'https://media.licdn.com/dms/image/C4E0DAQG3J5K_L7B8Bw/learning-public-crop_675_1200/0/1620636076416?e=2147483647&v=beta&t=XXX',
        platform: 'linkedin',
        category: 'soft_skills',
        level: 'all',
        duration: '1 hour',
        rating: 4.7,
        instructor: 'Jeff Ansell',
        isFree: false,
        originalUrl: 'https://www.linkedin.com/learning/communicating-with-confidence',
        affiliateUrl: 'https://www.linkedin.com/learning/communicating-with-confidence?trk=affiliation',
        tags: ['communication', 'soft skills', 'professional'],
        affiliateCommission: 5,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // LANGUAGES
    // ============================================
    {
        id: 'coursera-english',
        title: 'English for Career Development',
        description: 'Learn English skills for professional communication.',
        thumbnail: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/ups-english-career.jpg',
        platform: 'coursera',
        category: 'languages',
        level: 'beginner',
        duration: '5 months',
        rating: 4.8,
        enrollments: 500000,
        instructor: 'University of Pennsylvania',
        isFree: true,
        originalUrl: 'https://www.coursera.org/learn/english-career-development',
        affiliateUrl: 'https://www.coursera.org/learn/english-career-development?referralCode=YOUR_CODE',
        tags: ['english', 'language', 'communication'],
        affiliateCommission: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // KHAN ACADEMY (All Free)
    // ============================================
    {
        id: 'khan-math',
        title: 'Math: Algebra I',
        description: 'Learn Algebra from basics to advanced. Completely free.',
        thumbnail: 'https://cdn.kastatic.org/googleusercontent/jEwJYlWF0fJv2p-3a8hJOqBaDxnLqz1KSDQbYgRYdp6f8_kFOWjNQ1DGg_LdEYSAq3=w1632',
        platform: 'khan_academy',
        category: 'technology',
        level: 'beginner',
        duration: 'Self-paced',
        rating: 4.9,
        instructor: 'Sal Khan',
        isFree: true,
        originalUrl: 'https://www.khanacademy.org/math/algebra',
        affiliateUrl: 'https://www.khanacademy.org/math/algebra',
        tags: ['math', 'algebra', 'education'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    // ============================================
    // SKILLSHARE
    // ============================================
    {
        id: 'skillshare-freelance',
        title: 'Freelancing Essentials',
        description: 'Learn how to start and grow your freelance career.',
        thumbnail: 'https://process.fs.skillshare.com/image/upload/v1/course_project_thumbnail/e2b78c0c7452bec523e2a4d9c51a05d0a/thumbnail_256.jpg',
        platform: 'skillshare',
        category: 'entrepreneurship',
        level: 'beginner',
        duration: '2 hours',
        rating: 4.5,
        instructor: 'Various Experts',
        isFree: false,
        originalUrl: 'https://www.skillshare.com/en/classes/Freelancing-Essentials-Get-Started-as-a-Freelancer/123456789',
        affiliateUrl: 'https://www.skillshare.com/en/skill-sharing/referral?ref=YOUR_CODE',
        tags: ['freelancing', 'business', 'career'],
        affiliateCommission: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
];

/**
 * Get courses by category
 */
export function getCoursesByCategory(category: CourseCategory): Course[] {
    return COURSE_CATALOG.filter(course => course.category === category);
}

/**
 * Get courses by platform
 */
export function getCoursesByPlatform(platform: CoursePlatform): Course[] {
    return COURSE_CATALOG.filter(course => course.platform === platform);
}

/**
 * Get featured courses
 */
export function getFeaturedCourses(): Course[] {
    return COURSE_CATALOG.filter(course => course.featured);
}

/**
 * Get free courses only
 */
export function getFreeCourses(): Course[] {
    return COURSE_CATALOG.filter(course => course.isFree);
}

/**
 * Get course by ID
 */
export function getCourseById(id: string): Course | undefined {
    return COURSE_CATALOG.find(course => course.id === id);
}

/**
 * Search courses by keyword
 */
export function searchCourses(query: string): Course[] {
    const lowerQuery = query.toLowerCase();
    return COURSE_CATALOG.filter(course =>
        course.title.toLowerCase().includes(lowerQuery) ||
        course.description.toLowerCase().includes(lowerQuery) ||
        course.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Filter courses with multiple criteria
 */
export interface CourseFilters {
    category?: CourseCategory;
    platform?: CoursePlatform;
    level?: CourseLevel;
    isFree?: boolean;
    searchQuery?: string;
}

export function filterCourses(filters: CourseFilters): Course[] {
    let filtered = [...COURSE_CATALOG];

    if (filters.category) {
        filtered = filtered.filter(c => c.category === filters.category);
    }
    if (filters.platform) {
        filtered = filtered.filter(c => c.platform === filters.platform);
    }
    if (filters.level) {
        filtered = filtered.filter(c => c.level === filters.level || c.level === 'all');
    }
    if (filters.isFree !== undefined) {
        filtered = filtered.filter(c => c.isFree === filters.isFree);
    }
    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            c.tags.some(t => t.toLowerCase().includes(query))
        );
    }

    return filtered;
}

/**
 * Get affiliate URL for a course
 * Falls back to original URL if no affiliate URL is set
 */
export function getCourseUrl(course: Course): string {
    // TODO: Replace 'YOUR_CODE' with actual affiliate IDs from environment
    // For now, return original URL
    return course.affiliateUrl?.replace('YOUR_CODE', '') || course.originalUrl;
}

/**
 * Track course click for analytics and affiliate
 */
export async function trackCourseClick(
    userId: string | undefined,
    courseId: string,
    platform: CoursePlatform
): Promise<void> {
    try {
        const { error } = await supabase.from('course_clicks').insert({
            user_id: userId,
            course_id: courseId,
            platform: platform,
            clicked_at: new Date().toISOString(),
            converted: false // Will update if user enrolls
        });

        if (error) {
            console.warn('Failed to track course click:', error.message);
        }
    } catch (error) {
        console.warn('Error tracking course click:', error);
    }
}

/**
 * Get click statistics for analytics
 */
export async function getClickStats(userId?: string) {
    try {
        let query = supabase.from('course_clicks').select('*');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching click stats:', error);
        return [];
    }
}

/**
 * Get platform-wise click distribution
 */
export async function getPlatformStats() {
    try {
        const { data, error } = await supabase
            .from('course_clicks')
            .select('platform');

        if (error) throw error;

        const stats: Record<string, number> = {};
        data?.forEach(click => {
            stats[click.platform] = (stats[click.platform] || 0) + 1;
        });

        return stats;
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        return {};
    }
}

/**
 * Save user's enrolled course
 */
export async function enrollCourse(userId: string, courseId: string) {
    try {
        const { error } = await supabase.from('user_courses').insert({
            user_id: userId,
            course_id: courseId,
            enrolled_at: new Date().toISOString(),
            progress_percentage: 0
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error enrolling course:', error);
        return { success: false, error };
    }
}

/**
 * Get user's enrolled courses
 */
export async function getUserEnrollments(userId: string) {
    try {
        const { data, error } = await supabase
            .from('user_courses')
            .select('*, courses(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        return [];
    }
}
