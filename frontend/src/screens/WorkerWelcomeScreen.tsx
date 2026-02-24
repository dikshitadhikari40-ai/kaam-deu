import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const JOB_CATEGORIES = [
    { id: 'cleaner', label: 'Cleaner', icon: 'sparkles' },
    { id: 'construction', label: 'Construction', icon: 'hammer' },
    { id: 'driver', label: 'Driver', icon: 'car' },
    { id: 'plumber', label: 'Plumber', icon: 'water' },
    { id: 'electrician', label: 'Electrician', icon: 'flash' },
    { id: 'painter', label: 'Painter', icon: 'color-palette' },
];

const WORK_TYPES = [
    { id: 'full-time', label: 'Full Time', sub: '9am - 5pm' },
    { id: 'part-time', label: 'Part Time', sub: 'Few hours/day' },
    { id: 'daily', label: 'Daily Wage', sub: 'Pay per day' },
    { id: 'contract', label: 'Contract', sub: 'Project based' },
];

export const WorkerWelcomeScreen = () => {
    const { completeWelcome } = useAuth();
    const [step, setStep] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // Form State
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [salaryType, setSalaryType] = useState<'daily' | 'monthly'>('daily');
    const [salaryExpectation, setSalaryExpectation] = useState(500);
    const [travelPref, setTravelPref] = useState<'near' | 'city' | 'any'>('near');
    const [workTypes, setWorkTypes] = useState<string[]>([]);

    const totalSteps = 6;

    const handleNext = async () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
            // Finish - mark welcome as completed
            // RootNavigator will automatically navigate to ProfileSetup
            await completeWelcome();
        }
    };

    const toggleCategory = (id: string) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(selectedCategories.filter(c => c !== id));
        } else {
            setSelectedCategories([...selectedCategories, id]);
        }
    };

    const toggleWorkType = (id: string) => {
        if (workTypes.includes(id)) {
            setWorkTypes(workTypes.filter(t => t !== id));
        } else {
            setWorkTypes([...workTypes, id]);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.illustrationContainer}>
                            <Ionicons name="briefcase" size={100} color="#2563EB" />
                        </View>
                        <Text style={styles.headline}>Welcome to Kaam Deu</Text>
                        <Text style={styles.subheadline}>
                            We connect skilled workers like you with top businesses in Nepal.
                            Find jobs that match your skills and get paid fairly.
                        </Text>
                        <View style={styles.bulletPoints}>
                            <View style={styles.bulletItem}>
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                <Text style={styles.bulletText}>Create your profile once</Text>
                            </View>
                            <View style={styles.bulletItem}>
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                <Text style={styles.bulletText}>Swipe to apply for jobs</Text>
                            </View>
                            <View style={styles.bulletItem}>
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                <Text style={styles.bulletText}>Chat directly with employers</Text>
                            </View>
                        </View>
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>What kind of work do you do?</Text>
                        <Text style={styles.stepSubtitle}>Select all that apply</Text>
                        <View style={styles.gridContainer}>
                            {JOB_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.gridItem,
                                        selectedCategories.includes(cat.id) && styles.gridItemSelected
                                    ]}
                                    onPress={() => toggleCategory(cat.id)}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={32}
                                        color={selectedCategories.includes(cat.id) ? '#FFFFFF' : '#2563EB'}
                                    />
                                    <Text style={[
                                        styles.gridLabel,
                                        selectedCategories.includes(cat.id) && styles.gridLabelSelected
                                    ]}>{cat.label}</Text>
                                    {selectedCategories.includes(cat.id) && (
                                        <View style={styles.checkIcon}>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Salary Expectation</Text>
                        <Text style={styles.stepSubtitle}>How much do you expect to earn?</Text>

                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, salaryType === 'daily' && styles.toggleBtnActive]}
                                onPress={() => setSalaryType('daily')}
                            >
                                <Text style={[styles.toggleText, salaryType === 'daily' && styles.toggleTextActive]}>Daily Wage</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, salaryType === 'monthly' && styles.toggleBtnActive]}
                                onPress={() => setSalaryType('monthly')}
                            >
                                <Text style={[styles.toggleText, salaryType === 'monthly' && styles.toggleTextActive]}>Monthly Salary</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sliderContainer}>
                            <Text style={styles.salaryValue}>
                                NPR {salaryExpectation.toLocaleString()}
                                <Text style={styles.salaryUnit}> / {salaryType === 'daily' ? 'day' : 'month'}</Text>
                            </Text>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={salaryType === 'daily' ? 500 : 10000}
                                maximumValue={salaryType === 'daily' ? 5000 : 100000}
                                step={salaryType === 'daily' ? 100 : 1000}
                                value={salaryExpectation}
                                onValueChange={setSalaryExpectation}
                                minimumTrackTintColor="#2563EB"
                                maximumTrackTintColor="#E2E8F0"
                                thumbTintColor="#2563EB"
                            />
                            <View style={styles.sliderLabels}>
                                <Text style={styles.sliderLabelMin}>{salaryType === 'daily' ? '500' : '10k'}</Text>
                                <Text style={styles.sliderLabelMax}>{salaryType === 'daily' ? '5k+' : '100k+'}</Text>
                            </View>
                        </View>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Travel Preferences</Text>
                        <Text style={styles.stepSubtitle}>How far are you willing to travel?</Text>

                        <View style={styles.optionsContainer}>
                            <TouchableOpacity
                                style={[styles.optionCard, travelPref === 'near' && styles.optionCardSelected]}
                                onPress={() => setTravelPref('near')}
                            >
                                <Ionicons name="walk" size={24} color={travelPref === 'near' ? '#2563EB' : '#64748B'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>Near Home</Text>
                                    <Text style={styles.optionDesc}>Within walking distance or short ride</Text>
                                </View>
                                <View style={styles.radioOuter}>
                                    {travelPref === 'near' && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.optionCard, travelPref === 'city' && styles.optionCardSelected]}
                                onPress={() => setTravelPref('city')}
                            >
                                <Ionicons name="bus" size={24} color={travelPref === 'city' ? '#2563EB' : '#64748B'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>Within City</Text>
                                    <Text style={styles.optionDesc}>Anywhere in Kathmandu Valley</Text>
                                </View>
                                <View style={styles.radioOuter}>
                                    {travelPref === 'city' && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.optionCard, travelPref === 'any' && styles.optionCardSelected]}
                                onPress={() => setTravelPref('any')}
                            >
                                <Ionicons name="airplane" size={24} color={travelPref === 'any' ? '#2563EB' : '#64748B'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>Outside City</Text>
                                    <Text style={styles.optionDesc}>Willing to relocate for work</Text>
                                </View>
                                <View style={styles.radioOuter}>
                                    {travelPref === 'any' && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Work Type</Text>
                        <Text style={styles.stepSubtitle}>What kind of shifts do you prefer?</Text>

                        <View style={styles.gridContainer}>
                            {WORK_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.workTypeCard,
                                        workTypes.includes(type.id) && styles.workTypeCardSelected
                                    ]}
                                    onPress={() => toggleWorkType(type.id)}
                                >
                                    <Text style={[
                                        styles.workTypeLabel,
                                        workTypes.includes(type.id) && styles.workTypeLabelSelected
                                    ]}>{type.label}</Text>
                                    <Text style={[
                                        styles.workTypeSub,
                                        workTypes.includes(type.id) && styles.workTypeSubSelected
                                    ]}>{type.sub}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.illustrationContainer}>
                            <Ionicons name="shield-checkmark" size={80} color="#10B981" />
                        </View>
                        <Text style={styles.headline}>Safety First</Text>
                        <Text style={styles.subheadline}>
                            We verify all businesses to ensure your safety.
                            Always communicate through the app.
                        </Text>

                        <View style={styles.infoCard}>
                            <Ionicons name="key" size={24} color="#F59E0B" />
                            <Text style={styles.infoText}>
                                Never share your password or OTP with anyone.
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Ionicons name="cash" size={24} color="#F59E0B" />
                            <Text style={styles.infoText}>
                                Discuss payment terms clearly before starting work.
                            </Text>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderStepContent()}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerInfo}>
                    <Text style={styles.stepIndicator}>Step {step + 1} of {totalSteps}</Text>
                    <View style={styles.dots}>
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, i === step && styles.dotActive]}
                            />
                        ))}
                    </View>
                </View>
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>
                        {step === totalSteps - 1 ? 'Start Finding Jobs' : 'Continue'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E2E8F0',
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563EB',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    stepContainer: {
        flex: 1,
        alignItems: 'center',
    },
    illustrationContainer: {
        marginVertical: 40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headline: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 16,
    },
    subheadline: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    bulletPoints: {
        width: '100%',
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
    },
    bulletText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        marginTop: 20,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 32,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    gridItem: {
        width: '48%',
        aspectRatio: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    gridItemSelected: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    gridLabel: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#2563EB',
    },
    gridLabelSelected: {
        color: '#FFFFFF',
    },
    checkIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 4,
        borderRadius: 12,
        marginBottom: 40,
        width: '100%',
    },
    toggleBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    toggleTextActive: {
        color: '#0F172A',
    },
    sliderContainer: {
        width: '100%',
        alignItems: 'center',
    },
    salaryValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#2563EB',
        marginBottom: 20,
    },
    salaryUnit: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 8,
    },
    sliderLabelMin: {
        color: '#64748B',
    },
    sliderLabelMax: {
        color: '#64748B',
    },
    optionsContainer: {
        width: '100%',
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#EEF2FF',
    },
    optionTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 14,
        color: '#64748B',
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#2563EB',
    },
    workTypeCard: {
        width: '48%',
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    workTypeCardSelected: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    workTypeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    workTypeLabelSelected: {
        color: '#FFFFFF',
    },
    workTypeSub: {
        fontSize: 12,
        color: '#64748B',
    },
    workTypeSubSelected: {
        color: '#BFDBFE',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        marginBottom: 16,
        width: '100%',
    },
    infoText: {
        marginLeft: 12,
        flex: 1,
        color: '#92400E',
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepIndicator: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    dots: {
        flexDirection: 'row',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E2E8F0',
        marginLeft: 6,
    },
    dotActive: {
        backgroundColor: '#2563EB',
        width: 20,
    },
    button: {
        backgroundColor: '#0F172A',
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
});
