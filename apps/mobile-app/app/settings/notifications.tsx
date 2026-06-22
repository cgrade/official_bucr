import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Bell, MessageSquare, Calendar, TrendingUp, Gift, Star, ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuthStore } from '../../src/stores/auth.store';
import { notificationPreferencesApi } from '../../src/lib/api';

const CACHE_KEY = '@bucr_notif_prefs';

const DEFAULT: Record<string, boolean> = {
  reservations: true,
  reminders:    true,
  credits:      true,
  gifts:        true,
  reviews:      true,
  promotions:   false,
  reliability:  true,
};

const ITEMS: { key: string; icon: React.ElementType; title: string; desc: string; section: string }[] = [
  { key: 'reservations', icon: Calendar,     title: 'Booking Confirmations', desc: 'When your reservation is confirmed or updated',     section: 'Reservations' },
  { key: 'reminders',    icon: Bell,          title: 'Booking Reminders',     desc: '24 hours before your reservation',                  section: 'Reservations' },
  { key: 'credits',      icon: TrendingUp,    title: 'Credits Activity',      desc: 'Credits earned, spent, or expiring soon',           section: 'Wallet' },
  { key: 'gifts',        icon: Gift,          title: 'Gifts',                 desc: 'When you receive a credit gift from someone',       section: 'Wallet' },
  { key: 'reviews',      icon: Star,          title: 'Review Requests',       desc: 'Prompted to review after a completed visit',        section: 'Feedback' },
  { key: 'reliability',  icon: ShieldCheck,   title: 'Reliability Score',     desc: 'Changes to your book-with-confidence badge',        section: 'Feedback' },
  { key: 'promotions',   icon: MessageSquare, title: 'Promotions & Offers',   desc: 'Special offers from restaurants near you',          section: 'Marketing' },
];

export default function NotificationsScreen() {
  const router         = useRouter();
  const { colors }     = useTheme();
  const { isAuthenticated } = useAuthStore();
  const queryClient    = useQueryClient();

  const [prefs, setPrefs]   = useState<Record<string, boolean>>(DEFAULT);
  const [offline, setOffline] = useState(false);

  // Load from backend when authenticated
  const { isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationPreferencesApi.get,
    enabled: isAuthenticated,
    onSuccess: (data: any) => {
      const p = { ...DEFAULT, ...(data?.data || data || {}) };
      setPrefs(p);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(p)).catch(() => {});
    },
    onError: () => {
      // Fall back to local cache
      AsyncStorage.getItem(CACHE_KEY).then(raw => {
        if (raw) try { setPrefs({ ...DEFAULT, ...JSON.parse(raw) }); } catch {}
      });
      setOffline(true);
    },
  } as any);

  // Load from cache immediately while network request is in flight
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (raw) try { setPrefs({ ...DEFAULT, ...JSON.parse(raw) }); } catch {}
    });
  }, []);

  // When not authenticated, use local-only mode
  useEffect(() => {
    if (!isAuthenticated) {
      AsyncStorage.getItem(CACHE_KEY).then(raw => {
        if (raw) try { setPrefs({ ...DEFAULT, ...JSON.parse(raw) }); } catch {}
      });
    }
  }, [isAuthenticated]);

  const updateM = useMutation({
    mutationFn: (p: Record<string, boolean>) => notificationPreferencesApi.update(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const update = useCallback(async (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    // Always persist locally
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
    // Sync to backend if authenticated
    if (isAuthenticated) {
      updateM.mutate(next);
    }
  }, [prefs, isAuthenticated, updateM]);

  const sections = [...new Set(ITEMS.map(i => i.section))];
  const saving   = updateM.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        {saving
          ? <ActivityIndicator size="small" color={colors.tertiary} />
          : <View style={{ width: 24 }} />}
      </View>

      {isLoading && isAuthenticated ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tertiary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {offline && (
            <View style={[styles.offlineBanner, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.offlineText, { color: colors.warning }]}>
                Offline — changes saved locally only
              </Text>
            </View>
          )}

          {sections.map(section => (
            <View key={section} style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{section}</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {ITEMS.filter(i => i.section === section).map((item, idx, arr) => {
                  const Icon = item.icon;
                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.row,
                        idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                      ]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: colors.inputBackground }]}>
                        <Icon size={18} color={colors.tertiary} />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                      </View>
                      <Switch
                        value={prefs[item.key] ?? DEFAULT[item.key]}
                        onValueChange={v => update(item.key, v)}
                        trackColor={{ false: colors.border, true: colors.tertiary + 'bb' }}
                        thumbColor={prefs[item.key] ? colors.tertiary : colors.inputBackground}
                        ios_backgroundColor={colors.border}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={[styles.footer, { color: colors.textMuted }]}>
            {isAuthenticated
              ? 'Preferences are synced to your account and this device.'
              : 'Sign in to sync preferences across your devices.'}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:       { padding: 4 },
  title:         { fontSize: 18, fontWeight: '600' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  offlineBanner: { borderRadius: 10, padding: 10, marginBottom: 12 },
  offlineText:   { fontSize: 12, textAlign: 'center', fontWeight: '500' },
  sectionBlock:  { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
  },
  sectionCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowContent:    { flex: 1 },
  rowTitle:      { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  rowDesc:       { fontSize: 12, lineHeight: 16 },
  footer: {
    fontSize: 12, textAlign: 'center', lineHeight: 18,
    marginTop: 8, marginBottom: 24, paddingHorizontal: 16,
  },
});
