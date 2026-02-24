import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { blockService } from '../services/database';

interface BlockedUser {
  id: string;
  blocked: {
    id: string;
    name: string;
    company_name?: string;
    photo_url?: string;
    logo_url?: string;
    role: 'worker' | 'business';
  };
  created_at: string;
}

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const data = await blockService.getBlockedUsers();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = (user: BlockedUser) => {
    const name = user.blocked.name || user.blocked.company_name || 'this user';
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${name}? They will be able to see your profile and contact you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblocking(user.id);
            try {
              const result = await blockService.unblockUser(user.blocked.id);
              if (result.success) {
                setBlockedUsers(prev => prev.filter(b => b.id !== user.id));
              } else {
                Alert.alert('Error', result.error || 'Failed to unblock user');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => {
    const name = item.blocked.name || item.blocked.company_name || 'Unknown';
    const imageUrl = item.blocked.photo_url || item.blocked.logo_url;
    const isWorker = item.blocked.role === 'worker';

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather
                name={isWorker ? 'user' : 'briefcase'}
                size={24}
                color={theme.colors.textMuted}
              />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userMeta}>
              {isWorker ? 'Worker' : 'Business'} • Blocked {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => handleUnblock(item)}
          disabled={unblocking === item.id}
        >
          {unblocking === item.id ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={styles.unblockText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptyText}>
            When you block someone, they'll appear here. Blocked users can't see your profile or contact you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUser}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadBlockedUsers();
              }}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  list: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
