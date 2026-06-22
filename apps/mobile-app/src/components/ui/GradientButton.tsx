import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  haptic?: boolean;
}

// Brand-exact flat colours — no gradient, matching the web portal approach
const VARIANTS: Record<string, { bg: string; text: string; border?: string }> = {
  primary:   { bg: '#c9a84c', text: '#070f1e' },                           // gold on ink
  secondary: { bg: '#0f2547', text: '#f5f0e8' },                           // navy on cream
  success:   { bg: '#10B981', text: '#ffffff' },
  danger:    { bg: '#EF4444', text: '#ffffff' },
  outline:   { bg: 'transparent', text: '#c9a84c', border: '#c9a84c' },   // gold outline
};

export function GradientButton({
  title,
  onPress,
  size = 'md',
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  haptic = true,
}: GradientButtonProps) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;

  const handlePress = () => {
    if (haptic && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        styles.button,
        styles[size],
        { backgroundColor: disabled ? '#64748B' : v.bg },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : undefined,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Text style={[
        styles.text,
        styles[`${size}Text` as 'smText' | 'mdText' | 'lgText'],
        { color: disabled ? '#94A3B8' : v.text },
        textStyle,
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  sm:   { paddingHorizontal: 16, paddingVertical: 10 },
  md:   { paddingHorizontal: 24, paddingVertical: 14 },
  lg:   { paddingHorizontal: 32, paddingVertical: 18 },
  text: { fontWeight: '700' },
  smText: { fontSize: 13 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 17 },
});
