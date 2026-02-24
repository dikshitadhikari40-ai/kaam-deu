import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge, BadgeTier } from '../types';

interface BadgeCardProps {
  badge: Badge;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

const getTierColor = (tier: BadgeTier) => {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#C0C0C0';
    case 'gold': return '#FFD700';
    case 'platinum': return '#E5E4E2';
    case 'special': return '#FF4500';
    default: return '#888888';
  }
};

const getBackgroundColor = (tier: BadgeTier) => {
  switch (tier) {
    case 'bronze': return '#CD7F3220'; // 20% opacity
    case 'silver': return '#C0C0C020';
    case 'gold': return '#FFD70020';
    case 'platinum': return '#E5E4E220';
    case 'special': return '#FF450020';
    default: return '#88888820';
  }
};

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, size = 'medium', showName = true }) => {
  const iconSize = size === 'small' ? 16 : size === 'medium' ? 24 : 32;
  const padding = size === 'small' ? 8 : 12;

  // Default to 'bronze' if undefined to prevent crashes
  const tier = badge.tier || 'bronze';
  const color = getTierColor(tier);
  const bgColor = getBackgroundColor(tier);

  return (
    <View style={styles.container}>
      <View style={[styles.badgeIcon, { backgroundColor: bgColor, padding }]}>
        <Feather name={badge.icon as any} size={iconSize} color={color} />
      </View>
      {showName && (
        <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 16,
    maxWidth: 80,
  },
  badgeIcon: {
    borderRadius: 50,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
