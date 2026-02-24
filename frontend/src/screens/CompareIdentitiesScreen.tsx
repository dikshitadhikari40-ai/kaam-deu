/**
 * Compare Identities Screen
 *
 * Allows business users to compare up to 5 work identities side by side.
 * Premium feature - requires business premium subscription.
 */

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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { workIdentityService } from '../services/workIdentityService';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import {
  CompareIdentityResult,
  getCapabilityDisplay,
  AVAILABILITY_LABELS,
  EXPERIENCE_LEVEL_LABELS,
} from '../types/workIdentity';

interface Props {
  navigation: any;
  route: {
    params: {
      identityIds: string[];
      budgetMax?: number;
      requiredSkills?: string[];
    };
  };
}

export default function CompareIdentitiesScreen({ navigation, route }: Props) {
  const { identityIds, budgetMax, requiredSkills } = route.params;

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CompareIdentityResult[]>([]);

  // Use the premium access hook (respects BETA_MODE)
  const { can_compare, loading: premiumLoading } = usePremiumAccess();

  useEffect(() => {
    if (!premiumLoading) {
      loadComparison();
    }
  }, [identityIds, premiumLoading, can_compare]);

  const loadComparison = async () => {
    try {
      if (!can_compare) {
        setLoading(false);
        return;
      }

      const data = await workIdentityService.compareIdentities(
        identityIds,
        budgetMax,
        requiredSkills
      );
      setResults(data);
    } catch (error) {
      console.error('Compare error:', error);
      Alert.alert('Error', 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (identityId: string) => {
    const identity = results.find(r => r.identity_id === identityId);
    navigation.navigate('SendContactRequest', {
      identityId,
      jobCategory: identity?.job_category,
    });
  };

  const handleViewProfile = (identityId: string) => {
    navigation.navigate('WorkerIdentityDetail', { identityId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading comparison...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Premium gate
  if (!can_compare) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Compare Workers</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.premiumGate}>
          <View style={styles.premiumIcon}>
            <MaterialCommunityIcons
              name="crown"
              size={48}
              color={theme.colors.warning}
            />
          </View>
          <Text style={styles.premiumTitle}>Premium Feature</Text>
          <Text style={styles.premiumText}>
            Compare workers side-by-side to make better hiring decisions.
            Upgrade to Pro or Business to unlock this feature.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Premium')}
          >
            <Feather name="zap" size={20} color={theme.colors.text} />
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Compare ({results.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.comparisonContainer}>
          {/* Labels Column */}
          <View style={styles.labelsColumn}>
            <View style={styles.labelHeader} />
            <View style={styles.labelRow}><Text style={styles.label}>Category</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Overall Fit</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Capability</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Experience</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Pay Range</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Availability</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Skills</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Verified Skills</Text></View>
            <View style={[styles.labelRow, { height: 80 }]}><Text style={styles.label}>Strengths</Text></View>
            <View style={[styles.labelRow, { height: 60 }]}><Text style={styles.label}>Consider</Text></View>
            <View style={styles.labelRow}><Text style={styles.label}>Actions</Text></View>
          </View>

          {/* Identity Columns */}
          {results.map((identity, index) => {
            const capability = getCapabilityDisplay(identity.capability_score);
            const isWinner = identity.overall_fit_score === Math.max(...results.map(r => r.overall_fit_score));

            return (
              <View
                key={identity.identity_id}
                style={[
                  styles.identityColumn,
                  isWinner && styles.winnerColumn,
                ]}
              >
                {/* Header */}
                <View style={[styles.columnHeader, isWinner && styles.winnerHeader]}>
                  {isWinner && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>Best Match</Text>
                    </View>
                  )}
                  <Text style={styles.columnTitle} numberOfLines={1}>
                    {identity.job_title || identity.job_category}
                  </Text>
                  <Text style={styles.columnSubtitle}>Worker {index + 1}</Text>
                </View>

                {/* Category */}
                <View style={styles.valueRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{identity.job_category}</Text>
                  </View>
                </View>

                {/* Overall Fit */}
                <View style={styles.valueRow}>
                  <View style={[
                    styles.fitCircle,
                    { backgroundColor: identity.overall_fit_score >= 70 ? `${theme.colors.success}20` : `${theme.colors.warning}20` }
                  ]}>
                    <Text style={[
                      styles.fitValue,
                      { color: identity.overall_fit_score >= 70 ? theme.colors.success : theme.colors.warning }
                    ]}>
                      {identity.overall_fit_score}%
                    </Text>
                  </View>
                </View>

                {/* Capability */}
                <View style={styles.valueRow}>
                  <View style={[styles.capabilityBadge, { borderColor: capability.color }]}>
                    <Text style={[styles.capabilityValue, { color: capability.color }]}>
                      {identity.capability_score}
                    </Text>
                  </View>
                  <Text style={styles.capabilityLabel}>{capability.label}</Text>
                </View>

                {/* Experience */}
                <View style={styles.valueRow}>
                  <Text style={styles.valueText}>
                    {EXPERIENCE_LEVEL_LABELS[identity.experience_level].split(' ')[0]}
                  </Text>
                  <Text style={styles.valueSubtext}>{identity.experience_years} years</Text>
                </View>

                {/* Pay Range */}
                <View style={styles.valueRow}>
                  <Text style={styles.valueText}>{identity.pay_range}</Text>
                  <View style={[
                    styles.payFitIndicator,
                    { backgroundColor: identity.pay_fit_score >= 70 ? theme.colors.success : theme.colors.warning }
                  ]}>
                    <Text style={styles.payFitText}>
                      {identity.pay_fit_score >= 70 ? 'In Budget' : 'Near Budget'}
                    </Text>
                  </View>
                </View>

                {/* Availability */}
                <View style={styles.valueRow}>
                  <Text style={styles.valueText}>
                    {AVAILABILITY_LABELS[identity.availability]}
                  </Text>
                </View>

                {/* Skills */}
                <View style={styles.valueRow}>
                  <Text style={styles.valueText}>{identity.skill_count} skills</Text>
                  {identity.matching_skill_count > 0 && (
                    <Text style={styles.matchingSkills}>
                      {identity.matching_skill_count} match
                    </Text>
                  )}
                </View>

                {/* Verified Skills */}
                <View style={styles.valueRow}>
                  <Text style={[
                    styles.valueText,
                    identity.verified_skill_count > 0 && { color: theme.colors.success }
                  ]}>
                    {identity.verified_skill_count > 0 ? `${identity.verified_skill_count} verified` : 'None'}
                  </Text>
                </View>

                {/* Strengths */}
                <View style={[styles.valueRow, { height: 80, alignItems: 'flex-start' }]}>
                  <View style={styles.bulletList}>
                    {identity.strengths.slice(0, 3).map((strength, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <Feather name="check" size={10} color={theme.colors.success} />
                        <Text style={styles.bulletText} numberOfLines={1}>{strength}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Considerations */}
                <View style={[styles.valueRow, { height: 60, alignItems: 'flex-start' }]}>
                  <View style={styles.bulletList}>
                    {identity.considerations.slice(0, 2).map((item, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <Feather name="alert-circle" size={10} color={theme.colors.warning} />
                        <Text style={styles.bulletTextWarning} numberOfLines={1}>{item}</Text>
                      </View>
                    ))}
                    {identity.considerations.length === 0 && (
                      <Text style={styles.noneText}>No concerns</Text>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.valueRow}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => handleViewProfile(identity.identity_id)}
                    >
                      <Feather name="eye" size={14} color={theme.colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleContact(identity.identity_id)}
                    >
                      <Feather name="mail" size={14} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Summary */}
      <View style={styles.bottomSummary}>
        <Text style={styles.summaryText}>
          Comparing {results.length} worker{results.length > 1 ? 's' : ''} •
          {budgetMax ? ` Budget: Rs. ${budgetMax.toLocaleString()}` : ' No budget set'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const COLUMN_WIDTH = 150;

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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  premiumIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${theme.colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  premiumText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  comparisonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  labelsColumn: {
    width: 100,
  },
  labelHeader: {
    height: 80,
  },
  labelRow: {
    height: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  identityColumn: {
    width: COLUMN_WIDTH,
    marginLeft: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  winnerColumn: {
    borderColor: theme.colors.success,
    borderWidth: 2,
  },
  columnHeader: {
    height: 80,
    padding: 12,
    backgroundColor: theme.colors.card,
    justifyContent: 'flex-end',
  },
  winnerHeader: {
    backgroundColor: `${theme.colors.success}15`,
  },
  bestBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.text,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  columnSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  valueRow: {
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryBadge: {
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  fitCircle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fitValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  capabilityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  capabilityValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  capabilityLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
  },
  valueSubtext: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  payFitIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  payFitText: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.text,
  },
  matchingSkills: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.success,
    marginTop: 2,
  },
  bulletList: {
    width: '100%',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  bulletText: {
    fontSize: 10,
    color: theme.colors.text,
    flex: 1,
  },
  bulletTextWarning: {
    fontSize: 10,
    color: theme.colors.warning,
    flex: 1,
  },
  noneText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
