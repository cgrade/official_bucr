import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/contexts/ThemeContext';
import { authApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth.store';

const STORAGE_KEY = 'privacy-preferences';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const logout = useAuthStore((s) => s.logout);

  const [locationEnabled, setLocationEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Load persisted preferences so the toggles survive app restarts.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (typeof p.location === 'boolean') setLocationEnabled(p.location);
          if (typeof p.analytics === 'boolean') setAnalyticsEnabled(p.analytics);
        } catch {}
      }
    });
  }, []);

  const persist = (location: boolean, analytics: boolean) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ location, analytics })).catch(() => {});
  };

  const toggleLocation = (v: boolean) => { setLocationEnabled(v); persist(v, analyticsEnabled); };
  const toggleAnalytics = (v: boolean) => { setAnalyticsEnabled(v); persist(locationEnabled, v); };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently anonymises your account and you will be signed out. Your credit balance and transaction history cannot be recovered. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await authApi.deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch (e: any) {
              setDeleting(false);
              Alert.alert('Error', e?.response?.data?.message || 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERMISSIONS</Text>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.label, { color: colors.text }]}>Location Services</Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>Use your location to find nearby restaurants</Text>
            </View>
            <Switch value={locationEnabled} onValueChange={toggleLocation} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.label, { color: colors.text }]}>Usage Analytics</Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>Help improve Bucr by sharing anonymous usage data</Text>
            </View>
            <Switch value={analyticsEnabled} onValueChange={toggleAnalytics} trackColor={{ true: colors.primary }} />
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/settings/change-password')}
          >
            <Text style={[styles.label, { color: colors.text }]}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} disabled={deleting}>
            <Text style={[styles.label, { color: colors.error }]}>Delete Account</Text>
            {deleting && <ActivityIndicator size="small" color={colors.error} />}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  section: { marginTop: 20, borderTopWidth: 1, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  label: { fontSize: 16 },
  desc: { fontSize: 12, marginTop: 2 },
});
