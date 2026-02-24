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
import { analyticsService } from '../services/analytics';
import { UserInsights } from '../types';

interface InsightCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  change?: number;
  color?: string;
}

function InsightCard({ icon, label, value, subtext, change, color }: InsightCardProps) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${color || theme.colors.accent}20` }]}>
        <Feather name={icon as any} size={20} color={color || theme.colors.accent} />
      </View>
      <Text style={styles.insightLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.insightValue}>{value}</Text>
        {change !== undefined && change !== 0 && (
          <View style={[styles.changeBadge, change > 0 ? styles.changePositive : styles.changeNegative]}>
            <Feather
              name={change > 0 ? 'trending-up' : 'trending-down'}
              size={10}
              color={change > 0 ? theme.colors.success : theme.colors.error}
            />
            <Text style={[styles.changeText, change > 0 ? styles.changeTextPositive : styles.changeTextNegative]}>
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
      {subtext && <Text style={styles.insightSubtext}>{subtext}</Text>}
    </View>
  );
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function InsightsScreen() {
  const navigation = useNavigation();
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const data = await analyticsService.getUserInsights();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading insights...</Text>
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
        <Text style={styles.headerTitle}>Insights</Text>
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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Feather name="bar-chart-2" size={28} color={theme.colors.accent} />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>Your Performance</Text>
              <Text style={styles.summarySubtitle}>
                Last updated: {insights?.last_updated
                  ? new Date(insights.last_updated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Just now'}
              </Text>
            </View>
          </View>
        </View>

        {/* Visibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <View style={styles.insightsGrid}>
            <InsightCard
              icon="eye"
              label="Profile Views"
              value={insights?.profile_views || 0}
              change={insights?.profile_views_change}
              subtext="This week"
              color={theme.colors.info}
            />
            <InsightCard
              icon="heart"
              label="Match Rate"
              value={`${insights?.match_rate || 0}%`}
              subtext={`${insights?.total_matches || 0} total matches`}
              color={theme.colors.error}
            />
          </View>
        </View>

        {/* Engagement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engagement</Text>
          <View style={styles.insightsGrid}>
            <InsightCard
              icon="message-circle"
              label="Response Rate"
              value={`${insights?.response_rate || 0}%`}
              subtext="Messages replied"
              color={theme.colors.success}
            />
            <InsightCard
              icon="clock"
              label="Avg Response"
              value={formatResponseTime(insights?.avg_response_time_minutes || 0)}
              subtext="Response time"
              color={theme.colors.warning}
            />
          </View>
          <View style={styles.insightsGrid}>
            <InsightCard
              icon="send"
              label="Sent"
              value={insights?.total_messages_sent || 0}
              subtext="Messages"
              color={theme.colors.accent}
            />
            <InsightCard
              icon="inbox"
              label="Received"
              value={insights?.total_messages_received || 0}
              subtext="Messages"
              color={theme.colors.secondary}
            />
          </View>
        </View>

        {/* Reputation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reputation</Text>
          <View style={styles.insightsGrid}>
            <InsightCard
              icon="star"
              label="Rating"
              value={insights?.average_rating?.toFixed(1) || '0.0'}
              subtext={`${insights?.total_reviews || 0} reviews`}
              color={theme.colors.warning}
            />
            <InsightCard
              icon="briefcase"
              label="Jobs Done"
              value={insights?.jobs_completed || 0}
              subtext="Completed"
              color={theme.colors.success}
            />
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips to Improve</Text>

          {(insights?.response_rate || 0) < 80 && (
            <View style={styles.tipCard}>
              <Feather name="zap" size={20} color={theme.colors.warning} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Respond Faster</Text>
                <Text style={styles.tipText}>
                  Quick responses lead to more successful matches. Try to reply within 1 hour.
                </Text>
              </View>
            </View>
          )}

          {(insights?.match_rate || 0) < 50 && (
            <View style={styles.tipCard}>
              <Feather name="user" size={20} color={theme.colors.info} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Complete Your Profile</Text>
                <Text style={styles.tipText}>
                  Profiles with photos and detailed skills get 3x more matches.
                </Text>
              </View>
            </View>
          )}

          {(insights?.profile_views || 0) < 20 && (
            <View style={styles.tipCard}>
              <Feather name="trending-up" size={20} color={theme.colors.accent} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Boost Your Profile</Text>
                <Text style={styles.tipText}>
                  Use a profile boost to appear at the top of search results.
                </Text>
              </View>
            </View>
          )}

          {(insights?.response_rate || 0) >= 80 && (insights?.match_rate || 0) >= 50 && (
            <View style={styles.tipCard}>
              <Feather name="check-circle" size={20} color={theme.colors.success} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>You're Doing Great!</Text>
                <Text style={styles.tipText}>
                  Keep up the good work. Your engagement is above average.
                </Text>
              </View>
            </View>
          )}
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
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summarySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  changePositive: {
    backgroundColor: `${theme.colors.success}20`,
  },
  changeNegative: {
    backgroundColor: `${theme.colors.error}20`,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeTextPositive: {
    color: theme.colors.success,
  },
  changeTextNegative: {
    color: theme.colors.error,
  },
  insightSubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  tipsSection: {
    padding: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
