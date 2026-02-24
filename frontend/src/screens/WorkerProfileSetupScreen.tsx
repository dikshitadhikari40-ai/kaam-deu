import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { EmploymentType, AvailabilityStatus } from '../types';
import PhotoPicker from '../components/PhotoPicker';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Step configuration with icons and titles
const STEP_CONFIG = [
    { icon: 'person', title: 'About You', subtitle: 'Photos & basic info' },
    { icon: 'construct', title: 'Skills', subtitle: 'What can you do?' },
    { icon: 'briefcase', title: 'Preferences', subtitle: 'How you want to work' },
    { icon: 'location', title: 'Location', subtitle: 'Where & salary' },
];

const NEPAL_LOCATIONS = [
    'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar',
    'Birgunj', 'Bharatpur', 'Butwal', 'Dharan', 'Hetauda',
];

const COMMON_SKILLS = [
    'Driving', 'Cooking', 'Plumbing', 'Electrical', 'Carpentry',
    'Painting', 'Cleaning', 'Security', 'Delivery', 'Customer Service',
    'Sales', 'Data Entry', 'Accounting', 'Teaching', 'Healthcare',
];

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'daily_wage', label: 'Daily Wage' },
];

type Step = 1 | 2 | 3 | 4;

export default function WorkerProfileSetupScreen({ navigation: _navigation }: { navigation: any }) {
    const { user, updateProfile, profile, completeProfile } = useAuth();
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Animation values
    const successScale = useSharedValue(0);
    const successOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(1);
    const stepTranslateX = useSharedValue(0);

    // Animated styles
    const successAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: successScale.value }],
        opacity: successOpacity.value,
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateX: stepTranslateX.value }],
    }));

    // Trigger success animation
    const triggerSuccessAnimation = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
        contentOpacity.value = withTiming(0, { duration: 200 });
        successOpacity.value = withTiming(1, { duration: 300 });
        successScale.value = withSequence(
            withSpring(1.2, { damping: 10, stiffness: 100 }),
            withSpring(1, { damping: 15, stiffness: 150 })
        );
    };

    // Step transition animation
    const animateStepTransition = (direction: 'next' | 'back') => {
        const offset = direction === 'next' ? -30 : 30;
        stepTranslateX.value = offset;
        contentOpacity.value = 0.5;
        stepTranslateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        contentOpacity.value = withTiming(1, { duration: 200 });
    };

    // Step 1: Basic Info & Photos
    const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
    const [jobTitle, setJobTitle] = useState(profile?.job_title || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [experienceYears, setExperienceYears] = useState(
        profile?.experience_years?.toString() || '0'
    );

    // Step 2: Skills
    const [skills, setSkills] = useState<string[]>(profile?.skills || []);
    const [customSkill, setCustomSkill] = useState('');

    // Step 3: Work Preferences
    const [preferredEmployment, setPreferredEmployment] = useState<EmploymentType[]>(
        (profile?.preferred_employment as EmploymentType[]) || ['full_time']
    );
    const [availability, setAvailability] = useState<AvailabilityStatus>(
        (profile?.availability as AvailabilityStatus) || 'available'
    );
    const [willingToRelocate, setWillingToRelocate] = useState(
        profile?.willing_to_relocate ?? false
    );

    // Step 4: Salary & Location
    const [currentLocation, setCurrentLocation] = useState(profile?.current_location || '');
    const [preferredLocations, setPreferredLocations] = useState<string[]>(
        profile?.preferred_locations || []
    );
    const [salaryMin, setSalaryMin] = useState(
        profile?.expected_salary_min?.toString() || ''
    );
    const [salaryMax, setSalaryMax] = useState(
        profile?.expected_salary_max?.toString() || ''
    );
    const [isNegotiable, setIsNegotiable] = useState(
        false // Default to false - show salary inputs by default
    );

    // Validation errors state
    const [errors, setErrors] = useState<{
        currentLocation?: string;
        salaryMin?: string;
        salaryMax?: string;
        salaryRange?: string;
    }>({});

    // Clear specific error
    const clearError = (field: keyof typeof errors) => {
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    // Salary input handler - numeric only with formatting
    const handleSalaryChange = (value: string, setter: (val: string) => void, field: 'salaryMin' | 'salaryMax') => {
        // Remove non-numeric characters
        const numericValue = value.replace(/[^0-9]/g, '');
        setter(numericValue);
        clearError(field);
        clearError('salaryRange');
    };

    const totalSteps = 4;

    const toggleSkill = (skill: string) => {
        if (skills.includes(skill)) {
            setSkills(skills.filter(s => s !== skill));
        } else {
            setSkills([...skills, skill]);
        }
    };

    const addCustomSkill = () => {
        if (customSkill.trim() && !skills.includes(customSkill.trim())) {
            setSkills([...skills, customSkill.trim()]);
            setCustomSkill('');
        }
    };

    const toggleEmploymentType = (type: EmploymentType) => {
        if (preferredEmployment.includes(type)) {
            if (preferredEmployment.length > 1) {
                setPreferredEmployment(preferredEmployment.filter(t => t !== type));
            }
        } else {
            setPreferredEmployment([...preferredEmployment, type]);
        }
    };

    const togglePreferredLocation = (location: string) => {
        if (preferredLocations.includes(location)) {
            setPreferredLocations(preferredLocations.filter(l => l !== location));
        } else {
            setPreferredLocations([...preferredLocations, location]);
        }
    };

    const validateStep = (): boolean => {
        switch (currentStep) {
            case 1:
                if (!jobTitle.trim()) {
                    Alert.alert('Required', 'Please enter your job title');
                    return false;
                }
                return true;
            case 2:
                if (skills.length === 0) {
                    Alert.alert('Required', 'Please select at least one skill');
                    return false;
                }
                return true;
            case 3:
                return true;
            case 4: {
                const newErrors: typeof errors = {};
                let isValid = true;

                // Validate current location (required)
                if (!currentLocation) {
                    newErrors.currentLocation = 'Please select your current location';
                    isValid = false;
                }

                // Validate salary if not negotiable
                if (!isNegotiable) {
                    const minVal = parseInt(salaryMin) || 0;
                    const maxVal = parseInt(salaryMax) || 0;

                    // Check minimum bounds (reasonable salary in NPR)
                    if (salaryMin && minVal < 5000) {
                        newErrors.salaryMin = 'Minimum salary should be at least Rs. 5,000';
                        isValid = false;
                    }
                    if (salaryMin && minVal > 1000000) {
                        newErrors.salaryMin = 'Please enter a valid salary amount';
                        isValid = false;
                    }

                    // Check max bounds
                    if (salaryMax && maxVal > 10000000) {
                        newErrors.salaryMax = 'Please enter a valid salary amount';
                        isValid = false;
                    }

                    // Check min <= max
                    if (salaryMin && salaryMax && minVal > maxVal) {
                        newErrors.salaryRange = 'Minimum salary cannot be greater than maximum';
                        isValid = false;
                    }
                }

                setErrors(newErrors);

                if (!isValid) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }

                return isValid;
            }
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep()) {
            if (currentStep < totalSteps) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                animateStepTransition('next');
                setCurrentStep((currentStep + 1) as Step);
            } else {
                handleSubmit();
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            animateStepTransition('back');
            setCurrentStep((currentStep - 1) as Step);
        }
    };

    const handleSkip = () => {
        // Show confirmation on step 4 (final step) with required fields missing
        if (currentStep === totalSteps) {
            const missingFields: string[] = [];
            if (!currentLocation) missingFields.push('Current Location');
            if (!jobTitle.trim()) missingFields.push('Job Title');
            if (skills.length === 0) missingFields.push('Skills');

            if (missingFields.length > 0) {
                Alert.alert(
                    'Complete Your Profile?',
                    `You haven't filled in: ${missingFields.join(', ')}.\n\nYour profile may not appear in employer searches. Continue anyway?`,
                    [
                        { text: 'Go Back', style: 'cancel' },
                        {
                            text: 'Skip Anyway',
                            style: 'destructive',
                            onPress: handleSubmit
                        }
                    ]
                );
                return;
            }
        }
        handleSubmit();
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            console.log('WorkerProfileSetupScreen: Starting profile submit...');
            console.log('WorkerProfileSetupScreen: User ID:', user?.id);

            if (!user?.id) {
                console.error('WorkerProfileSetupScreen: No user ID - cannot save profile');
                Alert.alert('Error', 'You must be logged in to save your profile.');
                setLoading(false);
                return;
            }

            const profileData = {
                ...profile,
                id: user.id, // FIXED: Explicitly set ID from authenticated user
                role: 'worker' as const,
                // FIXED: Set name field for display in feed - use existing name, job title, or fallback
                name: profile?.name || user?.name || jobTitle || 'Worker',
                photos,
                photo_url: photos.length > 0 ? photos[0] : undefined,
                job_title: jobTitle || 'Worker',
                bio,
                skills,
                experience_years: parseInt(experienceYears) || 0,
                preferred_employment: preferredEmployment,
                availability,
                willing_to_relocate: willingToRelocate,
                current_location: currentLocation,
                preferred_locations: preferredLocations,
                expected_salary_min: isNegotiable ? undefined : (salaryMin ? parseInt(salaryMin) : undefined),
                expected_salary_max: isNegotiable ? undefined : (salaryMax ? parseInt(salaryMax) : undefined),
                salary_negotiable: isNegotiable,
                is_profile_complete: true,
                updated_at: new Date().toISOString(),
            };

            console.log('WorkerProfileSetupScreen: Calling updateProfile with data:', JSON.stringify(profileData, null, 2));

            await updateProfile(profileData);
            console.log('WorkerProfileSetupScreen: Profile updated successfully!');

            // Show success animation before navigation takes over
            triggerSuccessAnimation();
        } catch (error: any) {
            console.error('WorkerProfileSetupScreen: Error saving profile:', error?.message || error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Show actual error message for debugging, with option to proceed anyway
            const errorMessage = error?.message || 'Unknown error';
            Alert.alert(
                'Profile Save Error',
                `${errorMessage}\n\nYou can try again or continue anyway.`,
                [
                    {
                        text: 'Try Again',
                        style: 'cancel',
                    },
                    {
                        text: 'Continue Anyway',
                        onPress: () => {
                            console.log('WorkerProfileSetupScreen: User confirmed, calling completeProfile...');
                            completeProfile();
                        }
                    }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Tell us about yourself</Text>
                        <Text style={styles.stepSubtitle}>
                            Help employers find you with the right information
                        </Text>

                        <PhotoPicker
                            photos={photos}
                            onPhotosChange={setPhotos}
                            maxPhotos={5}
                            title="Profile Photos"
                            subtitle="Add photos to make your profile stand out"
                        />

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Job Title / Profession *</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="briefcase" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Driver, Cook, Electrician"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={jobTitle}
                                    onChangeText={setJobTitle}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Years of Experience</Text>
                            <View style={styles.experienceContainer}>
                                <TouchableOpacity
                                    style={styles.expButton}
                                    onPress={() => setExperienceYears(Math.max(0, parseInt(experienceYears) - 1).toString())}
                                >
                                    <Feather name="minus" size={20} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.expValueContainer}>
                                    <Text style={styles.expValue}>{experienceYears}</Text>
                                    <Text style={styles.expLabel}>years</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.expButton}
                                    onPress={() => setExperienceYears((parseInt(experienceYears) + 1).toString())}
                                >
                                    <Feather name="plus" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>About You (Optional)</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Tell employers about your experience, strengths, and what makes you a great hire..."
                                placeholderTextColor={theme.colors.textMuted}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                            />
                            <Text style={styles.charCount}>{bio.length}/500</Text>
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>What are your skills?</Text>
                        <Text style={styles.stepSubtitle}>
                            Select all skills that apply to you
                        </Text>

                        <View style={styles.skillsGrid}>
                            {COMMON_SKILLS.map((skill) => (
                                <TouchableOpacity
                                    key={skill}
                                    style={[
                                        styles.skillChip,
                                        skills.includes(skill) && styles.skillChipSelected
                                    ]}
                                    onPress={() => toggleSkill(skill)}
                                >
                                    <Text style={[
                                        styles.skillChipText,
                                        skills.includes(skill) && styles.skillChipTextSelected
                                    ]}>
                                        {skill}
                                    </Text>
                                    {skills.includes(skill) && (
                                        <Feather name="check" size={14} color="#fff" style={{ marginLeft: 4 }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Add Custom Skill</Text>
                            <View style={styles.customSkillContainer}>
                                <TextInput
                                    style={styles.customSkillInput}
                                    placeholder="Type a skill..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={customSkill}
                                    onChangeText={setCustomSkill}
                                    onSubmitEditing={addCustomSkill}
                                />
                                <TouchableOpacity
                                    style={styles.addSkillButton}
                                    onPress={addCustomSkill}
                                >
                                    <Feather name="plus" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {skills.length > 0 && (
                            <View style={styles.selectedSkills}>
                                <Text style={styles.selectedLabel}>
                                    Selected ({skills.length}):
                                </Text>
                                <View style={styles.selectedSkillsRow}>
                                    {skills.map((skill) => (
                                        <View key={skill} style={styles.selectedSkillTag}>
                                            <Text style={styles.selectedSkillText}>{skill}</Text>
                                            <TouchableOpacity onPress={() => toggleSkill(skill)}>
                                                <Feather name="x" size={14} color={theme.colors.accent} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Work Preferences</Text>
                        <Text style={styles.stepSubtitle}>
                            What type of work are you looking for?
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Employment Type</Text>
                            <View style={styles.optionsGrid}>
                                {EMPLOYMENT_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        style={[
                                            styles.optionCard,
                                            preferredEmployment.includes(type.value) && styles.optionCardSelected
                                        ]}
                                        onPress={() => toggleEmploymentType(type.value)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            preferredEmployment.includes(type.value) && styles.optionTextSelected
                                        ]}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Availability Status</Text>
                            <View style={styles.availabilityOptions}>
                                {[
                                    { value: 'available', label: 'Available Now', icon: 'check-circle' },
                                    { value: 'looking', label: 'Actively Looking', icon: 'search' },
                                    { value: 'employed', label: 'Currently Employed', icon: 'briefcase' },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.availabilityCard,
                                            availability === option.value && styles.availabilityCardSelected
                                        ]}
                                        onPress={() => setAvailability(option.value as AvailabilityStatus)}
                                    >
                                        <Feather
                                            name={option.icon as any}
                                            size={20}
                                            color={availability === option.value ? theme.colors.accent : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.availabilityText,
                                            availability === option.value && styles.availabilityTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.relocateToggle}
                            onPress={() => setWillingToRelocate(!willingToRelocate)}
                        >
                            <View style={styles.relocateLeft}>
                                <MaterialCommunityIcons
                                    name="map-marker-radius"
                                    size={24}
                                    color={willingToRelocate ? theme.colors.accent : theme.colors.textSecondary}
                                />
                                <View>
                                    <Text style={styles.relocateLabel}>Willing to Relocate</Text>
                                    <Text style={styles.relocateSub}>
                                        Open to opportunities in other cities
                                    </Text>
                                </View>
                            </View>
                            <View style={[
                                styles.checkbox,
                                willingToRelocate && styles.checkboxChecked
                            ]}>
                                {willingToRelocate && (
                                    <Feather name="check" size={14} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Location & Salary</Text>
                        <Text style={styles.stepSubtitle}>
                            Where do you want to work and what salary do you expect?
                        </Text>

                        {/* Current Location - Single Select */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Current Location *</Text>
                                <Text style={styles.labelHint}>(Select one)</Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={[
                                    styles.locationScroll,
                                    !!errors.currentLocation && styles.locationScrollError
                                ]}
                            >
                                {NEPAL_LOCATIONS.map((location) => (
                                    <TouchableOpacity
                                        key={location}
                                        style={[
                                            styles.locationChip,
                                            currentLocation === location && styles.locationChipSelected,
                                            !!errors.currentLocation && !currentLocation && styles.locationChipError
                                        ]}
                                        onPress={() => {
                                            setCurrentLocation(location);
                                            clearError('currentLocation');
                                        }}
                                    >
                                        <Feather
                                            name="map-pin"
                                            size={14}
                                            color={currentLocation === location ? theme.colors.text : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.locationChipText,
                                            currentLocation === location && styles.locationChipTextSelected
                                        ]}>
                                            {location}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {errors.currentLocation && (
                                <Text style={styles.errorText}>{errors.currentLocation}</Text>
                            )}
                        </View>

                        {/* Preferred Work Locations - Multi Select */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Preferred Work Locations</Text>
                                <Text style={styles.labelHint}>(Select multiple)</Text>
                            </View>
                            <View style={styles.prefLocationsGrid}>
                                {NEPAL_LOCATIONS.map((location) => (
                                    <TouchableOpacity
                                        key={location}
                                        style={[
                                            styles.prefLocationChip,
                                            preferredLocations.includes(location) && styles.prefLocationChipSelected
                                        ]}
                                        onPress={() => togglePreferredLocation(location)}
                                    >
                                        {preferredLocations.includes(location) && (
                                            <Feather name="check" size={12} color={theme.colors.accent} style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={[
                                            styles.prefLocationText,
                                            preferredLocations.includes(location) && styles.prefLocationTextSelected
                                        ]}>
                                            {location}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {preferredLocations.length > 0 && (
                                <Text style={styles.selectedCount}>
                                    {preferredLocations.length} location{preferredLocations.length !== 1 ? 's' : ''} selected
                                </Text>
                            )}
                        </View>

                        {/* Salary Section */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expected Monthly Salary</Text>

                            {/* Negotiable Toggle */}
                            <TouchableOpacity
                                style={styles.negotiableToggle}
                                onPress={() => {
                                    setIsNegotiable(!isNegotiable);
                                    if (!isNegotiable) {
                                        // Clear salary values when switching to negotiable
                                        setSalaryMin('');
                                        setSalaryMax('');
                                        setErrors(prev => ({ ...prev, salaryMin: undefined, salaryMax: undefined, salaryRange: undefined }));
                                    }
                                }}
                            >
                                <View style={[
                                    styles.checkbox,
                                    isNegotiable && styles.checkboxChecked
                                ]}>
                                    {isNegotiable && (
                                        <Feather name="check" size={14} color="#fff" />
                                    )}
                                </View>
                                <Text style={styles.negotiableText}>Salary is negotiable</Text>
                            </TouchableOpacity>

                            {/* Salary Range Inputs - disabled when negotiable */}
                            {!isNegotiable && (
                                <>
                                    <View style={styles.salaryContainer}>
                                        <View style={[
                                            styles.salaryInputWrapper,
                                            !!errors.salaryMin && styles.salaryInputError
                                        ]}>
                                            <Text style={styles.salaryPrefix}>Rs.</Text>
                                            <TextInput
                                                style={styles.salaryInput}
                                                placeholder="Minimum"
                                                placeholderTextColor={theme.colors.textMuted}
                                                value={salaryMin}
                                                onChangeText={(val) => handleSalaryChange(val, setSalaryMin, 'salaryMin')}
                                                keyboardType="number-pad"
                                                maxLength={8}
                                            />
                                        </View>
                                        <Text style={styles.salaryDivider}>to</Text>
                                        <View style={[
                                            styles.salaryInputWrapper,
                                            !!errors.salaryMax && styles.salaryInputError
                                        ]}>
                                            <Text style={styles.salaryPrefix}>Rs.</Text>
                                            <TextInput
                                                style={styles.salaryInput}
                                                placeholder="Maximum"
                                                placeholderTextColor={theme.colors.textMuted}
                                                value={salaryMax}
                                                onChangeText={(val) => handleSalaryChange(val, setSalaryMax, 'salaryMax')}
                                                keyboardType="number-pad"
                                                maxLength={8}
                                            />
                                        </View>
                                    </View>
                                    {errors.salaryMin && (
                                        <Text style={styles.errorText}>{errors.salaryMin}</Text>
                                    )}
                                    {errors.salaryMax && (
                                        <Text style={styles.errorText}>{errors.salaryMax}</Text>
                                    )}
                                    {errors.salaryRange && (
                                        <Text style={styles.errorText}>{errors.salaryRange}</Text>
                                    )}
                                    <Text style={styles.salaryHint}>
                                        Enter your expected salary range in Nepali Rupees
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    // Render step indicator
    const renderStepIndicator = () => (
        <View style={styles.stepIndicatorContainer}>
            {STEP_CONFIG.map((step, index) => {
                const stepNum = index + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;

                return (
                    <View key={index} style={styles.stepIndicatorItem}>
                        <View style={[
                            styles.stepDot,
                            isActive && styles.stepDotActive,
                            isCompleted && styles.stepDotCompleted,
                        ]}>
                            {isCompleted ? (
                                <Feather name="check" size={12} color="#fff" />
                            ) : (
                                <Ionicons
                                    name={step.icon as any}
                                    size={14}
                                    color={isActive ? '#fff' : theme.colors.textMuted}
                                />
                            )}
                        </View>
                        {index < STEP_CONFIG.length - 1 && (
                            <View style={[
                                styles.stepLine,
                                isCompleted && styles.stepLineCompleted,
                            ]} />
                        )}
                    </View>
                );
            })}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Success Overlay */}
            {showSuccess && (
                <Animated.View style={[styles.successOverlay, successAnimatedStyle]}>
                    <View style={styles.successContent}>
                        <View style={styles.successIconContainer}>
                            <Feather name="check" size={48} color="#0A1628" />
                        </View>
                        <Text style={styles.successTitle}>You're All Set!</Text>
                        <Text style={styles.successSubtitle}>
                            Finding the best opportunities for you...
                        </Text>
                    </View>
                </Animated.View>
            )}

            <Animated.View style={[styles.keyboardView, contentAnimatedStyle]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Enhanced Header */}
                    <View style={styles.headerGradient}>
                        <View style={styles.header}>
                            {currentStep > 1 ? (
                                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                    <Feather name="arrow-left" size={24} color="#fff" />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.backButton} />
                            )}
                            <View style={styles.headerCenter}>
                                <Text style={styles.headerTitle}>
                                    {STEP_CONFIG[currentStep - 1].title}
                                </Text>
                                <Text style={styles.headerSubtitle}>
                                    {STEP_CONFIG[currentStep - 1].subtitle}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={handleSkip}
                                disabled={loading}
                            >
                                <Text style={styles.skipText}>Skip</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Visual Step Indicator */}
                        {renderStepIndicator()}
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {renderStepContent()}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                            onPress={handleNext}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.nextButtonText}>
                                        {currentStep === totalSteps ? 'Complete Profile' : 'Continue'}
                                    </Text>
                                    <Feather name="arrow-right" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    headerGradient: {
        paddingBottom: 16,
        backgroundColor: 'rgba(201, 169, 98, 0.08)',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    skipButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    skipText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    // Step Indicator Styles
    stepIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: 8,
    },
    stepIndicatorItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    stepDotCompleted: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: theme.colors.border,
        marginHorizontal: 4,
    },
    stepLineCompleted: {
        backgroundColor: theme.colors.success,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    stepContent: {
        paddingTop: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: theme.colors.text,
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 16,
        fontSize: 16,
        color: theme.colors.text,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: theme.colors.textMuted,
        textAlign: 'right',
        marginTop: 8,
    },
    experienceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    expButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    expValueContainer: {
        alignItems: 'center',
    },
    expValue: {
        fontSize: 36,
        fontWeight: '700',
        color: theme.colors.accent,
    },
    expLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    skillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    skillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    skillChipSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    skillChipText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    skillChipTextSelected: {
        color: theme.colors.text,
    },
    customSkillContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    customSkillInput: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text,
    },
    addSkillButton: {
        width: 50,
        borderRadius: 12,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedSkills: {
        marginTop: 8,
    },
    selectedLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    selectedSkillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectedSkillTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        borderWidth: 1,
        borderColor: theme.colors.accent,
        gap: 6,
    },
    selectedSkillText: {
        fontSize: 13,
        color: theme.colors.accent,
        fontWeight: '500',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionCard: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    optionCardSelected: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        borderColor: theme.colors.accent,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    optionTextSelected: {
        color: theme.colors.accent,
    },
    availabilityOptions: {
        gap: 12,
    },
    availabilityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
    },
    availabilityCardSelected: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        borderColor: theme.colors.accent,
    },
    availabilityText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    availabilityTextSelected: {
        color: theme.colors.accent,
    },
    relocateToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: 8,
    },
    relocateLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    relocateLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    relocateSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    locationScroll: {
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    locationScrollError: {
        paddingBottom: 4,
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: 10,
        gap: 6,
    },
    locationChipSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    locationChipError: {
        borderColor: theme.colors.error || '#ef4444',
    },
    locationChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    locationChipTextSelected: {
        color: theme.colors.text,
    },
    prefLocationsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    prefLocationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    prefLocationChipSelected: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        borderColor: theme.colors.accent,
    },
    prefLocationText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    prefLocationTextSelected: {
        color: theme.colors.accent,
    },
    selectedCount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 8,
        fontStyle: 'italic',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 12,
    },
    labelHint: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
    },
    errorText: {
        color: theme.colors.error || '#ef4444',
        fontSize: 12,
        marginTop: 6,
    },
    negotiableToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 16,
        gap: 12,
    },
    negotiableText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
    },
    salaryInputError: {
        borderColor: theme.colors.error || '#ef4444',
        borderWidth: 2,
    },
    salaryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    salaryInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
    },
    salaryPrefix: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginRight: 4,
    },
    salaryInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text,
    },
    salaryDivider: {
        fontSize: 14,
        color: theme.colors.textMuted,
    },
    salaryHint: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 8,
    },
    footer: {
        padding: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    nextButton: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonDisabled: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    // Success overlay styles
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0A1628',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    successContent: {
        alignItems: 'center',
        padding: 40,
    },
    successIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#C9A962',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 16,
        color: '#8BA3C4',
        textAlign: 'center',
    },
});
