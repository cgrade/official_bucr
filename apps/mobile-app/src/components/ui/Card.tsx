import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
}

export function Card({
  children,
  style,
  variant = 'default',
  onPress,
}: CardProps) {
  const { colors, isDark } = useTheme();

  const cardStyles = [
    styles.card,
    { backgroundColor: colors.card },
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && [styles.outlined, { borderColor: colors.border }],
    isDark && variant === 'elevated' && styles.elevatedDark,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  elevatedDark: {
    shadowOpacity: 0.3,
  },
  outlined: {
    borderWidth: 1,
  },
});
