/**
 * Smart Matching Algorithm for Kaam Deu
 * Ranks profiles based on compatibility scores
 */

import { UserProfile } from '../services/database';
import { MatchScore } from '../types';

// Re-export MatchScore for convenience
export type { MatchScore };

// Scoring weights (must sum to 1.0)
const WEIGHTS = {
    SKILL_MATCH: 0.35,      // 35% - Skills alignment
    LOCATION_MATCH: 0.25,   // 25% - Location proximity
    SALARY_FIT: 0.20,       // 20% - Salary compatibility
    EXPERIENCE: 0.10,       // 10% - Experience relevance
    AVAILABILITY: 0.05,     // 5% - Availability status
    PROFILE_QUALITY: 0.05,  // 5% - Profile completeness
};

// Location coordinates for major Nepal cities (approximate)
// Exported for distance calculation in other components
export const NEPAL_LOCATIONS: Record<string, { lat: number; lng: number }> = {
    'kathmandu': { lat: 27.7172, lng: 85.3240 },
    'pokhara': { lat: 28.2096, lng: 83.9856 },
    'lalitpur': { lat: 27.6644, lng: 85.3188 },
    'bhaktapur': { lat: 27.6710, lng: 85.4298 },
    'biratnagar': { lat: 26.4525, lng: 87.2718 },
    'birgunj': { lat: 27.0104, lng: 84.8821 },
    'bharatpur': { lat: 27.6833, lng: 84.4333 },
    'butwal': { lat: 27.7006, lng: 83.4483 },
    'dharan': { lat: 26.8065, lng: 87.2846 },
    'hetauda': { lat: 27.4167, lng: 85.0333 },
};

export interface RankedProfile extends UserProfile {
    matchScore: MatchScore;
}

/**
 * Calculate distance between two locations in km (Haversine formula)
 * Exported for use in FeedScreen distance display
 */
export function calculateDistance(loc1: string, loc2: string): number {
    const coords1 = NEPAL_LOCATIONS[loc1.toLowerCase()];
    const coords2 = NEPAL_LOCATIONS[loc2.toLowerCase()];

    if (!coords1 || !coords2) {
        // If location not found, return moderate distance
        return loc1.toLowerCase() === loc2.toLowerCase() ? 0 : 50;
    }

    const R = 6371; // Earth's radius in km
    const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
    const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate skill match score between worker skills and business hiring needs
 */
function calculateSkillMatch(
    workerSkills: string[],
    businessHiringNeeds: string[]
): number {
    if (!workerSkills?.length || !businessHiringNeeds?.length) {
        return 50; // Neutral score if no data
    }

    const normalizedWorkerSkills = workerSkills.map(s => s.toLowerCase().trim());
    const normalizedBusinessNeeds = businessHiringNeeds.map(s => s.toLowerCase().trim());

    let matchCount = 0;
    for (const skill of normalizedWorkerSkills) {
        for (const need of normalizedBusinessNeeds) {
            // Exact match or partial match
            if (skill === need || skill.includes(need) || need.includes(skill)) {
                matchCount++;
                break;
            }
        }
    }

    // Guard against division by zero
    if (normalizedWorkerSkills.length === 0 || normalizedBusinessNeeds.length === 0) {
        return 50; // Neutral if no skills data
    }

    // Score based on percentage of skills that match
    const matchPercentage = (matchCount / normalizedWorkerSkills.length) * 100;

    // Bonus if worker has more matching skills than needed
    const coverageBonus = Math.min(matchCount / normalizedBusinessNeeds.length, 1) * 20;

    return Math.min(matchPercentage + coverageBonus, 100);
}

/**
 * Calculate location match score
 */
function calculateLocationMatch(
    workerLocation: string,
    workerPreferredLocations: string[],
    businessLocation: string,
    willingToRelocate: boolean
): number {
    if (!workerLocation || !businessLocation) {
        return 50; // Neutral if no location data
    }

    const distance = calculateDistance(workerLocation, businessLocation);

    // Same city = perfect match
    if (distance < 5) return 100;

    // Within preferred locations
    if (workerPreferredLocations?.some(loc =>
        loc.toLowerCase() === businessLocation.toLowerCase()
    )) {
        return 90;
    }

    // Willing to relocate gives bonus
    const relocateBonus = willingToRelocate ? 20 : 0;

    // Score decreases with distance
    if (distance < 20) return 80 + relocateBonus;
    if (distance < 50) return 60 + relocateBonus;
    if (distance < 100) return 40 + relocateBonus;
    if (distance < 200) return 20 + relocateBonus;

    return Math.max(10, relocateBonus);
}

/**
 * Calculate salary compatibility score
 */
function calculateSalaryFit(
    workerMinSalary: number | undefined,
    workerMaxSalary: number | undefined,
    businessOfferedMin?: number,
    businessOfferedMax?: number
): number {
    // If no salary data, return neutral
    if (!workerMinSalary && !workerMaxSalary) return 50;

    // If business has no salary range, check if worker salary is reasonable
    if (!businessOfferedMin && !businessOfferedMax) {
        // Assume industry average range (15,000 - 60,000 NPR)
        const avgMin = 15000;
        const avgMax = 60000;
        const workerMid = ((workerMinSalary || 0) + (workerMaxSalary || 50000)) / 2;

        if (workerMid >= avgMin && workerMid <= avgMax) return 80;
        if (workerMid < avgMin) return 90; // Worker expects less
        return 50; // Worker expects more than average
    }

    const workerMid = ((workerMinSalary || 0) + (workerMaxSalary || workerMinSalary || 0)) / 2;
    const businessMid = ((businessOfferedMin || 0) + (businessOfferedMax || businessOfferedMin || 0)) / 2;

    // Perfect match if ranges overlap significantly
    const workerMin = workerMinSalary || 0;
    const workerMax = workerMaxSalary || workerMinSalary || 100000;
    const bizMin = businessOfferedMin || 0;
    const bizMax = businessOfferedMax || businessOfferedMin || 100000;

    // Check overlap
    const overlapStart = Math.max(workerMin, bizMin);
    const overlapEnd = Math.min(workerMax, bizMax);

    if (overlapStart <= overlapEnd) {
        // There's overlap - calculate how much
        const overlapRange = overlapEnd - overlapStart;
        const workerRange = workerMax - workerMin || 1;
        const overlapPercentage = (overlapRange / workerRange) * 100;
        return Math.min(overlapPercentage + 50, 100);
    }

    // No overlap - calculate how far apart
    const gap = workerMin > bizMax
        ? ((workerMin - bizMax) / workerMin) * 100
        : ((bizMin - workerMax) / bizMin) * 100;

    return Math.max(0, 50 - gap);
}

/**
 * Calculate experience relevance score
 */
function calculateExperienceScore(
    workerExperience: number | undefined,
    preferredMinExp?: number,
    preferredMaxExp?: number
): number {
    const exp = workerExperience || 0;

    // If no preference, any experience is fine
    if (!preferredMinExp && !preferredMaxExp) {
        // More experience is generally better, up to a point
        if (exp === 0) return 60;
        if (exp <= 2) return 70;
        if (exp <= 5) return 85;
        if (exp <= 10) return 95;
        return 100;
    }

    const minExp = preferredMinExp || 0;
    const maxExp = preferredMaxExp || 20;

    // Perfect match within range
    if (exp >= minExp && exp <= maxExp) return 100;

    // Slightly under/over
    if (exp < minExp) {
        const diff = minExp - exp;
        return Math.max(0, 100 - diff * 15);
    }

    // Over-qualified (slight penalty)
    const overExp = exp - maxExp;
    return Math.max(60, 100 - overExp * 5);
}

/**
 * Calculate availability score
 */
function calculateAvailabilityScore(
    availability: string | undefined
): number {
    switch (availability?.toLowerCase()) {
        case 'available':
            return 100;
        case 'looking':
            return 80;
        case 'employed':
            return 40;
        default:
            return 50;
    }
}

/**
 * Calculate profile quality/completeness score
 * Incomplete profiles get significantly lower scores to encourage completion
 */
function calculateProfileQuality(profile: UserProfile): number {
    let score = 0;
    const checkField = (field: any, points: number) => {
        if (field && (typeof field !== 'object' || (Array.isArray(field) && field.length > 0))) {
            score += points;
        }
    };

    // Common fields
    checkField(profile.name, 10);
    checkField(profile.photo_url, 15);
    checkField(profile.photos?.length, 10);

    // Worker-specific
    if (profile.role === 'worker') {
        checkField(profile.job_title, 10);
        checkField(profile.bio, 10);
        checkField(profile.skills?.length, 15);
        checkField(profile.experience_years, 10);
        checkField(profile.current_location, 10);
        checkField(profile.expected_salary_min || profile.expected_salary_max, 10);
    }

    // Business-specific
    if (profile.role === 'business') {
        checkField(profile.company_name, 10);
        checkField(profile.description, 10);
        checkField(profile.industry, 10);
        checkField(profile.location, 10);
        checkField(profile.typically_hiring?.length, 15);
        checkField(profile.benefits_offered?.length, 10);
    }

    // Apply penalty for incomplete profiles (is_profile_complete: false)
    // This ensures LinkedIn/OAuth users who haven't completed setup rank lower
    if (!profile.is_profile_complete) {
        score = Math.floor(score * 0.6); // 40% penalty for incomplete profiles
    }

    return Math.min(score, 100);
}

/**
 * Check if a profile is considered "partial" (from OAuth without full setup)
 */
export function isPartialProfile(profile: UserProfile): boolean {
    return !profile.is_profile_complete;
}

/**
 * Calculate overall match score for a worker viewing a business
 */
function scoreBusinessForWorker(
    worker: UserProfile,
    business: UserProfile
): MatchScore {
    const skillMatch = calculateSkillMatch(
        worker.skills || [],
        business.typically_hiring || []
    );

    const locationMatch = calculateLocationMatch(
        worker.current_location || '',
        worker.preferred_locations || [],
        business.location || '',
        worker.willing_to_relocate || false
    );

    const salaryFit = calculateSalaryFit(
        worker.expected_salary_min,
        worker.expected_salary_max
        // Business typically doesn't store salary range in profile
    );

    const experienceScore = calculateExperienceScore(worker.experience_years);
    const availabilityScore = calculateAvailabilityScore(worker.availability);
    const profileQuality = calculateProfileQuality(business);

    const overall = Math.round(
        skillMatch * WEIGHTS.SKILL_MATCH +
        locationMatch * WEIGHTS.LOCATION_MATCH +
        salaryFit * WEIGHTS.SALARY_FIT +
        experienceScore * WEIGHTS.EXPERIENCE +
        availabilityScore * WEIGHTS.AVAILABILITY +
        profileQuality * WEIGHTS.PROFILE_QUALITY
    );

    return {
        overall,
        skillMatch: Math.round(skillMatch),
        locationMatch: Math.round(locationMatch),
        salaryFit: Math.round(salaryFit),
        experienceScore: Math.round(experienceScore),
        availabilityScore: Math.round(availabilityScore),
        profileQuality: Math.round(profileQuality),
    };
}

/**
 * Calculate overall match score for a business viewing a worker
 */
function scoreWorkerForBusiness(
    business: UserProfile,
    worker: UserProfile
): MatchScore {
    const skillMatch = calculateSkillMatch(
        worker.skills || [],
        business.typically_hiring || []
    );

    const locationMatch = calculateLocationMatch(
        worker.current_location || '',
        worker.preferred_locations || [],
        business.location || '',
        worker.willing_to_relocate || false
    );

    const salaryFit = calculateSalaryFit(
        worker.expected_salary_min,
        worker.expected_salary_max
    );

    const experienceScore = calculateExperienceScore(worker.experience_years);
    const availabilityScore = calculateAvailabilityScore(worker.availability);
    const profileQuality = calculateProfileQuality(worker);

    const overall = Math.round(
        skillMatch * WEIGHTS.SKILL_MATCH +
        locationMatch * WEIGHTS.LOCATION_MATCH +
        salaryFit * WEIGHTS.SALARY_FIT +
        experienceScore * WEIGHTS.EXPERIENCE +
        availabilityScore * WEIGHTS.AVAILABILITY +
        profileQuality * WEIGHTS.PROFILE_QUALITY
    );

    return {
        overall,
        skillMatch: Math.round(skillMatch),
        locationMatch: Math.round(locationMatch),
        salaryFit: Math.round(salaryFit),
        experienceScore: Math.round(experienceScore),
        availabilityScore: Math.round(availabilityScore),
        profileQuality: Math.round(profileQuality),
    };
}

/**
 * Main function: Rank profiles by match score
 */
export function rankProfiles(
    currentUserProfile: UserProfile,
    candidateProfiles: UserProfile[]
): RankedProfile[] {
    const currentRole = currentUserProfile.role;

    const rankedProfiles = candidateProfiles.map(candidate => {
        const matchScore = currentRole === 'worker'
            ? scoreBusinessForWorker(currentUserProfile, candidate)
            : scoreWorkerForBusiness(currentUserProfile, candidate);

        return {
            ...candidate,
            matchScore,
        };
    });

    // Sort by overall match score (highest first)
    rankedProfiles.sort((a, b) => b.matchScore.overall - a.matchScore.overall);

    return rankedProfiles;
}

/**
 * Get match score label based on score value
 */
export function getMatchLabel(score: number): {
    label: string;
    color: string;
    emoji: string;
} {
    if (score >= 90) return { label: 'Excellent Match', color: '#2ECC71', emoji: '🔥' };
    if (score >= 75) return { label: 'Great Match', color: '#27AE60', emoji: '⭐' };
    if (score >= 60) return { label: 'Good Match', color: '#C9A962', emoji: '👍' };
    if (score >= 40) return { label: 'Fair Match', color: '#F39C12', emoji: '🤔' };
    return { label: 'Low Match', color: '#95A5A6', emoji: '📊' };
}

/**
 * Get top reasons why profiles match
 */
export function getMatchReasons(score: MatchScore, role: 'worker' | 'business'): string[] {
    const reasons: string[] = [];

    if (score.skillMatch >= 70) {
        reasons.push(role === 'worker' ? 'Skills align with hiring needs' : 'Has relevant skills');
    }
    if (score.locationMatch >= 80) {
        reasons.push('Convenient location');
    }
    if (score.salaryFit >= 70) {
        reasons.push('Salary expectations match');
    }
    if (score.experienceScore >= 80) {
        reasons.push(role === 'worker' ? 'Good experience level' : 'Has the experience you need');
    }
    if (score.availabilityScore >= 80) {
        reasons.push('Available now');
    }
    if (score.profileQuality >= 80) {
        reasons.push('Complete profile');
    }

    return reasons.slice(0, 3); // Return top 3 reasons
}
