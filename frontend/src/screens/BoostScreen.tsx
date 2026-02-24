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
import { boostService, BOOST_CONFIGS } from '../services/boosts';
import { Boost, BoostType } from '../types';

export default function BoostScreen() {
  const navigation = useNavigation();
  const [activeBoost, setActiveBoost] = useState<Boost | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<BoostType | null>(null);

  useEffect(() => {
    fetchBoostStatus();
  }, []);

  useEffect(() => {
    // Update remaining time every minute
    if (activeBoost) {
      const interval = setInterval(async () => {
        const remaining = await boostService.getBoostRemainingTime();
        setRemainingTime(remaining);
        if (remaining <= 0) {
          setActiveBoost(null);
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [activeBoost]);

  const fetchBoostStatus = async () => {
    try {
      const boost = await boostService.getActiveBoost();
      setActiveBoost(boost);
      if (boost) {
        const remaining = await boostService.getBoostRemainingTime();
        setRemainingTime(remaining);
      }
    } catch (error) {
      console.error('Error fetching boost status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateBoost = async (type: BoostType) => {
    const config = BOOST_CONFIGS.find(b => b.type === type);
    if (!config) return;

    Alert.alert(
      `Activate ${config.name}?`,
      `This will cost NPR ${config.price} and last for ${
        config.duration_minutes >= 60
          ? `${config.duration_minutes / 60} hours`
          : `${config.duration_minutes} minutes`
      }.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            setActivating(type);
            try {
              const boost = await boostService.activateBoost(type);
              setActiveBoost(boost);
              const remaining = await boostService.getBoostRemainingTime();
              setRemainingTime(remaining);
              Alert.alert('Boost Activated!', `Your ${config.name} is now active.`);
            } catch (error) {
              console.error('Error activating boost:', error);
              Alert.alert('Error', 'Failed to activate boost. Please try again.');
            } finally {
              setActivating(null);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Boost</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Active Boost Card */}
        {activeBoost && (
          <View style={styles.activeBoostCard}>
            <View style={styles.activeBoostHeader}>
              <View style={styles.activeBoostIcon}>
                <Feather
                  name={boostService.getBoostConfig(activeBoost.boost_type as BoostType)?.icon as any || 'zap'}
                  size={28}
                  color={boostService.getBoostConfig(activeBoost.boost_type as BoostType)?.color || theme.colors.accent}
                />
              </View>
              <View style={styles.activeBoostInfo}>
                <Text style={styles.activeBoostTitle}>
                  {boostService.getBoostConfig(activeBoost.boost_type as BoostType)?.name || 'Boost Active'}
                </Text>
                <Text style={styles.activeBoostTime}>
                  {boostService.formatRemainingTime(remainingTime)}
                </Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(100, (remainingTime / (boostService.getBoostConfig(activeBoost.boost_type as BoostType)?.duration_minutes || 30)) * 100)}%`,
                    backgroundColor: boostService.getBoostConfig(activeBoost.boost_type as BoostType)?.color || theme.colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.activeBoostDesc}>
              Your profile is getting {boostService.getBoostConfig(activeBoost.boost_type as BoostType)?.multiplier}x more visibility!
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Boosting your profile increases your visibility in the feed. More people will see you!
          </Text>
        </View>

        {/* Boost Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Boost</Text>

          {BOOST_CONFIGS.map((config) => {
            const isActive = activeBoost?.boost_type === config.type;
            const isActivating = activating === config.type;

            return (
              <TouchableOpacity
                key={config.type}
                style={[
                  styles.boostCard,
                  isActive && styles.boostCardActive,
                  { borderColor: isActive ? config.color : theme.colors.border },
                ]}
                onPress={() => !isActive && !activating && handleActivateBoost(config.type)}
                disabled={isActive || !!activating}
              >
                <View style={[styles.boostIcon, { backgroundColor: `${config.color}20` }]}>
                  <Feather name={config.icon as any} size={24} color={config.color} />
                </View>

                <View style={styles.boostInfo}>
                  <View style={styles.boostHeader}>
                    <Text style={styles.boostName}>{config.name}</Text>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: config.color }]}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.boostDesc}>{config.description}</Text>
                  <View style={styles.boostMeta}>
                    <View style={styles.boostDuration}>
                      <Feather name="clock" size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.boostDurationText}>
                        {config.duration_minutes >= 60
                          ? `${config.duration_minutes / 60} hours`
                          : `${config.duration_minutes} min`}
                      </Text>
                    </View>
                    <View style={styles.boostMultiplier}>
                      <Feather name="trending-up" size={12} color={config.color} />
                      <Text style={[styles.boostMultiplierText, { color: config.color }]}>
                        {config.multiplier}x visibility
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.boostPriceContainer}>
                  {isActivating ? (
                    <ActivityIndicator size="small" color={config.color} />
                  ) : isActive ? (
                    <Feather name="check-circle" size={24} color={config.color} />
                  ) : (
                    <>
                      <Text style={styles.boostPrice}>NPR {config.price}</Text>
                      <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits of Boosting</Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                <Feather name="eye" size={18} color={theme.colors.success} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>More Profile Views</Text>
                <Text style={styles.benefitDesc}>Get seen by more potential matches</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${theme.colors.error}20` }]}>
                <Feather name="heart" size={18} color={theme.colors.error} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>More Matches</Text>
                <Text style={styles.benefitDesc}>Higher visibility leads to more connections</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Feather name="star" size={18} color={theme.colors.warning} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Priority Placement</Text>
                <Text style={styles.benefitDesc}>Appear at the top of the feed</Text>
              </View>
            </View>
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
  activeBoostCard: {
    margin: 16,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  activeBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  activeBoostIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBoostInfo: {
    flex: 1,
  },
  activeBoostTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  activeBoostTime: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: theme.colors.card,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  activeBoostDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: `${theme.colors.info}15`,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.info,
    lineHeight: 18,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  boostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  boostCardActive: {
    backgroundColor: theme.colors.card,
  },
  boostIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostInfo: {
    flex: 1,
    marginLeft: 14,
  },
  boostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boostName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  boostDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  boostMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  boostDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  boostDurationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  boostMultiplier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  boostMultiplierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  boostPriceContainer: {
    alignItems: 'flex-end',
  },
  boostPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  benefitDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
