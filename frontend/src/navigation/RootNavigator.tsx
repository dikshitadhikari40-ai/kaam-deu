import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Linking } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Auth context
import { useAuth } from '../context/AuthContext';

// Components
import { NotificationIcon } from '../components/NotificationIcon';
import BackButton from '../components/BackButton';
import { Feather } from '../components/Icons';

// ===== PERFORMANCE OPTIMIZATION ======
// Core screens are imported normally (fast load for auth & main tabs)
import RoleSelectScreen from '../screens/RoleSelectScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import { WorkerWelcomeScreen } from '../screens/WorkerWelcomeScreen';
import BusinessWelcomeScreen from '../screens/BusinessWelcomeScreen';
import WorkerProfileSetupScreen from '../screens/WorkerProfileSetupScreen';
import BusinessProfileSetupScreen from '../screens/BusinessProfileSetupScreen';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import JobBoardScreen from '../screens/JobBoardScreen';
import BusinessFeedScreen from '../screens/BusinessFeedScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

// Lazy-loaded screens - only loaded when navigated to (reduces initial bundle size)
// These screens are used less frequently, so lazy loading significantly improves startup time
const lazySubscriptionScreen = lazy(() => import('../screens/SubscriptionScreen'));
const lazyTermsOfServiceScreen = lazy(() => import('../screens/TermsOfServiceScreen'));
const lazyPrivacyPolicyScreen = lazy(() => import('../screens/PrivacyPolicyScreen'));
const lazyChatConversationScreen = lazy(() => import('../screens/ChatConversationScreen'));
const lazyChangePasswordScreen = lazy(() => import('../screens/ChangePasswordScreen'));
const lazyBlockedUsersScreen = lazy(() => import('../screens/BlockedUsersScreen'));
const lazyCreateJobPostScreen = lazy(() => import('../screens/CreateJobPostScreen'));
const lazyJobDetailScreen = lazy(() => import('../screens/JobDetailScreen'));
const lazyWriteReviewScreen = lazy(() => import('../screens/WriteReviewScreen'));
const lazyBadgesScreen = lazy(() => import('../screens/BadgesScreen'));
const lazyInsightsScreen = lazy(() => import('../screens/InsightsScreen'));
const lazyBoostScreen = lazy(() => import('../screens/BoostScreen'));
const lazyPremiumScreen = lazy(() => import('../screens/PremiumScreen'));
const lazyCallScreen = lazy(() => import('../screens/CallScreen'));
const lazyWorkIdentityListScreen = lazy(() => import('../screens/WorkIdentityListScreen'));
const lazyEditWorkIdentityScreen = lazy(() => import('../screens/EditWorkIdentityScreen'));
const lazyCVPreviewScreen = lazy(() => import('../screens/CVPreviewScreen'));
const lazyBusinessSearchScreen = lazy(() => import('../screens/BusinessSearchScreen'));
const lazyCompareIdentitiesScreen = lazy(() => import('../screens/CompareIdentitiesScreen'));
const lazyNewsFeedScreen = lazy(() => import('../screens/NewsFeedScreen'));
const lazyLearningResourcesScreen = lazy(() => import('../screens/LearningResourcesScreen'));
const lazyMyCoursesScreen = lazy(() => import('../screens/MyCoursesScreen'));

// Helper wrapper for lazy-loaded screens with Suspense and navigation prop
const createLazyWrapper = (LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>) => {
  return (props: any) => (
    <Suspense fallback={<ScreenLoader />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Create wrapped components for use in navigation
const SubscriptionScreen = createLazyWrapper(lazySubscriptionScreen);
const TermsOfServiceScreen = createLazyWrapper(lazyTermsOfServiceScreen);
const PrivacyPolicyScreen = createLazyWrapper(lazyPrivacyPolicyScreen);
const ChatConversationScreen = createLazyWrapper(lazyChatConversationScreen);
const ChangePasswordScreen = createLazyWrapper(lazyChangePasswordScreen);
const BlockedUsersScreen = createLazyWrapper(lazyBlockedUsersScreen);
const CreateJobPostScreen = createLazyWrapper(lazyCreateJobPostScreen);
const JobDetailScreen = createLazyWrapper(lazyJobDetailScreen);
const WriteReviewScreen = createLazyWrapper(lazyWriteReviewScreen);
const BadgesScreen = createLazyWrapper(lazyBadgesScreen);
const InsightsScreen = createLazyWrapper(lazyInsightsScreen);
const BoostScreen = createLazyWrapper(lazyBoostScreen);
const PremiumScreen = createLazyWrapper(lazyPremiumScreen);
const CallScreen = createLazyWrapper(lazyCallScreen);
const WorkIdentityListScreen = createLazyWrapper(lazyWorkIdentityListScreen);
const EditWorkIdentityScreen = createLazyWrapper(lazyEditWorkIdentityScreen);
const CVPreviewScreen = createLazyWrapper(lazyCVPreviewScreen);
const BusinessSearchScreen = createLazyWrapper(lazyBusinessSearchScreen);
const CompareIdentitiesScreen = createLazyWrapper(lazyCompareIdentitiesScreen);
const NewsFeedScreen = createLazyWrapper(lazyNewsFeedScreen);
const LearningResourcesScreen = createLazyWrapper(lazyLearningResourcesScreen);
const MyCoursesScreen = createLazyWrapper(lazyMyCoursesScreen);

// Named exports - imported directly (only 2 files, minimal impact)
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { IdentityVerificationScreen } from '../screens/IdentityVerificationScreen';

// Fallback loader for lazy screens
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#2557a7" />
  </View>
);

// ====== TYPES ======

export type RootStackParamList = {
  AuthStack: undefined;
  OnboardingStack: undefined;
  ProfileSetupStack: undefined;
  AppStack: undefined;
};

export type AuthStackParamList = {
  RoleSelect: undefined;
  Login: undefined;
  Register: undefined;
  AuthCallback: undefined;
};

export type OnboardingStackParamList = {
  WorkerWelcome: undefined;
  BusinessWelcome: undefined;
};

export type ProfileSetupStackParamList = {
  WorkerProfileSetup: undefined;
  BusinessProfileSetup: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  ChatConversation: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  ChangePassword: undefined;
  BlockedUsers: undefined;
  JobBoard: undefined;
  CreateJobPost: undefined;
  JobDetail: undefined;
  WriteReview: undefined;
  Badges: undefined;
  Insights: undefined;
  Boost: undefined;
  Premium: undefined;
  Subscription: undefined;
  Call: {
    matchId: string;
    matchName: string;
    matchImage: string;
    matchUserId: string;
    callType: 'voice' | 'video';
    isIncoming?: boolean;
    activeCallId?: string;
  };
  // Work Identity screens
  WorkIdentityList: undefined;
  CreateWorkIdentity: undefined;
  EditWorkIdentity: { identityId: string };
  CVPreview: { identityId: string; cvType?: 'worker_confidence' | 'business_decision' };
  BusinessSearch: undefined;
  CompareIdentities: {
    identityIds: string[];
    budgetMax?: number;
    requiredSkills?: string[];
  };
  WorkerIdentityDetail: { identityId: string };
  SendContactRequest: { identityId: string; jobCategory: string };
  NewsFeed: undefined;
  Notifications: undefined;
  Leaderboard: undefined;
  IdentityVerification: undefined;
  LearningResources: undefined;
  MyCourses: undefined;
};

export type AppTabParamList = {
  Swipe: undefined;
  Explore: undefined;
  Feed: undefined;
  Jobs: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
};

// ====== NAVIGATORS ======

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// Theme for navigation
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
    card: '#ffffff',
    text: '#2d2d2d',
    border: '#d4d2d0',
  },
};

// Common screen options with back button
const screenWithBackButton = {
  headerShown: true,
  headerStyle: { backgroundColor: '#ffffff' },
  headerTintColor: '#2557a7',
  headerTitleStyle: { fontWeight: '700' as const },
  headerBackVisible: true,
  headerLeft: () => <BackButton />,
};

// Custom screen options with animations
const animatedScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: 300,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};

// ====== LOADING SCREEN ======
// Simplified loader without Reanimated for faster initial load
const FullScreenLoader = () => {
  return (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderContent}>
        <View style={styles.loaderIconContainer}>
          <ActivityIndicator size="large" color="#2557a7" />
        </View>
        <Text style={styles.loaderText}>Loading Kaam Deu…</Text>
      </View>
    </View>
  );
};

// ====== AUTH STACK (ROLE SELECT + LOGIN + REGISTER) ======

const AuthStackNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        ...animatedScreenOptions,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <AuthStack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          ...screenWithBackButton,
          title: 'Sign In',
          animation: 'slide_from_right',
        }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          ...screenWithBackButton,
          title: 'Sign Up',
          animation: 'slide_from_right',
        }}
      />
      <AuthStack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
    </AuthStack.Navigator>
  );
};

// ====== MAIN TABS ======

const AppTabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#d4d2d0',
          paddingTop: 12,
          height: 85,
          paddingBottom: 24,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#2557a7', // Indeed blue
        tabBarInactiveTintColor: '#6f6f6f', // Gray
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Swipe"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Swipe',
          tabBarIcon: ({ color, size }) => (
            <Feather name="layers" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Feather name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={BusinessFeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Feather name="rss" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobBoardScreen}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Feather name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <NotificationIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ====== APP STACK (TABS + MODALS/DETAIL SCREENS) ======

const AppStackNavigator: React.FC = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        ...animatedScreenOptions,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <AppStack.Screen
        name="MainTabs"
        component={AppTabsNavigator}
        options={{ animation: 'fade' }}
      />
      <AppStack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
        options={{
          ...screenWithBackButton,
          title: 'Chat',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          ...screenWithBackButton,
          title: 'Terms of Service',
          animation: 'slide_from_bottom',
        }}
      />
      <AppStack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          ...screenWithBackButton,
          title: 'Privacy Policy',
          animation: 'slide_from_bottom',
        }}
      />
      <AppStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          ...screenWithBackButton,
          title: 'Change Password',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{
          ...screenWithBackButton,
          title: 'Blocked Users',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="CreateJobPost"
        component={CreateJobPostScreen}
        options={{
          ...screenWithBackButton,
          title: 'Create Job Post',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <AppStack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          ...screenWithBackButton,
          title: 'Job Details',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="WriteReview"
        component={WriteReviewScreen}
        options={{
          ...screenWithBackButton,
          title: 'Write Review',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <AppStack.Screen
        name="Badges"
        component={BadgesScreen}
        options={{
          ...screenWithBackButton,
          title: 'Badges',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          ...screenWithBackButton,
          title: 'Insights',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="Boost"
        component={BoostScreen}
        options={{
          ...screenWithBackButton,
          title: 'Boost Profile',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <AppStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          ...screenWithBackButton,
          title: 'Premium',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <AppStack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          ...screenWithBackButton,
          title: 'Upgrade',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <AppStack.Screen
        name="Call"
        component={CallScreen}
        options={{
          headerShown: false,
          animation: 'fade',
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
      {/* Work Identity Screens */}
      <AppStack.Screen
        name="WorkIdentityList"
        component={WorkIdentityListScreen}
        options={{
          ...screenWithBackButton,
          title: 'Work Identities',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="CreateWorkIdentity"
        component={EditWorkIdentityScreen}
        options={{
          ...screenWithBackButton,
          title: 'New Work Identity',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <AppStack.Screen
        name="EditWorkIdentity"
        component={EditWorkIdentityScreen}
        options={{
          ...screenWithBackButton,
          title: 'Edit Work Identity',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="CVPreview"
        component={CVPreviewScreen}
        options={{
          ...screenWithBackButton,
          title: 'CV Preview',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="BusinessSearch"
        component={BusinessSearchScreen}
        options={{
          ...screenWithBackButton,
          title: 'Find Workers',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="WorkerIdentityDetail"
        component={CVPreviewScreen}
        options={{
          ...screenWithBackButton,
          title: 'Worker Profile',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="CompareIdentities"
        component={CompareIdentitiesScreen}
        options={{
          ...screenWithBackButton,
          title: 'Compare Workers',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="NewsFeed"
        component={NewsFeedScreen}
        options={{
          ...screenWithBackButton,
          title: 'Industry News',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          ...screenWithBackButton,
          title: 'Notifications',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          ...screenWithBackButton,
          title: 'Leaderboard',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="IdentityVerification"
        component={IdentityVerificationScreen}
        options={{
          ...screenWithBackButton,
          title: 'Verification',
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      {/* Learning Resources Screens */}
      <AppStack.Screen
        name="LearningResources"
        component={LearningResourcesScreen}
        options={{
          ...screenWithBackButton,
          title: 'Learning Resources',
          animation: 'slide_from_right',
        }}
      />
      <AppStack.Screen
        name="MyCourses"
        component={MyCoursesScreen}
        options={{
          ...screenWithBackButton,
          title: 'My Courses',
          animation: 'slide_from_right',
        }}
      />
    </AppStack.Navigator>
  );
};

// ====== ONBOARDING FLOWS ======
// These components receive navigation prop from the stack navigator

const WorkerOnboardingFlow: React.FC<{ navigation: any }> = ({ navigation }) => {
  return <WorkerWelcomeScreen />;
};

const BusinessOnboardingFlow: React.FC<{ navigation: any }> = ({ navigation }) => {
  return <BusinessWelcomeScreen navigation={navigation} />;
};

// ====== DEEP LINKING CONFIGURATION ======
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'kaamdeu://',
    'https://kaamdeu.aghealthindustries.com',
    'https://app.kaamdeu.aghealthindustries.com',
    // Add localhost for web OAuth callbacks
    'http://localhost:8081',
    'http://localhost:19006',
  ],
  config: {
    screens: {
      AuthStack: {
        screens: {
          RoleSelect: 'welcome',
          Login: 'login',
          Register: 'register',
          // Handle OAuth callback - redirects to Login which will detect the session
          AuthCallback: 'auth/callback',
          ResetPassword: 'auth/reset-password',
        },
      },
      AppStack: {
        screens: {
          MainTabs: {
            screens: {
              Swipe: 'swipe',
              Explore: 'explore',
              Feed: 'feed',
              Jobs: 'jobs',
              Messages: 'messages',
              Profile: 'profile',
              Settings: 'settings',
            },
          },
          ChatConversation: 'chat/:matchId',
          JobDetail: 'job/:jobId',
          Badges: 'badges',
          Premium: 'premium',
          Subscription: 'subscribe',
          Call: 'call/:matchId',
          WorkIdentityList: 'identities',
          CreateWorkIdentity: 'identities/new',
          EditWorkIdentity: 'identities/:identityId/edit',
          CVPreview: 'identities/:identityId/cv',
          BusinessSearch: 'search/workers',
          WorkerIdentityDetail: 'workers/:identityId',
          NewsFeed: 'news',
          Notifications: 'notifications',
          Leaderboard: 'leaderboard',
          IdentityVerification: 'verify',
        },
      },
    },
  },
  // Handle URL when app is opened from a deep link
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      console.log('[DeepLink] Initial URL:', url);
      return url;
    }
    return null;
  },
  // Listen for incoming deep links while app is running
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] Received URL:', url);
      listener(url);
    });
    return () => subscription.remove();
  },
};

// ====== ROOT NAVIGATOR ======
/**
 * NAVIGATION GUARD RAIL - DO NOT CHANGE ORDER
 *
 * Priority (checked top to bottom):
 * 1. isLoading → SplashScreen
 * 2. !isAuthenticated → AuthStack
 * 3. !hasSeenWelcome → OnboardingStack
 * 4. !isProfileComplete → ProfileSetupStack
 * 5. else → AppStack (main app)
 *
 * Violating this order causes infinite loops.
 */

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isProfileComplete, hasSeenWelcome, effectiveRole, activeRole } = useAuth();
  const prevStateRef = useRef({ isAuthenticated, hasSeenWelcome, isProfileComplete });

  // Track state changes for smooth transitions
  useEffect(() => {
    const prevState = prevStateRef.current;
    if (
      prevState.isAuthenticated !== isAuthenticated ||
      prevState.hasSeenWelcome !== hasSeenWelcome ||
      prevState.isProfileComplete !== isProfileComplete
    ) {
      console.log('[RootNavigator] State transition:', {
        from: prevState,
        to: { isAuthenticated, hasSeenWelcome, isProfileComplete },
      });
      prevStateRef.current = { isAuthenticated, hasSeenWelcome, isProfileComplete };
    }
  }, [isAuthenticated, hasSeenWelcome, isProfileComplete]);

  // Debug logging in dev
  if (__DEV__) {
    console.log('[RootNavigator] State:', {
      isAuthenticated,
      isLoading,
      isProfileComplete,
      hasSeenWelcome,
      effectiveRole,
      activeRole,
    });
  }

  if (isLoading) {
    return <FullScreenLoader />;
  }

  // Use activeRole for dual profile support - this determines which flow to show
  const currentRole = activeRole || effectiveRole;

  // Determine which onboarding component based on role
  const OnboardingComponent = currentRole === 'business'
    ? BusinessOnboardingFlow
    : WorkerOnboardingFlow;

  // Determine which profile setup component based on role
  const ProfileSetupComponent = currentRole === 'business'
    ? BusinessProfileSetupScreen
    : WorkerProfileSetupScreen;

  // Determine current navigation state key for smooth transitions
  const getNavigationState = () => {
    if (!isAuthenticated) return 'auth';
    if (!hasSeenWelcome) return 'onboarding';
    if (!isProfileComplete) return 'profile-setup';
    return 'app';
  };

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 350,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      >
        {!isAuthenticated ? (
          // Auth Flow - Before Login
          <RootStack.Screen
            name="AuthStack"
            component={AuthStackNavigator}
            options={{ animation: 'fade' }}
          />
        ) : !hasSeenWelcome ? (
          // Onboarding Flow - After Login, shows role-specific welcome
          <RootStack.Screen
            name="OnboardingStack"
            component={OnboardingComponent}
            options={{ animation: 'fade' }}
          />
        ) : !isProfileComplete ? (
          // Profile Setup Flow - After Welcome, before main app
          <RootStack.Screen
            name="ProfileSetupStack"
            component={ProfileSetupComponent}
            options={{
              ...screenWithBackButton,
              title: currentRole === 'business' ? 'Business Profile' : 'Your Profile',
              animation: 'slide_from_right',
            }}
          />
        ) : (
          // Main App - Use fade for smooth entry
          <RootStack.Screen
            name="AppStack"
            component={AppStackNavigator}
            options={{ animation: 'fade' }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// ====== STYLES ======

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    alignItems: 'center',
    padding: 24,
  },
  loaderIconContainer: {
    marginBottom: 16,
  },
  loaderText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default RootNavigator;
