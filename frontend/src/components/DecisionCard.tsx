/**
 * Decision Card Component
 *
 * Displays a work identity as a "Decision Card" for business users.
 * Shows capability score, fit metrics, and a one-line explanation of why this worker fits.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import {
  DecisionCardResult,
  getCapabilityDisplay,
  AVAILABILITY_LABELS,
  EXPERIENCE_LEVEL_LABELS,
} from '../types/workIdentity';

interface DecisionCardProps {
  card: DecisionCardResult;
  isSelected?: boolean;
  onPress?: () => void;
  onSelect?: () => void;
  onContact?: () => void;
  showSelectMode?: boolean;
}

export default function DecisionCard({
  card,
  isSelected = false,
  onPress,
  onSelect,
  onContact,
  showSelectMode = false,
}: DecisionCardProps) {
  const capability = getCapabilityDisplay(card.capability_score);

  // Get fit color based on overall score
  const getFitColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return theme.colors.warning;
    return theme.colors.textMuted;
  };

  const fitColor = getFitColor(card.overall_fit_score);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.containerSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Selection checkbox in compare mode */}
      {showSelectMode && (
        <TouchableOpacity
          style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          onPress={onSelect}
        >
          {isSelected && (
            <Feather name="check" size={14} color={theme.colors.text} />
          )}
        </TouchableOpacity>
      )}

      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons
              name="briefcase-variant"
              size={14}
              color={theme.colors.accent}
            />
            <Text style={styles.categoryText}>{card.job_category}</Text>
          </View>
          {card.is_remote_ok && (
            <View style={styles.remoteBadge}>
              <Feather name="globe" size={10} color={theme.colors.primary} />
            </View>
          )}
        </View>

        {/* Overall Fit Score */}
        <View style={[styles.fitBadge, { backgroundColor: `${fitColor}20` }]}>
          <Text style={[styles.fitScore, { color: fitColor }]}>
            {card.overall_fit_score}% fit
          </Text>
        </View>
      </View>

      {/* Job Title */}
      {card.job_title && (
        <Text style={styles.jobTitle} numberOfLines={1}>
          {card.job_title}
        </Text>
      )}

      {/* Capability & Experience Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <View style={[styles.capabilityCircle, { borderColor: capability.color }]}>
            <Text style={[styles.capabilityScore, { color: capability.color }]}>
              {card.capability_score}
            </Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>{capability.label}</Text>
            <Text style={styles.metricSubtext}>Capability</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Feather name="award" size={20} color={theme.colors.textSecondary} />
          <View>
            <Text style={styles.metricLabel}>
              {EXPERIENCE_LEVEL_LABELS[card.experience_level].split(' ')[0]}
            </Text>
            <Text style={styles.metricSubtext}>{card.experience_years} yrs</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Feather name="tool" size={20} color={theme.colors.textSecondary} />
          <View>
            <Text style={styles.metricLabel}>{card.skill_count}</Text>
            <Text style={styles.metricSubtext}>
              {card.verified_skill_count > 0 ? `${card.verified_skill_count} verified` : 'Skills'}
            </Text>
          </View>
        </View>
      </View>

      {/* Fit Indicators */}
      <View style={styles.fitIndicators}>
        <View style={styles.fitItem}>
          <Text style={styles.fitLabel}>Pay Fit</Text>
          <View style={styles.fitBar}>
            <View
              style={[
                styles.fitBarFill,
                {
                  width: `${card.pay_fit_score}%`,
                  backgroundColor: card.pay_fit_score >= 70 ? theme.colors.success : theme.colors.warning,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.fitItem}>
          <Text style={styles.fitLabel}>Availability</Text>
          <View style={styles.fitBar}>
            <View
              style={[
                styles.fitBarFill,
                {
                  width: `${card.availability_score}%`,
                  backgroundColor: card.availability_score >= 70 ? theme.colors.success : theme.colors.warning,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Feather name="clock" size={12} color={theme.colors.textMuted} />
          <Text style={styles.detailText}>
            {AVAILABILITY_LABELS[card.availability]}
          </Text>
        </View>
        {(card.expected_pay_min || card.expected_pay_max) && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="cash" size={12} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              Rs. {card.expected_pay_min?.toLocaleString() || '?'}
              {card.expected_pay_max && ` - ${card.expected_pay_max.toLocaleString()}`}
            </Text>
          </View>
        )}
      </View>

      {/* Matching Skills Badge */}
      {card.matching_skill_count > 0 && (
        <View style={styles.matchingBadge}>
          <Feather name="check-circle" size={12} color={theme.colors.success} />
          <Text style={styles.matchingText}>
            Matches {card.matching_skill_count} required skill{card.matching_skill_count > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Explanation Box */}
      <View style={styles.explanationBox}>
        <Feather name="zap" size={14} color={theme.colors.accent} />
        <Text style={styles.explanationText} numberOfLines={2}>
          {card.explanation}
        </Text>
      </View>

      {/* Explanation Points (collapsed) */}
      {card.explanation_points && card.explanation_points.length > 3 && (
        <View style={styles.morePoints}>
          <Text style={styles.morePointsText}>
            +{card.explanation_points.length - 3} more highlights
          </Text>
        </View>
      )}

      {/* Actions */}
      {!showSelectMode && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewButton} onPress={onPress}>
            <Feather name="eye" size={16} color={theme.colors.accent} />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={onContact}>
            <Feather name="mail" size={16} color={theme.colors.text} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  containerSelected: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
    backgroundColor: `${theme.colors.accent}08`,
  },
  checkbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    zIndex: 1,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  remoteBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fitScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  capabilityCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  capabilityScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricSubtext: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  fitIndicators: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  fitItem: {
    flex: 1,
  },
  fitLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  fitBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  fitBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  matchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  matchingText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
  },
  explanationBox: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.accent}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: 'flex-start',
  },
  explanationText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  morePoints: {
    marginTop: 8,
    alignItems: 'center',
  },
  morePointsText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
