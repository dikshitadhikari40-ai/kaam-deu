/**
 * CV Preview Screen
 *
 * Displays the auto-generated CV for a work identity.
 * Shows different views based on CV type:
 * - Worker Confidence View: For workers to see their own CV
 * - Business Decision View: For businesses evaluating workers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { workIdentityService } from '../services/workIdentityService';
import {
  WorkIdentity,
  CVSnapshot,
  CVType,
  getCapabilityDisplay,
  formatPayRange,
  SKILL_LEVEL_LABELS,
  AVAILABILITY_LABELS,
} from '../types/workIdentity';

interface Props {
  navigation: any;
  route: {
    params: {
      identityId: string;
      cvType?: CVType;
    };
  };
}

export default function CVPreviewScreen({ navigation, route }: Props) {
  const { identityId, cvType = 'worker_confidence' } = route.params;

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [identity, setIdentity] = useState<WorkIdentity | null>(null);
  const [cv, setCV] = useState<CVSnapshot | null>(null);
  const [selectedType, setSelectedType] = useState<CVType>(cvType);

  useEffect(() => {
    loadData();
  }, [identityId]);

  useEffect(() => {
    if (identity) {
      loadCV(selectedType);
    }
  }, [selectedType, identity]);

  const loadData = async () => {
    try {
      const data = await workIdentityService.getIdentityById(identityId);
      setIdentity(data);
    } catch (error) {
      console.error('Error loading identity:', error);
      Alert.alert('Error', 'Failed to load work identity');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadCV = async (type: CVType) => {
    try {
      const cvData = await workIdentityService.getCurrentCV(identityId, type);
      setCV(cvData);
    } catch (error) {
      console.error('Error loading CV:', error);
    }
  };

  const handleRegenerateCV = async () => {
    setRegenerating(true);
    try {
      await workIdentityService.generateCV(identityId, selectedType);
      await loadCV(selectedType);
      Alert.alert('Success', 'CV regenerated with latest data!');
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate CV');
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = async () => {
    if (!identity) return;

    try {
      await Share.share({
        message: `Check out my ${identity.job_category} work profile on Kaam Deu!\n\nCapability Score: ${identity.capability_score}/100\nExperience: ${identity.experience_years} years\n\nDownload Kaam Deu to connect!`,
        title: `${identity.job_title || identity.job_category} - Work Profile`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!identity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Work identity not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const capability = getCapabilityDisplay(identity.capability_score);
  const content = cv?.content_json;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* CV Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'worker_confidence' && styles.typeButtonActive
            ]}
            onPress={() => setSelectedType('worker_confidence')}
          >
            <Feather
              name="user"
              size={16}
              color={selectedType === 'worker_confidence' ? theme.colors.text : theme.colors.textMuted}
            />
            <Text style={[
              styles.typeButtonText,
              selectedType === 'worker_confidence' && styles.typeButtonTextActive
            ]}>
              My View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'business_decision' && styles.typeButtonActive
            ]}
            onPress={() => setSelectedType('business_decision')}
          >
            <Feather
              name="briefcase"
              size={16}
              color={selectedType === 'business_decision' ? theme.colors.text : theme.colors.textMuted}
            />
            <Text style={[
              styles.typeButtonText,
              selectedType === 'business_decision' && styles.typeButtonTextActive
            ]}>
              Business View
            </Text>
          </TouchableOpacity>
        </View>

        {/* CV Header */}
        <View style={styles.cvHeader}>
          <View style={styles.cvHeaderTop}>
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons
                name="briefcase-variant"
                size={24}
                color={theme.colors.accent}
              />
              <Text style={styles.category}>{identity.job_category}</Text>
            </View>
            {identity.is_primary && (
              <View style={styles.primaryBadge}>
                <Feather name="star" size={12} color={theme.colors.warning} />
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
          </View>

          {identity.job_title && (
            <Text style={styles.jobTitle}>{identity.job_title}</Text>
          )}

          {/* Capability Score Circle */}
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { borderColor: capability.color }]}>
              <Text style={[styles.scoreNumber, { color: capability.color }]}>
                {identity.capability_score}
              </Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreRating, { color: capability.color }]}>
                {capability.label}
              </Text>
              <Text style={styles.scoreDescription}>Capability Score</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Feather name="eye" size={20} color={theme.colors.accent} />
            <Text style={styles.statNumber}>{identity.profile_views}</Text>
            <Text style={styles.statLabel}>Profile Views</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="search" size={20} color={theme.colors.primary} />
            <Text style={styles.statNumber}>{identity.search_appearances}</Text>
            <Text style={styles.statLabel}>Search Hits</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="mail" size={20} color={theme.colors.success} />
            <Text style={styles.statNumber}>{identity.contact_requests}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
        </View>

        {/* Experience Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="award" size={20} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Experience</Text>
          </View>
          <View style={styles.experienceCard}>
            <View style={styles.experienceRow}>
              <Text style={styles.experienceLabel}>Level</Text>
              <Text style={styles.experienceValue}>
                {content?.header?.experience_level || identity.experience_level}
              </Text>
            </View>
            <View style={styles.experienceRow}>
              <Text style={styles.experienceLabel}>Years</Text>
              <Text style={styles.experienceValue}>{identity.experience_years} years</Text>
            </View>
          </View>
        </View>

        {/* Skills Section */}
        {identity.skills && identity.skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="tool" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Skills</Text>
            </View>
            <View style={styles.skillsList}>
              {identity.skills.map((skill) => (
                <View key={skill.id} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.skill}</Text>
                    {skill.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Feather name="check-circle" size={12} color={theme.colors.success} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.skillDetails}>
                    <View style={styles.skillLevelBar}>
                      <View
                        style={[
                          styles.skillLevelFill,
                          {
                            width: `${
                              skill.skill_level === 'basic' ? 25 :
                              skill.skill_level === 'intermediate' ? 50 :
                              skill.skill_level === 'good' ? 75 : 100
                            }%`
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.skillLevelText}>
                      {SKILL_LEVEL_LABELS[skill.skill_level]}
                    </Text>
                    <Text style={styles.skillYears}>{skill.years_experience} yrs</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Availability Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="clock" size={20} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Availability</Text>
          </View>
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityRow}>
              <Text style={styles.availabilityLabel}>Type</Text>
              <View style={styles.availabilityBadge}>
                <Text style={styles.availabilityValue}>
                  {AVAILABILITY_LABELS[identity.availability]}
                </Text>
              </View>
            </View>
            {identity.available_from && (
              <View style={styles.availabilityRow}>
                <Text style={styles.availabilityLabel}>Available From</Text>
                <Text style={styles.availabilityValue}>{identity.available_from}</Text>
              </View>
            )}
            {identity.preferred_locations.length > 0 && (
              <View style={styles.locationsContainer}>
                <Text style={styles.availabilityLabel}>Preferred Locations</Text>
                <View style={styles.locationTags}>
                  {identity.preferred_locations.map((loc, index) => (
                    <View key={index} style={styles.locationTag}>
                      <Feather name="map-pin" size={12} color={theme.colors.accent} />
                      <Text style={styles.locationText}>{loc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {identity.is_remote_ok && (
              <View style={styles.remoteBadge}>
                <Feather name="globe" size={14} color={theme.colors.success} />
                <Text style={styles.remoteText}>Open to Remote Work</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pay Expectations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cash" size={20} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Pay Expectations</Text>
          </View>
          <View style={styles.payCard}>
            <Text style={styles.payAmount}>
              {formatPayRange(identity.expected_pay_min, identity.expected_pay_max, identity.pay_type)}
            </Text>
          </View>
        </View>

        {/* CV Version Info */}
        {cv && (
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>
              CV Version {cv.version} • Generated {new Date(cv.generated_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={handleRegenerateCV}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <>
              <Feather name="refresh-cw" size={18} color={theme.colors.accent} />
              <Text style={styles.regenerateText}>Regenerate</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Feather name="share-2" size={18} color={theme.colors.text} />
          <Text style={styles.shareText}>Share CV</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  typeButtonTextActive: {
    color: theme.colors.text,
  },
  cvHeader: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  cvHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  category: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 20,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: -4,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreRating: {
    fontSize: 22,
    fontWeight: '700',
  },
  scoreDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  experienceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  experienceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  experienceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  experienceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  skillsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  skillItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.success,
  },
  skillDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skillLevelBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
  },
  skillLevelFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  skillLevelText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    width: 80,
  },
  skillYears: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  availabilityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  availabilityLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  availabilityBadge: {
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  availabilityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  locationsContainer: {
    paddingTop: 12,
  },
  locationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  remoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  remoteText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  payCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  payAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.success,
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 36,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    gap: 8,
  },
  regenerateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    gap: 8,
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
