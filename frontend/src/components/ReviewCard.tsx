import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../theme';
import StarRating from './StarRating';

interface ReviewCardProps {
  reviewerName: string;
  reviewerPhoto?: string;
  rating: number;
  comment?: string;
  date: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ReviewCard({
  reviewerName,
  reviewerPhoto,
  rating,
  comment,
  date,
}: ReviewCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.reviewerInfo}>
          {reviewerPhoto ? (
            <Image source={{ uri: reviewerPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {reviewerName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.reviewerName}>{reviewerName}</Text>
            <Text style={styles.date}>{formatDate(date)}</Text>
          </View>
        </View>
        <StarRating rating={rating} size={16} />
      </View>

      {comment && (
        <Text style={styles.comment}>{comment}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  comment: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
  },
});
