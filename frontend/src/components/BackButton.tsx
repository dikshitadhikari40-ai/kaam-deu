import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from './Icons';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  label?: string;
}

export default function BackButton({ onPress, color = '#fff', label }: BackButtonProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Feather name="arrow-left" size={24} color={color} />
      {label && <Text style={[styles.label, { color }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 16,
  },
  label: {
    fontSize: 16,
    marginLeft: 8,
  },
});
