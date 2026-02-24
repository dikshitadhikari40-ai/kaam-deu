import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 24,
  color = theme.colors.warning,
  emptyColor = theme.colors.textMuted,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const handlePress = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating && index >= Math.floor(rating);

    const starIcon = filled ? 'star' : 'star';
    const starColor = filled || halfFilled ? color : emptyColor;

    const starContent = (
      <>
        <Feather
          name={starIcon}
          size={size}
          color={starColor}
          style={filled ? undefined : { opacity: 0.3 }}
        />
        {filled && (
          <Feather
            name="star"
            size={size}
            color={starColor}
            style={[styles.filledStar, { position: 'absolute' }]}
          />
        )}
      </>
    );

    if (interactive) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(index)}
          style={styles.starContainer}
          activeOpacity={0.7}
        >
          {starContent}
        </TouchableOpacity>
      );
    }

    return (
      <View key={index} style={styles.starContainer}>
        {starContent}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginHorizontal: 2,
  },
  filledStar: {
    // Filled star overlay
  },
});
