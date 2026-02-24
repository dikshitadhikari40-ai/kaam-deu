import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../theme';
import { reviewService } from '../services/database';
import StarRating from '../components/StarRating';

export default function WriteReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { matchId, reviewedUserId, reviewedUserName, reviewedUserPhoto } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }

    setLoading(true);
    try {
      const result = await reviewService.createReview({
        reviewed_id: reviewedUserId,
        match_id: matchId,
        rating,
        comment: comment.trim() || undefined,
      });

      if (result.success) {
        Alert.alert('Review Submitted', 'Thank you for your feedback!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit review. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Tap to rate';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* User Info */}
          <View style={styles.userCard}>
            {reviewedUserPhoto ? (
              <Image source={{ uri: reviewedUserPhoto }} style={styles.userPhoto} />
            ) : (
              <View style={styles.userPhotoPlaceholder}>
                <Text style={styles.userPhotoText}>
                  {reviewedUserName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.userName}>{reviewedUserName}</Text>
            <Text style={styles.userSubtext}>How was your experience?</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingSection}>
            <StarRating
              rating={rating}
              size={40}
              interactive
              onRatingChange={setRating}
            />
            <Text style={[
              styles.ratingLabel,
              rating > 0 && styles.ratingLabelActive,
            ]}>
              {getRatingLabel(rating)}
            </Text>
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Share your experience (optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="What went well? What could be improved?"
              placeholderTextColor={theme.colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Tips for a helpful review:</Text>
            <View style={styles.tipItem}>
              <Feather name="check" size={14} color={theme.colors.success} />
              <Text style={styles.tipText}>Be specific about your experience</Text>
            </View>
            <View style={styles.tipItem}>
              <Feather name="check" size={14} color={theme.colors.success} />
              <Text style={styles.tipText}>Mention what they did well</Text>
            </View>
            <View style={styles.tipItem}>
              <Feather name="check" size={14} color={theme.colors.success} />
              <Text style={styles.tipText}>Keep it professional and constructive</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (loading || rating === 0) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Feather name="send" size={20} color={theme.colors.primary} />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 24,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  userPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userPhotoText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingLabel: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  ratingLabelActive: {
    color: theme.colors.warning,
    fontWeight: '600',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  tipsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
