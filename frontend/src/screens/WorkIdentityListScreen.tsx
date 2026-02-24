/**
 * Work Identity List Screen
 *
 * Main dashboard for workers to view and manage their work identities.
 * Shows capability scores, visibility status, and CV previews.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { workIdentityService } from '../services/workIdentityService';
import {
  WorkIdentity,
  getCapabilityDisplay,
  formatPayRange,
  AVAILABILITY_LABELS,
  EXPERIENCE_LEVEL_LABELS,
} from '../types/workIdentity';

interface Props {
  navigation: any;
}

export default function WorkIdentityListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [identities, setIdentities] = useState<WorkIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIdentities = useCallback(async () => {
    try {
      const data = await workIdentityService.getMyIdentities();
      setIdentities(data);
    } catch (error) {
      console.error('Error fetching identities:', error);
      Alert.alert('Error', 'Failed to load work identities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIdentities();
  }, [fetchIdentities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIdentities();
  }, [fetchIdentities]);

  const handleToggleVisibility = async (identity: WorkIdentity) => {
    const newStatus = identity.visibility_status === 'active' ? 'hidden' : 'active';
    try {
      await workIdentityService.toggleVisibility(identity.id, newStatus);
      fetchIdentities();
    } catch (error) {
      Alert.alert('Error', 'Failed to update visibility');
    }
  };

  const handleDeleteIdentity = (identity: WorkIdentity) => {
    Alert.alert(
      'Delete Work Identity',
      `Are you sure you want to delete your ${identity.job_category} identity? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workIdentityService.deleteIdentity(identity.id);
              fetchIdentities();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete identity');
            }
          },
        },
      ]
    );
  };

  const renderIdentityCard = (identity: WorkIdentity) => {
    const capability = getCapabilityDisplay(identity.capability_score);
    const isActive = identity.visibility_status === 'active';

    return (
      <TouchableOpacity
        key={identity.id}
        style={[styles.identityCard, !isActive && styles.identityCardInactive]}
        onPress={() => navigation.navigate('EditWorkIdentity', { identityId: identity.id })}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons
              name="briefcase-variant"
              size={16}
              color={theme.colors.accent}
            />
            <Text style={styles.categoryText}>{identity.job_category}</Text>
          </View>
          {identity.is_primary && (
            <View style={styles.primaryBadge}>
              <Feather name="star" size={12} color={theme.colors.warning} />
              <Text style={styles.primaryText}>Primary</Text>
            </View>
          )}
        </View>

        {/* Job Title */}
        {identity.job_title && (
          <Text style={styles.jobTitle}>{identity.job_title}</Text>
        )}

        {/* Capability Score */}
        <View style={styles.capabilityRow}>
          <View style={styles.capabilityContainer}>
            <View style={[styles.capabilityCircle, { borderColor: capability.color }]}>
              <Text style={[styles.capabilityScore, { color: capability.color }]}>
                {identity.capability_score}
              </Text>
            </View>
            <View style={styles.capabilityInfo}>
              <Text style={[styles.capabilityLabel, { color: capability.color }]}>
                {capability.label}
              </Text>
              <Text style={styles.experienceText}>
                {EXPERIENCE_LEVEL_LABELS[identity.experience_level]}
              </Text>
            </View>
          </View>

          {/* Visibility Toggle */}
          <TouchableOpacity
            style={[styles.visibilityButton, isActive && styles.visibilityButtonActive]}
            onPress={() => handleToggleVisibility(identity)}
          >
            <Feather
              name={isActive ? 'eye' : 'eye-off'}
              size={16}
              color={isActive ? theme.colors.success : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Feather name="eye" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statValue}>{identity.profile_views}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="search" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statValue}>{identity.search_appearances}</Text>
            <Text style={styles.statLabel}>Searches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="mail" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statValue}>{identity.contact_requests}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Feather name="clock" size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              {AVAILABILITY_LABELS[identity.availability]}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="cash" size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              {formatPayRange(identity.expected_pay_min, identity.expected_pay_max, identity.pay_type)}
            </Text>
          </View>
        </View>

        {/* Skills Preview */}
        {identity.skills && identity.skills.length > 0 && (
          <View style={styles.skillsRow}>
            {identity.skills.slice(0, 3).map((skill) => (
              <View key={skill.id} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill.skill}</Text>
                {skill.is_verified && (
                  <Feather name="check-circle" size={10} color={theme.colors.success} />
                )}
              </View>
            ))}
            {identity.skills.length > 3 && (
              <View style={styles.moreSkillsTag}>
                <Text style={styles.moreSkillsText}>+{identity.skills.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CVPreview', { identityId: identity.id })}
          >
            <Feather name="file-text" size={16} color={theme.colors.accent} />
            <Text style={styles.actionButtonText}>View CV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditWorkIdentity', { identityId: identity.id })}
          >
            <Feather name="edit-2" size={16} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteIdentity(identity)}
          >
            <Feather name="trash-2" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your work identities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Work Identities</Text>
          <Text style={styles.subtitle}>
            {identities.length} {identities.length === 1 ? 'identity' : 'identities'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateWorkIdentity')}
        >
          <Feather name="plus" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {identities.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="briefcase-plus"
                size={48}
                color={theme.colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No Work Identities Yet</Text>
            <Text style={styles.emptyText}>
              Create your first work identity to showcase your skills and get discovered by employers.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateWorkIdentity')}
            >
              <Feather name="plus" size={20} color={theme.colors.text} />
              <Text style={styles.createButtonText}>Create Work Identity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Feather name="info" size={16} color={theme.colors.accent} />
              <Text style={styles.infoText}>
                Each work identity represents a different type of work you can do.
                Businesses search by identity to find the right match.
              </Text>
            </View>

            {/* Identity Cards */}
            {identities.map(renderIdentityCard)}
          </>
        )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.accent}15`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  identityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  identityCardInactive: {
    opacity: 0.7,
    borderColor: theme.colors.textMuted,
    borderStyle: 'dashed',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.warning}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  capabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  capabilityCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  capabilityScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  capabilityInfo: {
    gap: 2,
  },
  capabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  experienceText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  visibilityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  visibilityButtonActive: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}15`,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  moreSkillsTag: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  moreSkillsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
