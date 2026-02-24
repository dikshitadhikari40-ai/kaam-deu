import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Indeed-inspired color scheme - Light Theme
const colors = {
  primary: '#2557a7', // Indeed purple
  primaryDark: '#1e4585',
  secondary: '#7f5af0',
  background: '#ffffff',
  surface: '#f8f9fa',
  border: '#e5e7eb',
  text: '#191919',
  textSecondary: '#595959',
  textLight: '#999999',
  accent: '#f1d38b',
  success: '#4ade80',
  error: '#ff6b6b',
};

interface IndeedHeaderProps {
  title?: string;
  subtitle?: string;
  onSearchFocus?: () => void;
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  userRole?: 'worker' | 'business';
}

export default function IndeedHeader({
  title = 'Kaam Deu',
  subtitle,
  onSearchFocus,
  onProfilePress,
  onNotificationsPress,
  showSearch = true,
  searchPlaceholder = 'Search jobs, companies, or skills...',
  userRole = 'worker',
}: IndeedHeaderProps) {
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (onSearchFocus) onSearchFocus();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Top Bar - Logo & Actions */}
        <View style={styles.topBar}>
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="briefcase-search" size={24} color={colors.primary} />
            </View>
            <Text style={styles.logoText}>Kaam Deu</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Notifications */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onNotificationsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="bell" size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onProfilePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="user" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Section - Indeed Style */}
        {showSearch && (
          <View style={styles.searchSection}>
            <View style={[
              styles.searchBar,
              isSearchFocused && styles.searchBarFocused
            ]}>
              {/* Search Icon */}
              <View style={styles.searchIconContainer}>
                <Feather name="search" size={18} color={isSearchFocused ? colors.primary : colors.textLight} />
              </View>

              {/* Search Input */}
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textLight}
                value={searchText}
                onChangeText={setSearchText}
                onFocus={handleSearchFocus}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
              />

              {/* Clear Button */}
              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchText('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={16} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Button */}
            <TouchableOpacity
              style={styles.searchButton}
              onPress={onSearchFocus}
              activeOpacity={0.8}
            >
              <Feather name="sliders" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Subtitle/Role Indicator */}
        {subtitle && (
          <View style={styles.subtitleSection}>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        )}

        {/* Role Badge */}
        <View style={styles.roleBadgeContainer}>
          <View style={[
            styles.roleBadge,
            userRole === 'business' ? styles.roleBadgeBusiness : styles.roleBadgeWorker
          ]}>
            <Feather
              name={userRole === 'business' ? 'briefcase' : 'user'}
              size={12}
              color={userRole === 'business' ? colors.primaryDark : colors.success}
            />
            <Text style={[
              styles.roleBadgeText,
              userRole === 'business' ? styles.roleBadgeTextBusiness : styles.roleBadgeTextWorker
            ]}>
              {userRole === 'business' ? 'Employer' : 'Job Seeker'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Export QuickFilters component
export function QuickFilters({
  filters,
  activeFilters,
  onFilterPress,
}: {
  filters: Array<{ key: string; label: string; icon?: string }>;
  activeFilters: string[];
  onFilterPress: (key: string) => void;
}) {
  return (
    <View style={quickFiltersStyles.container}>
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.key);
        return (
          <TouchableOpacity
            key={filter.key}
            style={[
              quickFiltersStyles.filterPill,
              isActive && quickFiltersStyles.filterPillActive,
            ]}
            onPress={() => onFilterPress(filter.key)}
            activeOpacity={0.7}
          >
            {filter.icon && (
              <Feather
                name={filter.icon as any}
                size={14}
                color={isActive ? colors.background : colors.textSecondary}
              />
            )}
            <Text
              style={[
                quickFiltersStyles.filterText,
                isActive && quickFiltersStyles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Export TrendingSection component
export function TrendingSection({
  trendingSearches,
  trendingJobs,
  onPressItem,
}: {
  trendingSearches?: string[];
  trendingJobs?: Array<{ title: string; company: string; location: string }>;
  onPressItem?: (item: string) => void;
}) {
  return (
    <View style={trendingStyles.container}>
      {/* Trending Searches */}
      {trendingSearches && trendingSearches.length > 0 && (
        <View style={trendingStyles.section}>
          <View style={trendingStyles.sectionHeader}>
            <Feather name="trending-up" size={16} color={colors.primary} />
            <Text style={trendingStyles.sectionTitle}>Trending Searches</Text>
          </View>
          <View style={trendingStyles.tagsContainer}>
            {trendingSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={trendingStyles.tag}
                onPress={() => onPressItem?.(search)}
                activeOpacity={0.7}
              >
                <Text style={trendingStyles.tagText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Trending Jobs */}
      {trendingJobs && trendingJobs.length > 0 && (
        <View style={trendingStyles.section}>
          <View style={trendingStyles.sectionHeader}>
            <Feather name="briefcase" size={16} color={colors.primary} />
            <Text style={trendingStyles.sectionTitle}>Trending Jobs</Text>
          </View>
          {trendingJobs.map((job, index) => (
            <TouchableOpacity
              key={index}
              style={trendingStyles.jobItem}
              onPress={() => onPressItem?.(job.title)}
              activeOpacity={0.7}
            >
              <View style={trendingStyles.jobIcon}>
                <Feather name="chevron-right" size={14} color={colors.textLight} />
              </View>
              <View style={trendingStyles.jobInfo}>
                <Text style={trendingStyles.jobTitle}>{job.title}</Text>
                <Text style={trendingStyles.jobDetails}>{job.company} • {job.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  subtitleSection: {
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  roleBadgeContainer: {
    marginTop: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  roleBadgeWorker: {
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  roleBadgeBusiness: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadgeTextWorker: {
    color: colors.success,
  },
  roleBadgeTextBusiness: {
    color: colors.primary,
  },
});

const quickFiltersStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
});

const trendingStyles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobIcon: {
    marginRight: 10,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  jobDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
