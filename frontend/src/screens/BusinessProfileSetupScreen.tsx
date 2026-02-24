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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { BusinessType, CompanySize } from '../types';
import PhotoPicker from '../components/PhotoPicker';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const NEPAL_LOCATIONS = [
    'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar',
    'Birgunj', 'Bharatpur', 'Butwal', 'Dharan', 'Hetauda',
];

const INDUSTRIES = [
    'Restaurant & Hospitality', 'Construction', 'Manufacturing',
    'Retail & Sales', 'Transportation', 'Healthcare',
    'Education', 'IT & Technology', 'Agriculture', 'Services',
    'Real Estate', 'Finance & Banking', 'Textile & Garments', 'Other',
];

const HIRING_CATEGORIES = [
    'Drivers', 'Cooks', 'Cleaners', 'Security Guards', 'Waiters',
    'Sales Staff', 'Delivery Personnel', 'Electricians', 'Plumbers',
    'Office Assistants', 'Receptionists', 'Technicians', 'Laborers',
    'Customer Service', 'Accountants', 'Teachers',
];

const BENEFITS = [
    'Health Insurance', 'Paid Leave', 'Meals Provided', 'Housing',
    'Transportation', 'Bonus', 'Training', 'Overtime Pay',
    'Festival Bonus', 'Provident Fund', 'Gratuity',
];

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
];

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: string; iconFamily: 'feather' | 'material' }[] = [
    { value: 'company', label: 'Registered Company', icon: 'office-building', iconFamily: 'material' },
    { value: 'startup', label: 'Startup', icon: 'rocket-launch', iconFamily: 'material' },
    { value: 'agency', label: 'Agency', icon: 'users', iconFamily: 'feather' },
    { value: 'individual', label: 'Individual Employer', icon: 'user', iconFamily: 'feather' },
];

type Step = 1 | 2 | 3 | 4;

export default function BusinessProfileSetupScreen({ navigation }: { navigation: any }) {
    const { user, updateProfile, profile, completeProfile } = useAuth();
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Validation errors state
    const [errors, setErrors] = useState<{
        companyName?: string;
        industry?: string;
        location?: string;
        contactPerson?: string;
    }>({});

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

    // Step 1: Company Info & Photos
    const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
    const [companyName, setCompanyName] = useState(profile?.company_name || '');
    const [companyType, setCompanyType] = useState<BusinessType>((profile?.company_type as BusinessType) || 'company');
    const [companySize, setCompanySize] = useState<CompanySize>((profile?.company_size as CompanySize) || '1-10');
    const [industry, setIndustry] = useState(profile?.industry || '');
    const [industrySearch, setIndustrySearch] = useState('');

    // Step 2: Company Details
    const [description, setDescription] = useState(profile?.description || '');
    const [website, setWebsite] = useState(profile?.website || '');
    const [location, setLocation] = useState(profile?.location || '');

    // Step 3: Contact Info
    const [contactPerson, setContactPerson] = useState(profile?.contact_person || '');
    const [contactPosition, setContactPosition] = useState(profile?.contact_position || '');
    const [contactPhone, setContactPhone] = useState(profile?.contact_phone || '');

    // Step 4: Hiring Preferences
    const [typicallyHiring, setTypicallyHiring] = useState<string[]>(
        profile?.typically_hiring || []
    );
    const [benefitsOffered, setBenefitsOffered] = useState<string[]>(
        profile?.benefits_offered || []
    );

    const totalSteps = 4;
    const progress = (currentStep / totalSteps) * 100;

    const toggleHiringCategory = (category: string) => {
        if (typicallyHiring.includes(category)) {
            setTypicallyHiring(typicallyHiring.filter(c => c !== category));
        } else {
            setTypicallyHiring([...typicallyHiring, category]);
        }
    };

    const toggleBenefit = (benefit: string) => {
        if (benefitsOffered.includes(benefit)) {
            setBenefitsOffered(benefitsOffered.filter(b => b !== benefit));
        } else {
            setBenefitsOffered([...benefitsOffered, benefit]);
        }
    };

    // Clear error when field value changes
    const clearError = (field: keyof typeof errors) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateStep = (): boolean => {
        const newErrors: typeof errors = {};

        switch (currentStep) {
            case 1:
                if (!companyName.trim()) {
                    newErrors.companyName = 'Company name is required';
                }
                if (!industry) {
                    newErrors.industry = 'Please select your industry';
                }
                break;
            case 2:
                if (!location) {
                    newErrors.location = 'Please select your office location';
                }
                break;
            case 3:
                if (!contactPerson.trim()) {
                    newErrors.contactPerson = 'Contact person name is required';
                }
                break;
            case 4:
                // No required fields in step 4
                break;
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return false;
        }
        return true;
    };

    // Validate all required fields (for Skip button)
    const validateAllRequired = (): boolean => {
        const newErrors: typeof errors = {};

        if (!companyName.trim()) {
            newErrors.companyName = 'Company name is required';
        }
        if (!industry) {
            newErrors.industry = 'Please select your industry';
        }
        if (!location) {
            newErrors.location = 'Please select your office location';
        }
        if (!contactPerson.trim()) {
            newErrors.contactPerson = 'Contact person name is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'Required Fields Missing',
                'Please fill in all required fields before completing your profile.',
                [{ text: 'OK' }]
            );
            return false;
        }
        return true;
    };

    // Handle Skip - validates all required fields first
    const handleSkip = () => {
        if (validateAllRequired()) {
            handleSubmit();
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

    const handleSubmit = async () => {
        // FIXED: Validate required fields before submitting
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in to complete your profile');
            return;
        }

        setLoading(true);
        try {
            console.log('BusinessProfileSetupScreen: Starting profile submit...');
            const profileData = {
                ...profile,
                id: user.id, // FIXED: Explicitly set ID from authenticated user
                role: 'business' as const, // FIXED: Set role for proper feed filtering
                name: companyName, // FIXED: Set name field for display in feed
                photos,
                photo_url: photos.length > 0 ? photos[0] : undefined, // Set primary photo for feed
                logo_url: photos.length > 0 ? photos[0] : undefined, // Set primary logo
                company_name: companyName,
                company_type: companyType,
                company_size: companySize,
                industry,
                description,
                website,
                location,
                contact_person: contactPerson,
                contact_position: contactPosition,
                contact_phone: contactPhone,
                typically_hiring: typicallyHiring,
                benefits_offered: benefitsOffered,
                is_profile_complete: true,
                updated_at: new Date().toISOString(),
            };

            console.log('BusinessProfileSetupScreen: Calling updateProfile with is_profile_complete=true');
            await updateProfile(profileData);
            console.log('BusinessProfileSetupScreen: Profile updated successfully!');

            // Show success animation before navigation takes over
            triggerSuccessAnimation();
            // Navigation will happen automatically via RootNavigator when isProfileComplete becomes true
        } catch (error: any) {
            console.error('BusinessProfileSetupScreen: Error saving profile:', error?.message || error);
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
                            console.log('BusinessProfileSetupScreen: User confirmed, calling completeProfile...');
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
                        <Text style={styles.stepTitle}>Company Information</Text>
                        <Text style={styles.stepSubtitle}>
                            Tell us about your business
                        </Text>

                        <PhotoPicker
                            photos={photos}
                            onPhotosChange={setPhotos}
                            maxPhotos={5}
                            title="Company Photos"
                            subtitle="Add your logo or workplace photos"
                        />

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Company Name *</Text>
                            <View style={[styles.inputContainer, !!errors.companyName && styles.inputContainerError]}>
                                <MaterialCommunityIcons name="domain" size={20} color={errors.companyName ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., ABC Restaurant Pvt. Ltd."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={companyName}
                                    onChangeText={(text) => {
                                        setCompanyName(text);
                                        clearError('companyName');
                                    }}
                                />
                            </View>
                            {errors.companyName && (
                                <Text style={styles.errorText}>{errors.companyName}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Business Type</Text>
                            <View style={styles.businessTypeGrid}>
                                {BUSINESS_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        style={[
                                            styles.businessTypeCard,
                                            companyType === type.value && styles.businessTypeCardSelected
                                        ]}
                                        onPress={() => setCompanyType(type.value)}
                                    >
                                        {type.iconFamily === 'material' ? (
                                            <MaterialCommunityIcons
                                                name={type.icon as any}
                                                size={24}
                                                color={companyType === type.value ? theme.colors.accent : theme.colors.textSecondary}
                                            />
                                        ) : (
                                            <Feather
                                                name={type.icon as any}
                                                size={24}
                                                color={companyType === type.value ? theme.colors.accent : theme.colors.textSecondary}
                                            />
                                        )}
                                        <Text style={[
                                            styles.businessTypeText,
                                            companyType === type.value && styles.businessTypeTextSelected
                                        ]}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Company Size</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.horizontalScroll}
                            >
                                {COMPANY_SIZES.map((size) => (
                                    <TouchableOpacity
                                        key={size.value}
                                        style={[
                                            styles.sizeChip,
                                            companySize === size.value && styles.sizeChipSelected
                                        ]}
                                        onPress={() => setCompanySize(size.value)}
                                    >
                                        <Text style={[
                                            styles.sizeChipText,
                                            companySize === size.value && styles.sizeChipTextSelected
                                        ]}>
                                            {size.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Industry *</Text>
                            <View style={styles.searchContainer}>
                                <Feather name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search industries..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={industrySearch}
                                    onChangeText={setIndustrySearch}
                                    autoCapitalize="none"
                                />
                                {industrySearch.length > 0 && (
                                    <TouchableOpacity onPress={() => setIndustrySearch('')} style={styles.clearSearch}>
                                        <Feather name="x" size={16} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={[styles.industryGrid, !!errors.industry && styles.industryGridError]}>
                                {INDUSTRIES
                                    .filter((ind) => ind.toLowerCase().includes(industrySearch.toLowerCase()))
                                    .map((ind) => (
                                    <TouchableOpacity
                                        key={ind}
                                        style={[
                                            styles.industryChip,
                                            industry === ind && styles.industryChipSelected
                                        ]}
                                        onPress={() => {
                                            setIndustry(ind);
                                            clearError('industry');
                                            setIndustrySearch('');
                                        }}
                                    >
                                        <Text style={[
                                            styles.industryChipText,
                                            industry === ind && styles.industryChipTextSelected
                                        ]}>
                                            {ind}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {INDUSTRIES.filter((ind) => ind.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                                    <Text style={styles.noResultsText}>No industries match "{industrySearch}"</Text>
                                )}
                            </View>
                            {errors.industry && (
                                <Text style={styles.errorText}>{errors.industry}</Text>
                            )}
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Company Details</Text>
                        <Text style={styles.stepSubtitle}>
                            Help workers learn more about your company
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>About Your Company</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Describe what your company does, your culture, and what makes it a great place to work..."
                                placeholderTextColor="#666"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                            />
                            <Text style={styles.charCount}>{description.length}/500</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Website (Optional)</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="globe" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="www.yourcompany.com"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={website}
                                    onChangeText={setWebsite}
                                    keyboardType="url"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Office Location *</Text>
                            <View style={[styles.locationGrid, !!errors.location && styles.locationGridError]}>
                                {NEPAL_LOCATIONS.map((loc) => (
                                    <TouchableOpacity
                                        key={loc}
                                        style={[
                                            styles.locationChip,
                                            location === loc && styles.locationChipSelected
                                        ]}
                                        onPress={() => {
                                            setLocation(loc);
                                            clearError('location');
                                        }}
                                    >
                                        <Feather
                                            name="map-pin"
                                            size={14}
                                            color={location === loc ? theme.colors.text : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.locationChipText,
                                            location === loc && styles.locationChipTextSelected
                                        ]}>
                                            {loc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {errors.location && (
                                <Text style={styles.errorText}>{errors.location}</Text>
                            )}
                        </View>
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Contact Information</Text>
                        <Text style={styles.stepSubtitle}>
                            Who should workers contact for job inquiries?
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contact Person Name *</Text>
                            <View style={[styles.inputContainer, !!errors.contactPerson && styles.inputContainerError]}>
                                <Feather name="user" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Ram Sharma"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={contactPerson}
                                    onChangeText={(text) => {
                                        setContactPerson(text);
                                        clearError('contactPerson');
                                    }}
                                    autoCapitalize="words"
                                />
                            </View>
                            {errors.contactPerson && (
                                <Text style={styles.errorText}>{errors.contactPerson}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Position / Role</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="briefcase" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., HR Manager, Owner"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={contactPosition}
                                    onChangeText={setContactPosition}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contact Phone</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.phonePrefix}>+977</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="98XXXXXXXX"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={contactPhone}
                                    onChangeText={setContactPhone}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <Feather name="shield" size={20} color={theme.colors.accent} />
                            <View style={styles.infoCardContent}>
                                <Text style={styles.infoCardTitle}>Privacy Protected</Text>
                                <Text style={styles.infoCardText}>
                                    Your contact information is only shared with matched workers
                                </Text>
                            </View>
                        </View>
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Hiring Preferences</Text>
                        <Text style={styles.stepSubtitle}>
                            What types of workers do you typically hire?
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Job Categories You Hire For</Text>
                            <View style={styles.hiringGrid}>
                                {HIRING_CATEGORIES.map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.hiringChip,
                                            typicallyHiring.includes(category) && styles.hiringChipSelected
                                        ]}
                                        onPress={() => toggleHiringCategory(category)}
                                    >
                                        <Text style={[
                                            styles.hiringChipText,
                                            typicallyHiring.includes(category) && styles.hiringChipTextSelected
                                        ]}>
                                            {category}
                                        </Text>
                                        {typicallyHiring.includes(category) && (
                                            <Feather name="check" size={14} color="#fff" style={{ marginLeft: 4 }} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Benefits You Offer</Text>
                            <Text style={styles.labelHint}>
                                Attract better workers by highlighting your benefits
                            </Text>
                            <View style={styles.benefitsGrid}>
                                {BENEFITS.map((benefit) => (
                                    <TouchableOpacity
                                        key={benefit}
                                        style={[
                                            styles.benefitChip,
                                            benefitsOffered.includes(benefit) && styles.benefitChipSelected
                                        ]}
                                        onPress={() => toggleBenefit(benefit)}
                                    >
                                        <Feather
                                            name={benefitsOffered.includes(benefit) ? "check-circle" : "circle"}
                                            size={16}
                                            color={benefitsOffered.includes(benefit) ? theme.colors.success : theme.colors.textMuted}
                                        />
                                        <Text style={[
                                            styles.benefitChipText,
                                            benefitsOffered.includes(benefit) && styles.benefitChipTextSelected
                                        ]}>
                                            {benefit}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {typicallyHiring.length > 0 && (
                            <View style={styles.selectionSummary}>
                                <Text style={styles.summaryLabel}>
                                    You're looking for: {typicallyHiring.join(', ')}
                                </Text>
                            </View>
                        )}
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Success Overlay */}
            {showSuccess && (
                <Animated.View style={[styles.successOverlay, successAnimatedStyle]}>
                    <View style={styles.successContent}>
                        <View style={styles.successIconContainer}>
                            <Feather name="check" size={48} color="#0A1628" />
                        </View>
                        <Text style={styles.successTitle}>Profile Complete!</Text>
                        <Text style={styles.successSubtitle}>
                            Taking you to find workers...
                        </Text>
                    </View>
                </Animated.View>
            )}

            <Animated.View style={[styles.keyboardView, contentAnimatedStyle]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Header with Gold Gradient */}
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
                                <Text style={styles.headerTitle}>Business Profile</Text>
                                <Text style={styles.headerStep}>Step {currentStep} of {totalSteps}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={handleSkip}
                                disabled={loading}
                            >
                                <Text style={styles.skipText}>Finish</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Animated Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${progress}%`,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
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
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    headerStep: {
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
    progressContainer: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: theme.colors.card,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
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
        color: '#fff',
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
    labelHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: -8,
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
    inputContainerError: {
        borderColor: theme.colors.error,
        borderWidth: 2,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
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
    phonePrefix: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginRight: 8,
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
    businessTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    businessTypeCard: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        gap: 8,
    },
    businessTypeCardSelected: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        borderColor: theme.colors.accent,
    },
    businessTypeText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    businessTypeTextSelected: {
        color: theme.colors.accent,
    },
    horizontalScroll: {
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    sizeChip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: 10,
    },
    sizeChipSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    sizeChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    sizeChipTextSelected: {
        color: theme.colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 15,
        color: theme.colors.text,
    },
    clearSearch: {
        padding: 6,
    },
    noResultsText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        width: '100%',
        paddingVertical: 12,
    },
    industryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    industryGridError: {
        borderWidth: 2,
        borderColor: theme.colors.error,
        borderRadius: 12,
        padding: 8,
        marginHorizontal: -8,
    },
    industryChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    industryChipSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    industryChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    industryChipTextSelected: {
        color: theme.colors.text,
    },
    locationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    locationGridError: {
        borderWidth: 2,
        borderColor: theme.colors.error,
        borderRadius: 12,
        padding: 8,
        marginHorizontal: -8,
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 6,
    },
    locationChipSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    locationChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    locationChipTextSelected: {
        color: theme.colors.text,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(201, 169, 98, 0.1)',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginTop: 8,
    },
    infoCardContent: {
        flex: 1,
    },
    infoCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.accent,
        marginBottom: 4,
    },
    infoCardText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    hiringGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    hiringChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    hiringChipSelected: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    hiringChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    hiringChipTextSelected: {
        color: theme.colors.text,
    },
    benefitsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    benefitChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    benefitChipSelected: {
        backgroundColor: 'rgba(46, 204, 113, 0.15)',
        borderColor: theme.colors.success,
    },
    benefitChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    benefitChipTextSelected: {
        color: theme.colors.success,
    },
    selectionSummary: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
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
        color: '#fff',
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
