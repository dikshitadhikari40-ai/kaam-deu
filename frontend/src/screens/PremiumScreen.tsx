import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { subscriptionService, TIER_CONFIGS } from '../services/subscription';
import { Subscription, SubscriptionTier } from '../types';

export default function PremiumScreen() {
  const navigation = useNavigation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [remainingDays, setRemainingDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const [sub, tier, days] = await Promise.all([
        subscriptionService.getSubscription(),
        subscriptionService.getCurrentTier(),
        subscriptionService.getRemainingDays(),
      ]);
      setSubscription(sub);
      setCurrentTier(tier);
      setRemainingDays(days);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (tier === 'free') return;

    const config = TIER_CONFIGS.find(t => t.tier === tier);
    if (!config) return;

    Alert.alert(
      `Subscribe to ${config.name}?`,
      `This will cost NPR ${config.price}/month. Payment integration coming soon!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            setSubscribing(tier);
            try {
              await subscriptionService.subscribe(tier);
              await fetchSubscription();
              Alert.alert('Success!', `You are now subscribed to ${config.name}!`);
            } catch (error) {
              console.error('Error subscribing:', error);
              Alert.alert('Error', 'Failed to subscribe. Please try again.');
            } finally {
              setSubscribing(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription?',
      'You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionService.cancelSubscription();
              await fetchSubscription();
              Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.');
            } catch (error) {
              console.error('Error canceling:', error);
              Alert.alert('Error', 'Failed to cancel. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentConfig = TIER_CONFIGS.find(t => t.tier === currentTier);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Plan Card */}
        {currentTier !== 'free' && currentConfig && (
          <View style={[styles.currentPlanCard, { borderColor: currentConfig.color }]}>
            <View style={styles.currentPlanHeader}>
              <View style={[styles.currentPlanIcon, { backgroundColor: `${currentConfig.color}20` }]}>
                <Feather name={currentConfig.icon as any} size={24} color={currentConfig.color} />
              </View>
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanTitle}>{currentConfig.name} Plan</Text>
                <Text style={styles.currentPlanDays}>
                  {remainingDays} days remaining
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Feather name="award" size={40} color={theme.colors.warning} />
          </View>
          <Text style={styles.heroTitle}>Unlock Premium Features</Text>
          <Text style={styles.heroSubtitle}>
            Get more matches, see who likes you, and boost your profile
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          {TIER_CONFIGS.filter(t => t.tier !== 'free').map((config) => {
            const isCurrentPlan = currentTier === config.tier;
            const isSubscribing = subscribing === config.tier;

            return (
              <View
                key={config.tier}
                style={[
                  styles.planCard,
                  config.highlighted && styles.planCardHighlighted,
                  isCurrentPlan && { borderColor: config.color, borderWidth: 2 },
                ]}
              >
                {config.highlighted && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, { backgroundColor: `${config.color}20` }]}>
                    <Feather name={config.icon as any} size={24} color={config.color} />
                  </View>
                  <View style={styles.planTitleContainer}>
                    <Text style={styles.planName}>{config.name}</Text>
                    <Text style={styles.planDescription}>{config.description}</Text>
                  </View>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.priceAmount}>NPR {config.price}</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </View>

                <View style={styles.featuresContainer}>
                  {config.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Feather name="check" size={16} color={theme.colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    { backgroundColor: isCurrentPlan ? theme.colors.card : config.color },
                  ]}
                  onPress={() => handleSubscribe(config.tier)}
                  disabled={isCurrentPlan || !!subscribing}
                >
                  {isSubscribing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      {isCurrentPlan ? 'Current Plan' : `Get ${config.name}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Free Plan Features */}
        <View style={styles.freePlanSection}>
          <Text style={styles.freePlanTitle}>Free Plan Includes</Text>
          <View style={styles.freeFeaturesRow}>
            {TIER_CONFIGS[0].features.map((feature, index) => (
              <View key={index} style={styles.freeFeatureItem}>
                <Feather name="check-circle" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.freeFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do boosts work?</Text>
            <Text style={styles.faqAnswer}>
              Boosts increase your profile visibility for a limited time. Pro members get 1 free boost per month, Premium members get 5.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
            <Text style={styles.faqAnswer}>
              We accept eSewa, Khalti, and bank transfers. More payment options coming soon!
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  currentPlanCard: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 2,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPlanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanInfo: {
    flex: 1,
    marginLeft: 14,
  },
  currentPlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  currentPlanDays: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  plansSection: {
    paddingHorizontal: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planCardHighlighted: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleContainer: {
    marginLeft: 14,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  planDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
  },
  pricePeriod: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  freePlanSection: {
    margin: 16,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  freePlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  freeFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  freeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  freeFeatureText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  faqSection: {
    padding: 16,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
