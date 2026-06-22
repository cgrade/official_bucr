import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantStyles = {
  success: {
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
  },
  warning: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
  },
  error: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
  },
  info: {
    bg: '#ECFEFF',
    text: '#0E7490',
    border: '#A5F3FC',
  },
  neutral: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
  },
  primary: {
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
  },
};

export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  style,
}: BadgeProps) {
  const colors = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  textSm: {
    fontSize: 10,
  },
});
