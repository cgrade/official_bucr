import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface BucrLogoProps {
  width?: number;
  height?: number;
  size?: number;
}

/**
 * Text-based wordmark — "B" in Heritage Gold, "ucr" in theme text.
 * Works correctly on both light (cream bg) and dark (ink bg) without PNG visibility issues.
 */
export function BucrLogo({ size = 28 }: BucrLogoProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.letter, { fontSize: size, color: '#c9a84c' }]}>B</Text>
      <Text style={[styles.letter, { fontSize: size, color: colors.text }]}>ucr</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letter: {
    fontFamily: 'Cormorant_600SemiBold',
    fontWeight: '600',
    lineHeight: undefined,
    includeFontPadding: false,
  },
});
