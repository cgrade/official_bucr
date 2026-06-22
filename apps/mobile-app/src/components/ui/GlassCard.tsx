import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  onPress?: () => void;
  padding?: number;
}

export function GlassCard({
  children,
  style,
  intensity,
  onPress,
  padding = 16,
}: GlassCardProps) {
  const { isDark } = useTheme();
  const blurIntensity = intensity ?? (isDark ? 40 : 60);

  const content = (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.blur, { padding }]}
      >
        {children}
      </BlurView>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

interface GlassCardAltProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
}

export function GlassCardAlt({
  children,
  style,
  onPress,
  padding = 16,
}: GlassCardAltProps) {
  const { colors, isDark } = useTheme();

  const cardStyle = [
    styles.altContainer,
    {
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.8)' 
        : 'rgba(255, 255, 255, 0.85)',
      borderColor: isDark 
        ? 'rgba(51, 65, 85, 0.5)' 
        : 'rgba(255, 255, 255, 0.3)',
      padding,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} activeOpacity={0.8} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blur: {
    overflow: 'hidden',
  },
  altContainer: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
});
