import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, CalendarCheck, Wallet, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../src/contexts/ThemeContext';

export const ONBOARDING_DONE_KEY = 'onboarding-complete';

type Slide = {
  icon: React.ElementType;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: Search,
    title: 'Discover Abuja’s best tables',
    body: 'Browse and search top restaurants, lounges and fine-dining spots near you — with menus, photos and real reviews.',
  },
  {
    icon: CalendarCheck,
    title: 'Book with a small deposit',
    body: 'Reserve your table with credits. It’s a flat deposit per reservation — party size doesn’t change it.',
  },
  {
    icon: ShieldCheck,
    title: 'Show up, get rewarded',
    body: 'Check in at the venue and your full deposit comes back — plus a 3% bonus. No-shows only forfeit part of the deposit, so your table is actually waiting.',
  },
  {
    icon: Wallet,
    title: 'Your wallet, your credits',
    body: 'Top up, gift credits to friends, and track every transaction. Credits are valid for 12 months.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true').catch(() => {});
    router.replace('/(tabs)');
  };

  const next = () => {
    if (isLast) return finish();
    const to = index + 1;
    scrollRef.current?.scrollTo({ x: to * width, animated: true });
    setIndex(to);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip */}
      <View style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.skip, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => {
          const Icon = s.icon;
          return (
            <View key={i} style={[styles.slide, { width }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
                <Icon size={56} color={colors.tertiary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{s.body}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? colors.tertiary : colors.border, width: i === index ? 22 : 8 },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cta, { backgroundColor: colors.tertiary }]} onPress={next} activeOpacity={0.85}>
          <Text style={[styles.ctaText, { color: colors.primaryDark }]}>{isLast ? 'Get Started' : 'Next'}</Text>
          <ArrowRight size={20} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingVertical: 12, minHeight: 40 },
  skip: { fontSize: 15, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconCircle: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 24 },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 18 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
