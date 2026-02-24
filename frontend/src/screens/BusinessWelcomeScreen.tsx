import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Worker types for hiring
const WORKER_TYPES = [
    { id: 'drivers', label: 'Drivers', icon: 'car' },
    { id: 'cooks', label: 'Cooks', icon: 'chef-hat' },
    { id: 'cleaners', label: 'Cleaners', icon: 'broom' },
    { id: 'security', label: 'Security Guards', icon: 'shield-account' },
    { id: 'waiters', label: 'Waiters', icon: 'silverware-fork-knife' },
    { id: 'sales', label: 'Sales Staff', icon: 'store' },
    { id: 'delivery', label: 'Delivery', icon: 'moped' },
    { id: 'electricians', label: 'Electricians', icon: 'flash' },
    { id: 'plumbers', label: 'Plumbers', icon: 'pipe' },
    { id: 'office', label: 'Office Assistants', icon: 'desk' },
    { id: 'laborers', label: 'Laborers', icon: 'hammer' },
    { id: 'technicians', label: 'Technicians', icon: 'wrench' },
];

const HIRING_URGENCY = [
    { id: 'immediate', label: 'Need Immediately', sublabel: 'Within 48 hours', icon: 'clock-alert' },
    { id: 'this_week', label: 'This Week', sublabel: 'Planned but urgent', icon: 'calendar-week' },
    { id: 'future', label: 'Future Planning', sublabel: 'Building a pipeline', icon: 'calendar-month' },
];

const SALARY_RANGES = [
    { id: 'daily', label: 'Daily Wage', example: 'Rs. 500-1500/day' },
    { id: 'weekly', label: 'Weekly', example: 'Rs. 3000-8000/week' },
    { id: 'monthly', label: 'Monthly', example: 'Rs. 15000-50000/month' },
];

const DOCUMENTS_REQUIRED = [
    { id: 'citizenship', label: 'Citizenship/ID', icon: 'card-account-details' },
    { id: 'police', label: 'Police Report', icon: 'police-badge' },
    { id: 'license', label: 'License', icon: 'license' },
    { id: 'experience', label: 'Experience Letters', icon: 'file-document' },
    { id: 'training', label: 'Training Certificates', icon: 'certificate' },
    { id: 'none', label: 'Not Required', icon: 'cancel' },
];

const BENEFITS_OFFERED = [
    { id: 'meals', label: 'Meals', icon: 'food' },
    { id: 'accommodation', label: 'Accommodation', icon: 'home' },
    { id: 'transport', label: 'Transport', icon: 'bus' },
    { id: 'bonus', label: 'Bonus', icon: 'cash' },
    { id: 'training', label: 'Training', icon: 'school' },
    { id: 'overtime', label: 'Overtime Pay', icon: 'clock-plus' },
    { id: 'insurance', label: 'Insurance', icon: 'shield-plus' },
    { id: 'tips', label: 'Tips', icon: 'hand-coin' },
];

interface QuestionnaireData {
    workerTypes: string[];
    hiringUrgency: string;
    salaryType: string;
    salaryMin: string;
    salaryMax: string;
    documentsRequired: string[];
    benefitsOffered: string[];
}

export default function BusinessWelcomeScreen({ navigation }: { navigation: any }) {
    const { completeWelcome, updateProfile, selectedRole } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);

    // Debug logging
    console.log('=== BusinessWelcomeScreen Rendered ===');
    console.log('selectedRole:', selectedRole);
    console.log('currentIndex:', currentIndex);

    // Questionnaire state
    const [data, setData] = useState<QuestionnaireData>({
        workerTypes: [],
        hiringUrgency: '',
        salaryType: 'monthly',
        salaryMin: '',
        salaryMax: '',
        documentsRequired: [],
        benefitsOffered: [],
    });

    const toggleSelection = (field: 'workerTypes' | 'documentsRequired' | 'benefitsOffered', value: string) => {
        setData(prev => {
            const current = prev[field];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [field]: updated };
        });
    };

    const setSingleSelection = (field: 'hiringUrgency' | 'salaryType', value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = async () => {
        console.log('handleNext called, currentIndex:', currentIndex);
        if (currentIndex < 5) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // Save questionnaire data (non-blocking - continue even if save fails)
            try {
                await updateProfile({
                    typically_hiring: data.workerTypes,
                    benefits_offered: data.benefitsOffered,
                });
                console.log('Profile saved successfully');
            } catch (e) {
                console.log('Profile save skipped (will save later):', e);
                // Continue anyway - profile can be saved later
            }
            // Always complete welcome to move to next screen
            completeWelcome();
        }
    };

    const handleSkip = () => {
        completeWelcome();
    };

    const canProceed = () => {
        // All slides are optional - user can skip any question
        return true;
    };

    // Render the current slide based on currentIndex
    const renderCurrentSlide = () => {
        console.log('BusinessWelcomeScreen renderCurrentSlide - index:', currentIndex);
        switch (currentIndex) {
            case 0:
                return renderWelcomeSlide();
            case 1:
                return renderWorkerTypesSlide();
            case 2:
                return renderUrgencySlide();
            case 3:
                return renderSalarySlide();
            case 4:
                return renderDocumentsSlide();
            case 5:
                return renderBenefitsSlide();
            default:
                return null;
        }
    };

    const renderWelcomeSlide = () => (
        <ScrollView style={styles.slide} contentContainerStyle={styles.slideContent}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="briefcase-account" size={80} color="#C9A962" />
            </View>
            <Text style={styles.title}>Welcome to Kaam Deu</Text>
            <Text style={styles.subtitle}>Let's set up your hiring preferences</Text>
            <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                    Answer a few quick questions to help us find the right workers for your business.
                </Text>
                <View style={styles.bulletPoints}>
                    <Text style={styles.bullet}>• Takes less than 2 minutes</Text>
                    <Text style={styles.bullet}>• Get better matched candidates</Text>
                    <Text style={styles.bullet}>• You can change these anytime</Text>
                </View>
            </View>
        </ScrollView>
    );

    const renderWorkerTypesSlide = () => (
        <ScrollView style={styles.slide} contentContainerStyle={styles.slideContent}>
            <Text style={styles.questionTitle}>What kind of workers do you hire?</Text>
            <Text style={styles.questionSubtitle}>Select all that apply</Text>
            <View style={styles.optionsGrid}>
                {WORKER_TYPES.map(type => (
                    <TouchableOpacity
                        key={type.id}
                        style={[
                            styles.optionChip,
                            data.workerTypes.includes(type.id) && styles.optionChipSelected
                        ]}
                        onPress={() => toggleSelection('workerTypes', type.id)}
                    >
                        <MaterialCommunityIcons
                            name={type.icon as any}
                            size={24}
                            color={data.workerTypes.includes(type.id) ? '#0A1628' : '#C9A962'}
                        />
                        <Text style={[
                            styles.optionChipText,
                            data.workerTypes.includes(type.id) && styles.optionChipTextSelected
                        ]}>
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderUrgencySlide = () => (
        <ScrollView style={styles.slide} contentContainerStyle={styles.slideContent}>
            <Text style={styles.questionTitle}>How urgent are your hires?</Text>
            <Text style={styles.questionSubtitle}>Select your typical hiring timeline</Text>
            <View style={styles.urgencyOptions}>
                {HIRING_URGENCY.map(urgency => (
                    <TouchableOpacity
                        key={urgency.id}
                        style={[
                            styles.urgencyCard,
                            data.hiringUrgency === urgency.id && styles.urgencyCardSelected
                        ]}
                        onPress={() => setSingleSelection('hiringUrgency', urgency.id)}
                    >
                        <MaterialCommunityIcons
                            name={urgency.icon as any}
                            size={40}
                            color={data.hiringUrgency === urgency.id ? '#0A1628' : '#C9A962'}
                        />
                        <View style={styles.urgencyTextContainer}>
                            <Text style={[
                                styles.urgencyLabel,
                                data.hiringUrgency === urgency.id && styles.urgencyLabelSelected
                            ]}>
                                {urgency.label}
                            </Text>
                            <Text style={[
                                styles.urgencySublabel,
                                data.hiringUrgency === urgency.id && styles.urgencySublabelSelected
                            ]}>
                                {urgency.sublabel}
                            </Text>
                        </View>
                        {data.hiringUrgency === urgency.id && (
                            <Feather name="check-circle" size={24} color="#0A1628" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderSalarySlide = () => (
        <ScrollView style={styles.slide} contentContainerStyle={styles.slideContent}>
            <Text style={styles.questionTitle}>What salary range do you offer?</Text>
            <Text style={styles.questionSubtitle}>This helps match workers to your budget</Text>

            <View style={styles.salaryTypeContainer}>
                {SALARY_RANGES.map(range => (
                    <TouchableOpacity
                        key={range.id}
                        style={[
                            styles.salaryTypeButton,
                            data.salaryType === range.id && styles.salaryTypeButtonSelected
                        ]}
                        onPress={() => setSingleSelection('salaryType', range.id)}
                    >
                        <Text style={[
                            styles.salaryTypeText,
                            data.salaryType === range.id && styles.salaryTypeTextSelected
                        ]}>
                            {range.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.salaryInputContainer}>
                <View style={styles.salaryInputWrapper}>
                    <Text style={styles.salaryInputLabel}>Minimum (Rs.)</Text>
                    <TextInput
                        style={styles.salaryInput}
                        placeholder="e.g. 15000"
                        placeholderTextColor="#5A7A9A"
                        keyboardType="numeric"
                        value={data.salaryMin}
                        onChangeText={(text) => setData(prev => ({ ...prev, salaryMin: text }))}
                    />
                </View>
                <Text style={styles.salaryDash}>-</Text>
                <View style={styles.salaryInputWrapper}>
                    <Text style={styles.salaryInputLabel}>Maximum (Rs.)</Text>
                    <TextInput
                        style={styles.salaryInput}
                        placeholder="e.g. 30000"
                        placeholderTextColor="#5A7A9A"
                        keyboardType="numeric"
                        value={data.salaryMax}
                        onChangeText={(text) => setData(prev => ({ ...prev, salaryMax: text }))}
                    />
                </View>
            </View>

            <Text style={styles.optionalNote}>Optional - you can set this later</Text>
        </ScrollView>
    );

    const renderDocumentsSlide = () => (
        <ScrollView style={styles.slide} contentContainerStyle={styles.slideContent}>
            <Text style={styles.questionTitle}>What documents do you require?</Text>
            <Text style={styles.questionSubtitle}>Select all that workers should have</Text>
            <View style={styles.optionsGrid}>
                {DOCUMENTS_REQUIRED.map(doc => (
                    <TouchableOpacity
                        key={doc.id}
                        style={[
                            styles.optionChip,
                            data.documentsRequired.includes(doc.id) && styles.optionChipSelected
                        ]}
                        onPress={() => toggleSelection('documentsRequired', doc.id)}
                    >
                        <MaterialCommunityIcons
                            name={doc.icon as any}
                            size={24}
                            color={data.documentsRequired.includes(doc.id) ? '#0A1628' : '#C9A962'}
                        />
                        <Text style={[
                            styles.optionChipText,
                            data.documentsRequired.includes(doc.id) && styles.optionChipTextSelected
                        ]}>
                            {doc.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.optionalNote}>Optional - you can set this later</Text>
        </ScrollView>
    );

    const renderBenefitsSlide = () => (
        <ScrollView style={styles.slide} contentContainerStyle={styles.slideContent}>
            <Text style={styles.questionTitle}>What benefits do you offer?</Text>
            <Text style={styles.questionSubtitle}>Attract better workers with good benefits</Text>
            <View style={styles.optionsGrid}>
                {BENEFITS_OFFERED.map(benefit => (
                    <TouchableOpacity
                        key={benefit.id}
                        style={[
                            styles.optionChip,
                            data.benefitsOffered.includes(benefit.id) && styles.optionChipSelected
                        ]}
                        onPress={() => toggleSelection('benefitsOffered', benefit.id)}
                    >
                        <MaterialCommunityIcons
                            name={benefit.icon as any}
                            size={24}
                            color={data.benefitsOffered.includes(benefit.id) ? '#0A1628' : '#C9A962'}
                        />
                        <Text style={[
                            styles.optionChipText,
                            data.benefitsOffered.includes(benefit.id) && styles.optionChipTextSelected
                        ]}>
                            {benefit.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.optionalNote}>Optional - you can update this anytime</Text>
        </ScrollView>
    );

    const renderPagination = () => (
        <View style={styles.paginationContainer}>
            {[0, 1, 2, 3, 4, 5].map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        currentIndex === index && styles.dotActive,
                    ]}
                />
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>Kaam Deu</Text>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* Current Slide */}
            <View style={styles.slideContainer}>
                {renderCurrentSlide()}
            </View>

            {/* Pagination */}
            {renderPagination()}

            {/* Bottom Actions */}
            <View style={styles.bottomContainer}>
                {currentIndex > 0 && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setCurrentIndex(currentIndex - 1)}
                    >
                        <Feather name="arrow-left" size={20} color="#C9A962" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        !canProceed() && styles.nextButtonDisabled
                    ]}
                    onPress={handleNext}
                    disabled={!canProceed()}
                >
                    <Text style={styles.nextButtonText}>
                        {currentIndex === 5 ? 'Start Hiring' : 'Continue'}
                    </Text>
                    <Feather name="arrow-right" size={20} color="#0A1628" />
                </TouchableOpacity>
            </View>

            <Text style={styles.progressText}>
                {currentIndex + 1} of 6
            </Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A1628',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    logo: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    skipText: {
        fontSize: 16,
        color: '#8BA3C4',
        fontWeight: '500',
    },
    slideContainer: {
        flex: 1,
    },
    slide: {
        flex: 1,
    },
    slideContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#132337',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        alignSelf: 'center',
        borderWidth: 3,
        borderColor: '#C9A962',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#C9A962',
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#132337',
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2A4A6A',
    },
    infoText: {
        fontSize: 16,
        color: '#8BA3C4',
        lineHeight: 24,
        marginBottom: 16,
    },
    bulletPoints: {
        gap: 8,
    },
    bullet: {
        fontSize: 15,
        color: '#C9A962',
        lineHeight: 22,
    },
    questionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    questionSubtitle: {
        fontSize: 14,
        color: '#8BA3C4',
        textAlign: 'center',
        marginBottom: 24,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    optionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#132337',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#2A4A6A',
        gap: 8,
        minWidth: '45%',
    },
    optionChipSelected: {
        backgroundColor: '#C9A962',
        borderColor: '#C9A962',
    },
    optionChipText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    optionChipTextSelected: {
        color: '#0A1628',
    },
    urgencyOptions: {
        gap: 16,
    },
    urgencyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#132337',
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#2A4A6A',
        gap: 16,
    },
    urgencyCardSelected: {
        backgroundColor: '#C9A962',
        borderColor: '#C9A962',
    },
    urgencyTextContainer: {
        flex: 1,
    },
    urgencyLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    urgencyLabelSelected: {
        color: '#0A1628',
    },
    urgencySublabel: {
        fontSize: 14,
        color: '#8BA3C4',
    },
    urgencySublabelSelected: {
        color: '#0A1628',
        opacity: 0.7,
    },
    salaryTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    salaryTypeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#132337',
        borderWidth: 2,
        borderColor: '#2A4A6A',
        alignItems: 'center',
    },
    salaryTypeButtonSelected: {
        backgroundColor: '#C9A962',
        borderColor: '#C9A962',
    },
    salaryTypeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    salaryTypeTextSelected: {
        color: '#0A1628',
    },
    salaryInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    salaryInputWrapper: {
        flex: 1,
    },
    salaryInputLabel: {
        fontSize: 12,
        color: '#8BA3C4',
        marginBottom: 8,
    },
    salaryInput: {
        backgroundColor: '#132337',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2A4A6A',
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#fff',
    },
    salaryDash: {
        fontSize: 24,
        color: '#5A7A9A',
        marginTop: 20,
    },
    optionalNote: {
        fontSize: 13,
        color: '#5A7A9A',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2A4A6A',
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: '#C9A962',
    },
    bottomContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        alignItems: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C9A962',
    },
    nextButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C9A962',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    nextButtonDisabled: {
        backgroundColor: '#2A4A6A',
        opacity: 0.6,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0A1628',
    },
    progressText: {
        textAlign: 'center',
        paddingBottom: 16,
        fontSize: 14,
        color: '#5A7A9A',
    },
});
