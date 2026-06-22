import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.7],
  });

  return (
    <Animated.View
      style={[
        // animated `opacity` + dynamic width/height — cast keeps RN's Animated
        // style union happy without losing runtime correctness
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.border : '#E2E8F0',
          opacity,
        } as Animated.WithAnimatedObject<ViewStyle>,
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={16} borderRadius={4} />
        <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.listItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 12,
  },
  list: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  listItem: {
    width: 160,
    marginRight: 14,
  },
});
