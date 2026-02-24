import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import {
  PRODUCTS,
  Product,
  esewaPaymentService,
  subscriptionService,
  creditsService,
  Subscription,
  UserCredits,
} from '../services/payment';

const { width } = Dimensions.get('window');

type TabType = 'subscription' | 'boosts' | 'super_likes';

export default function SubscriptionScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('subscription');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [sub, userCredits] = await Promise.all([
        subscriptionService.getCurrentSubscription(user.id),
        creditsService.getUserCredits(user.id),
      ]);
      setCurrentSubscription(sub);
      setCredits(userCredits);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: Product) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to make a purchase');
      return;
    }

    setPurchasing(product.id);
    try {
      const result = await esewaPaymentService.initiatePayment(product, user.id);

      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `Your ${product.name} has been activated.`,
          [{ text: 'OK', onPress: loadUserData }]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Payment failed');
    } finally {
      setPurchasing(null);
    }
  };

  const getSubscriptionProducts = () => {
    return PRODUCTS.filter(p => p.type === 'subscription').filter(p => {
      if (selectedBilling === 'monthly') {
        return p.id.includes('monthly');
      }
      return p.id.includes('yearly');
    });
  };

  const getBoostProducts = () => PRODUCTS.filter(p => p.type === 'boost');
  const getSuperLikeProducts = () => PRODUCTS.filter(p => p.type === 'super_like');

  const renderFeatureItem = (icon: string, text: string, included: boolean) => (
    <View style={styles.featureItem} key={text}>
      <Feather
        name={included ? 'check-circle' : 'x-circle'}
        size={18}
        color={included ? theme.colors.success : theme.colors.textMuted}
      />
      <Text style={[styles.featureText, !included && styles.featureTextMuted]}>
        {text}
      </Text>
    </View>
  );

  const renderSubscriptionCard = (product: Product, tierType: 'pro' | 'premium') => {
    const isPremium = tierType === 'premium';
    const isCurrentPlan = currentSubscription?.tier === tierType;
    const features = isPremium
      ? [
          { text: 'Unlimited swipes', included: true },
          { text: 'See who liked you', included: true },
          { text: 'Unlimited super likes', included: true },
          { text: 'Priority matching', included: true },
          { text: '5 free boosts/month', included: true },
          { text: 'Read receipts', included: true },
          { text: 'Advanced filters', included: true },
          { text: 'No ads', included: true },
        ]
      : [
          { text: 'Unlimited swipes', included: true },
          { text: 'See who liked you', included: true },
          { text: '5 super likes/day', included: true },
          { text: 'Priority matching', included: false },
          { text: '1 free boost/month', included: true },
          { text: 'Read receipts', included: false },
          { text: 'Advanced filters', included: true },
          { text: 'No ads', included: true },
        ];

    return (
      <View
        style={[
          styles.subscriptionCard,
          isPremium && styles.premiumCard,
          isCurrentPlan && styles.currentPlanCard,
        ]}
      >
        {isPremium && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name={isPremium ? 'crown' : 'star'}
            size={28}
            color={isPremium ? theme.colors.secondary : theme.colors.accent}
          />
          <Text style={styles.tierName}>{isPremium ? 'Premium' : 'Pro'}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currencySymbol}>रू</Text>
          <Text style={styles.price}>{product.price}</Text>
          <Text style={styles.period}>
            /{selectedBilling === 'monthly' ? 'mo' : 'yr'}
          </Text>
        </View>

        {selectedBilling === 'yearly' && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              Save {isPremium ? '50%' : '40%'}
            </Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {features.map(f => renderFeatureItem('check', f.text, f.included))}
        </View>

        <TouchableOpacity
          style={[
            styles.purchaseButton,
            isPremium && styles.premiumButton,
            isCurrentPlan && styles.currentPlanButton,
            purchasing === product.id && styles.purchasingButton,
          ]}
          onPress={() => handlePurchase(product)}
          disabled={purchasing !== null || isCurrentPlan}
        >
          {purchasing === product.id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {isCurrentPlan ? 'Current Plan' : `Get ${isPremium ? 'Premium' : 'Pro'}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderBoostCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.boostCard}
      onPress={() => handlePurchase(product)}
      disabled={purchasing !== null}
    >
      <View style={styles.boostIconContainer}>
        <MaterialCommunityIcons name="lightning-bolt" size={32} color={theme.colors.warning} />
        {product.quantity && product.quantity > 1 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{product.quantity}x</Text>
          </View>
        )}
      </View>
      <Text style={styles.boostName}>{product.name}</Text>
      <Text style={styles.boostDescription}>{product.description}</Text>
      <View style={styles.boostPriceContainer}>
        <Text style={styles.boostPrice}>रू {product.price}</Text>
      </View>
      {purchasing === product.id && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSuperLikeCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.superLikeCard}
      onPress={() => handlePurchase(product)}
      disabled={purchasing !== null}
    >
      <View style={styles.superLikeIconContainer}>
        <MaterialCommunityIcons name="star" size={32} color={theme.colors.accent} />
        {product.quantity && product.quantity > 1 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{product.quantity}x</Text>
          </View>
        )}
      </View>
      <Text style={styles.superLikeName}>{product.name}</Text>
      <Text style={styles.superLikeDescription}>{product.description}</Text>
      <View style={styles.superLikePriceContainer}>
        <Text style={styles.superLikePrice}>रू {product.price}</Text>
      </View>
      {purchasing === product.id && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Current Credits */}
      {credits && (
        <View style={styles.creditsBar}>
          <View style={styles.creditItem}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color={theme.colors.warning} />
            <Text style={styles.creditCount}>{credits.boosts}</Text>
          </View>
          <View style={styles.creditItem}>
            <MaterialCommunityIcons name="star" size={18} color={theme.colors.accent} />
            <Text style={styles.creditCount}>{credits.super_likes}</Text>
          </View>
          <View style={styles.creditItem}>
            <MaterialCommunityIcons name="spotlight-beam" size={18} color={theme.colors.secondary} />
            <Text style={styles.creditCount}>{credits.spotlights}</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscription' && styles.activeTab]}
          onPress={() => setActiveTab('subscription')}
        >
          <Text style={[styles.tabText, activeTab === 'subscription' && styles.activeTabText]}>
            Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'boosts' && styles.activeTab]}
          onPress={() => setActiveTab('boosts')}
        >
          <Text style={[styles.tabText, activeTab === 'boosts' && styles.activeTabText]}>
            Boosts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'super_likes' && styles.activeTab]}
          onPress={() => setActiveTab('super_likes')}
        >
          <Text style={[styles.tabText, activeTab === 'super_likes' && styles.activeTabText]}>
            Super Likes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'subscription' && (
          <>
            {/* Billing Toggle */}
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[
                  styles.billingOption,
                  selectedBilling === 'monthly' && styles.billingOptionActive,
                ]}
                onPress={() => setSelectedBilling('monthly')}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    selectedBilling === 'monthly' && styles.billingOptionTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.billingOption,
                  selectedBilling === 'yearly' && styles.billingOptionActive,
                ]}
                onPress={() => setSelectedBilling('yearly')}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    selectedBilling === 'yearly' && styles.billingOptionTextActive,
                  ]}
                >
                  Yearly
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>SAVE 40%+</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Subscription Cards */}
            <View style={styles.subscriptionCards}>
              {getSubscriptionProducts().map(product => {
                const tierType = product.id.includes('premium') ? 'premium' : 'pro';
                return (
                  <View key={product.id} style={styles.subscriptionCardWrapper}>
                    {renderSubscriptionCard(product, tierType)}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {activeTab === 'boosts' && (
          <View style={styles.boostsGrid}>
            {getBoostProducts().map(renderBoostCard)}
            {/* Spotlight */}
            {PRODUCTS.filter(p => p.type === 'spotlight').map(product => (
              <TouchableOpacity
                key={product.id}
                style={[styles.boostCard, styles.spotlightCard]}
                onPress={() => handlePurchase(product)}
                disabled={purchasing !== null}
              >
                <View style={styles.boostIconContainer}>
                  <MaterialCommunityIcons
                    name="spotlight-beam"
                    size={32}
                    color={theme.colors.secondary}
                  />
                </View>
                <Text style={styles.boostName}>{product.name}</Text>
                <Text style={styles.boostDescription}>{product.description}</Text>
                <View style={styles.boostPriceContainer}>
                  <Text style={styles.boostPrice}>रू {product.price}</Text>
                </View>
                {purchasing === product.id && (
                  <View style={styles.purchasingOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'super_likes' && (
          <View style={styles.superLikesGrid}>
            {getSuperLikeProducts().map(renderSuperLikeCard)}
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <View style={styles.paymentMethodContainer}>
            <Text style={styles.paymentMethodLabel}>Pay securely with</Text>
            <View style={styles.esewaLogo}>
              <Text style={styles.esewaText}>eSewa</Text>
            </View>
          </View>
          <Text style={styles.paymentNote}>
            Payments are processed securely through eSewa. Your subscription will be activated
            immediately after successful payment.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerRight: {
    width: 40,
  },
  creditsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 24,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditCount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: theme.colors.accent,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  billingOptionTextActive: {
    color: theme.colors.text,
  },
  saveBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  subscriptionCards: {
    gap: 16,
  },
  subscriptionCardWrapper: {
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  premiumCard: {
    borderColor: theme.colors.secondary,
  },
  currentPlanCard: {
    borderColor: theme.colors.success,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  tierName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
  },
  period: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
  },
  featuresContainer: {
    marginBottom: 20,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  featureTextMuted: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  purchaseButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumButton: {
    backgroundColor: theme.colors.secondary,
  },
  currentPlanButton: {
    backgroundColor: theme.colors.success,
  },
  purchasingButton: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  boostsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  boostCard: {
    width: (width - 44) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  spotlightCard: {
    borderColor: theme.colors.secondary,
  },
  boostIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  boostName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  boostDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  boostPriceContainer: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  boostPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  superLikesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  superLikeCard: {
    width: (width - 44) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  superLikeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  superLikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  superLikeDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  superLikePriceContainer: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  superLikePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  esewaLogo: {
    backgroundColor: '#60BB46',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  esewaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  paymentNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});
