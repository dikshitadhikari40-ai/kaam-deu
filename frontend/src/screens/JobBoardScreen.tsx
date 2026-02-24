import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SectionList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { jobPostService } from '../services/database';
import { JobPost, EmploymentType } from '../types';
import { useAuth } from '../context/AuthContext';

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  daily_wage: 'Daily Wage',
};

function formatSalary(min?: number, max?: number, negotiable?: boolean): string {
  if (!min && !max) return negotiable ? 'Negotiable' : 'Not specified';

  const formatNum = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  let salary = '';
  if (min && max) {
    salary = `NPR ${formatNum(min)} - ${formatNum(max)}`;
  } else if (min) {
    salary = `NPR ${formatNum(min)}+`;
  } else if (max) {
    salary = `Up to NPR ${formatNum(max)}`;
  }

  return negotiable ? `${salary} (Negotiable)` : salary;
}

interface JobCardProps {
  job: JobPost;
  onPress: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
}

function JobCard({ job, onPress, isOwner, onEdit, onDelete, onToggleStatus }: JobCardProps) {
  const timeAgo = getTimeAgo(job.created_at);

  return (
    <TouchableOpacity style={styles.jobCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
        <View style={styles.badgesContainer}>
          {/* Status badge for owner's jobs */}
          {isOwner && (
            <View style={[
              styles.statusBadge,
              job.status === 'active' ? styles.statusActive :
                job.status === 'paused' ? styles.statusPaused :
                  styles.statusFilled
            ]}>
              <Text style={styles.statusBadgeText}>
                {job.status === 'active' ? 'Active' :
                  job.status === 'paused' ? 'Paused' :
                    job.status === 'filled' ? 'Filled' : job.status}
              </Text>
            </View>
          )}
          {job.is_remote && (
            <View style={styles.remoteBadge}>
              <Feather name="globe" size={12} color={theme.colors.accent} />
              <Text style={styles.remoteBadgeText}>Remote</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.jobMeta}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>{job.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="briefcase" size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>{EMPLOYMENT_LABELS[job.employment_type]}</Text>
        </View>
        {isOwner && job.applications_count > 0 && (
          <View style={styles.metaItem}>
            <Feather name="users" size={14} color={theme.colors.accent} />
            <Text style={[styles.metaText, { color: theme.colors.accent }]}>
              {job.applications_count} applicant{job.applications_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.jobDescription} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.skillsRow}>
        {job.skills_required.slice(0, 3).map((skill, index) => (
          <View key={index} style={styles.skillTag}>
            <Text style={styles.skillTagText}>{skill}</Text>
          </View>
        ))}
        {job.skills_required.length > 3 && (
          <Text style={styles.moreSkills}>+{job.skills_required.length - 3} more</Text>
        )}
      </View>

      <View style={styles.jobFooter}>
        <Text style={styles.salary}>
          {formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}
        </Text>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onToggleStatus?.();
              }}
            >
              <Feather
                name={job.status === 'active' ? 'pause-circle' : 'play-circle'}
                size={18}
                color={job.status === 'active' ? theme.colors.textMuted : theme.colors.accent}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Feather name="edit-2" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="trash-2" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function JobBoardScreen() {
  const navigation = useNavigation<any>();
  const { selectedRole, user } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [myJobs, setMyJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EmploymentType | null>(null);
  const [showMyJobs, setShowMyJobs] = useState(selectedRole === 'business');

  const isBusiness = selectedRole === 'business';

  const fetchJobs = useCallback(async () => {
    try {
      const filters: any = {};
      if (selectedType) {
        filters.employment_type = selectedType;
      }
      if (searchQuery.trim()) {
        filters.searchQuery = searchQuery.trim();
      }

      // Fetch all active jobs
      const allJobs = await jobPostService.getJobPosts(filters);
      setJobs(allJobs);

      // If business user, also fetch their own jobs
      if (isBusiness) {
        const ownJobs = await jobPostService.getMyJobPosts();
        setMyJobs(ownJobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, searchQuery, isBusiness]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleJobPress = (job: JobPost) => {
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  const handleEditJob = (job: JobPost) => {
    navigation.navigate('CreateJobPost', { editJob: job });
  };

  const handleDeleteJob = async (job: JobPost) => {
    const performDelete = async () => {
      try {
        const success = await jobPostService.deleteJobPost(job.id);
        if (success) {
          fetchJobs();
          if (Platform.OS === 'web') {
            alert('Job post deleted successfully');
          } else {
            Alert.alert('Success', 'Job post deleted successfully');
          }
        } else {
          if (Platform.OS === 'web') {
            alert('Failed to delete job post');
          } else {
            Alert.alert('Error', 'Failed to delete job post');
          }
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        if (Platform.OS === 'web') {
          alert('Failed to delete job post');
        } else {
          Alert.alert('Error', 'Failed to delete job post');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${job.title}"? This action cannot be undone.`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Job Post',
        `Are you sure you want to delete "${job.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const handleToggleStatus = async (job: JobPost) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    try {
      const success = await jobPostService.toggleJobPostStatus(job.id, newStatus);
      if (success) {
        fetchJobs();
      } else {
        Alert.alert('Error', 'Failed to update job status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert('Error', 'Failed to update job status');
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Toggle for Business users */}
      {isBusiness && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, showMyJobs && styles.tabActive]}
            onPress={() => setShowMyJobs(true)}
          >
            <Feather name="folder" size={16} color={showMyJobs ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, showMyJobs && styles.tabTextActive]}>
              My Posts ({myJobs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !showMyJobs && styles.tabActive]}
            onPress={() => setShowMyJobs(false)}
          >
            <Feather name="globe" size={16} color={!showMyJobs ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.tabText, !showMyJobs && styles.tabTextActive]}>
              All Jobs
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar - only show for "All Jobs" view or workers */}
      {(!isBusiness || !showMyJobs) && (
        <>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchJobs}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedType && styles.filterChipActive]}
              onPress={() => setSelectedType(null)}
            >
              <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterChip,
                  selectedType === value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedType(value as EmploymentType)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedType === value && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Results count */}
      <Text style={styles.resultsCount}>
        {(isBusiness && showMyJobs ? myJobs : jobs).length} job{(isBusiness && showMyJobs ? myJobs : jobs).length !== 1 ? 's' : ''} {isBusiness && showMyJobs ? 'posted' : 'found'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="briefcase" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>
        {isBusiness && showMyJobs ? 'No Job Posts Yet' : 'No Jobs Found'}
      </Text>
      <Text style={styles.emptyText}>
        {isBusiness && showMyJobs
          ? 'Create your first job post to start finding talented workers'
          : searchQuery
            ? 'Try adjusting your search or filters'
            : 'Check back later for new opportunities'}
      </Text>
      {isBusiness && showMyJobs && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('CreateJobPost')}
        >
          <Feather name="plus" size={18} color={theme.colors.primary} />
          <Text style={styles.emptyButtonText}>Create Job Post</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Job Board</Text>
        {selectedRole === 'business' && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateJobPost')}
          >
            <Feather name="plus" size={20} color={theme.colors.primary} />
            <Text style={styles.createButtonText}>Post Job</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={isBusiness && showMyJobs ? myJobs : jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => handleJobPress(item)}
              isOwner={isBusiness && showMyJobs}
              onEdit={() => handleEditJob(item)}
              onDelete={() => handleDeleteJob(item)}
              onToggleStatus={() => handleToggleStatus(item)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
        />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  headerContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 100,
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
  jobCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusFilled: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },
  remoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.accent}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  remoteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  jobDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillTagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  moreSkills: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  salary: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  timeAgo: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
