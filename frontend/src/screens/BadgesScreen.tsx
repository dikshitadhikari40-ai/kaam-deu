import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { badgeService } from '../services/badges';
import { Badge, UserBadge, BadgeCategory } from '../types';
import BadgeCard from '../components/BadgeCard';

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  engagement: 'Engagement',
  quality: 'Quality',
  milestone: 'Milestones',
  special: 'Special',
};

const CATEGORY_ICONS: Record<BadgeCategory, string> = {
  engagement: 'activity',
  quality: 'star',
  milestone: 'flag',
  special: 'award',
};

export default function BadgesScreen() {
  const navigation = useNavigation();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const [badges, earned] = await Promise.all([
        badgeService.getAllBadges(),
        badgeService.getUserBadges(),
      ]);
      setAllBadges(badges);
      setUserBadges(earned);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBadges();
  };

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  const filteredBadges = selectedCategory === 'all'
    ? allBadges
    : allBadges.filter(b => b.category === selectedCategory);

  const earnedCount = userBadges.length;
  const totalCount = allBadges.length;

  const categories: (BadgeCategory | 'all')[] = ['all', 'engagement', 'quality', 'milestone', 'special'];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading badges...</Text>
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
        <Text style={styles.headerTitle}>Badges</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.trophyContainer}>
              <Feather name="award" size={32} color={theme.colors.warning} />
            </View>
            <View style={styles.progressText}>
              <Text style={styles.progressTitle}>
                {earnedCount} of {totalCount} Badges
              </Text>
              <Text style={styles.progressSubtitle}>
                {earnedCount === totalCount
                  ? 'Congratulations! You earned all badges!'
                  : `${totalCount - earnedCount} more to collect`}
              </Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${(earnedCount / totalCount) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Feather
                name={category === 'all' ? 'grid' : CATEGORY_ICONS[category] as any}
                size={14}
                color={
                  selectedCategory === category
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category === 'all' ? 'All' : CATEGORY_LABELS[category]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Earned Badges Section */}
        {userBadges.length > 0 && selectedCategory === 'all' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Badges</Text>
            <View style={styles.earnedBadgesRow}>
              {userBadges.map(ub => (
                <BadgeCard
                  key={ub.id}
                  badge={ub.badge!}
                  earned={true}
                  size="small"
                />
              ))}
            </View>
          </View>
        )}

        {/* All Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'All Badges' : CATEGORY_LABELS[selectedCategory]}
          </Text>
          <View style={styles.badgesList}>
            {filteredBadges.map(badge => {
              const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
              return (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={earnedBadgeIds.has(badge.id)}
                  earnedAt={userBadge?.earned_at}
                />
              );
            })}
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
  progressCard: {
    margin: 16,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  trophyContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${theme.colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.warning,
    borderRadius: 4,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  earnedBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgesList: {
    gap: 12,
  },
});
