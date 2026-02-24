import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../theme';
import { jobPostService } from '../services/database';
import { jobApplicationService } from '../services/jobApplications';
import { JobPost, EmploymentType } from '../types';
import { useAuth } from '../context/AuthContext';

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  daily_wage: 'Daily Wage',
};

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Not specified';

  const formatNum = (n: number) => n.toLocaleString('en-NP');

  if (min && max) {
    return `NPR ${formatNum(min)} - ${formatNum(max)}`;
  } else if (min) {
    return `NPR ${formatNum(min)}+`;
  } else if (max) {
    return `Up to NPR ${formatNum(max)}`;
  }
  return 'Not specified';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function JobDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, selectedRole } = useAuth();
  const { jobId } = route.params;

  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchJobDetails();
    checkApplicationStatus();
  }, [jobId]);

  const checkApplicationStatus = async () => {
    if (selectedRole !== 'worker') return;
    try {
      const result = await jobApplicationService.hasApplied(jobId);
      setHasApplied(result.hasApplied);
      if (result.application) {
        setApplicationStatus(result.application.status);
      }
    } catch (error) {
      // Silent fail - not critical
    }
  };

  const fetchJobDetails = async () => {
    try {
      const data = await jobPostService.getJobPostById(jobId);
      setJob(data);
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (selectedRole === 'business') {
      Alert.alert('Cannot Apply', 'Business accounts cannot apply to jobs.');
      return;
    }

    if (hasApplied) {
      Alert.alert('Already Applied', 'You have already applied to this job.');
      return;
    }

    Alert.alert(
      'Apply to Job',
      'This will send your profile to the employer. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setActionLoading(true);
            try {
              await jobApplicationService.applyToJob({ jobId });
              setHasApplied(true);
              setApplicationStatus('pending');
              Alert.alert(
                'Application Sent!',
                'Your profile has been sent to the employer. They will contact you if interested.'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to submit application');
            } finally {
              setActionLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!job) return;

    try {
      await Share.share({
        message: `Check out this job: ${job.title} at ${job.location}. ${job.description.substring(0, 100)}...`,
        title: job.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEdit = () => {
    navigation.navigate('CreateJobPost', { editJob: job });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Job Post',
      'Are you sure you want to delete this job post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const success = await jobPostService.deleteJobPost(jobId);
              if (success) {
                Alert.alert('Deleted', 'Job post has been deleted.');
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete job post');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async () => {
    if (!job) return;

    const newStatus = job.status === 'active' ? 'paused' : 'active';
    setActionLoading(true);

    try {
      const success = await jobPostService.toggleJobPostStatus(jobId, newStatus);
      if (success) {
        setJob({ ...job, status: newStatus });
      } else {
        Alert.alert('Error', 'Failed to update job status');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const isOwner = user?.id === job?.business_id;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={64} color={theme.colors.textMuted} />
          <Text style={styles.errorTitle}>Job Not Found</Text>
          <Text style={styles.errorText}>This job may have been removed or is no longer available.</Text>
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
            <Feather name="share-2" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={handleEdit} style={styles.headerAction}>
              <Feather name="edit-2" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge (for owner) */}
        {isOwner && (
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              job.status === 'active' ? styles.statusActive : styles.statusPaused,
            ]}>
              <Text style={styles.statusText}>
                {job.status === 'active' ? 'Active' : 'Paused'}
              </Text>
            </View>
            <Text style={styles.applications}>
              {job.applications_count} application{job.applications_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Title & Meta */}
        <Text style={styles.title}>{job.title}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={16} color={theme.colors.accent} />
            <Text style={styles.metaText}>{job.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="briefcase" size={16} color={theme.colors.accent} />
            <Text style={styles.metaText}>{EMPLOYMENT_LABELS[job.employment_type]}</Text>
          </View>
          {job.is_remote && (
            <View style={styles.metaItem}>
              <Feather name="globe" size={16} color={theme.colors.accent} />
              <Text style={styles.metaText}>Remote OK</Text>
            </View>
          )}
        </View>

        {/* Salary Section */}
        <View style={styles.salaryCard}>
          <Text style={styles.salaryLabel}>Salary</Text>
          <Text style={styles.salaryAmount}>
            {formatSalary(job.salary_min, job.salary_max)}
          </Text>
          {job.salary_negotiable && (
            <Text style={styles.negotiable}>Negotiable</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {job.requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <Feather name="check-circle" size={16} color={theme.colors.accent} />
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills Required</Text>
          <View style={styles.skillsContainer}>
            {job.skills_required.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Posted Date */}
        <Text style={styles.postedDate}>
          Posted on {formatDate(job.created_at)}
        </Text>

        {/* Owner Actions */}
        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.toggleButton]}
              onPress={handleToggleStatus}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <>
                  <Feather
                    name={job.status === 'active' ? 'pause' : 'play'}
                    size={18}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.toggleButtonText}>
                    {job.status === 'active' ? 'Pause Job' : 'Activate Job'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={actionLoading}
            >
              <Feather name="trash-2" size={18} color={theme.colors.error} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply Button (for workers) */}
      {!isOwner && selectedRole === 'worker' && (
        <View style={styles.applyContainer}>
          {hasApplied ? (
            <View style={styles.appliedContainer}>
              <View style={[
                styles.appliedBadge,
                applicationStatus === 'shortlisted' && styles.shortlistedBadge,
                applicationStatus === 'rejected' && styles.rejectedBadge,
                applicationStatus === 'hired' && styles.hiredBadge,
              ]}>
                <Feather
                  name={applicationStatus === 'hired' ? 'check-circle' : 'clock'}
                  size={18}
                  color={
                    applicationStatus === 'shortlisted' ? '#10B981' :
                    applicationStatus === 'rejected' ? '#EF4444' :
                    applicationStatus === 'hired' ? '#8B5CF6' :
                    '#F59E0B'
                  }
                />
                <Text style={[
                  styles.appliedText,
                  applicationStatus === 'shortlisted' && { color: '#10B981' },
                  applicationStatus === 'rejected' && { color: '#EF4444' },
                  applicationStatus === 'hired' && { color: '#8B5CF6' },
                ]}>
                  {applicationStatus === 'pending' && 'Application Pending'}
                  {applicationStatus === 'viewed' && 'Application Viewed'}
                  {applicationStatus === 'shortlisted' && 'Shortlisted!'}
                  {applicationStatus === 'rejected' && 'Not Selected'}
                  {applicationStatus === 'hired' && 'Hired!'}
                  {!applicationStatus && 'Applied'}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.applyButton, actionLoading && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Feather name="send" size={20} color={theme.colors.primary} />
                  <Text style={styles.applyButtonText}>Apply Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    padding: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: `${theme.colors.success}20`,
  },
  statusPaused: {
    backgroundColor: `${theme.colors.warning}20`,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
  },
  applications: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  salaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  salaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  salaryAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  negotiable: {
    fontSize: 13,
    color: theme.colors.success,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillTagText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  postedDate: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  toggleButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  deleteButton: {
    backgroundColor: `${theme.colors.error}10`,
    borderWidth: 1,
    borderColor: `${theme.colors.error}30`,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  applyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  appliedContainer: {
    alignItems: 'center',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B15',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  shortlistedBadge: {
    backgroundColor: '#10B98115',
    borderColor: '#10B98130',
  },
  rejectedBadge: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444430',
  },
  hiredBadge: {
    backgroundColor: '#8B5CF615',
    borderColor: '#8B5CF630',
  },
  appliedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
