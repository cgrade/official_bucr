import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.heading, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: January 2025</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          At Bucr, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>Information We Collect</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We collect information you provide directly: name, email, phone number, and payment information. We also collect usage data such as reservation history and app interactions.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>How We Use Your Information</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your information is used to provide and improve our services, process reservations, send notifications about your bookings, and personalize your experience.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>Data Sharing</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We share your reservation details with the restaurants you book. We do not sell your personal information to third parties.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>Data Security</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We use industry-standard encryption and security measures to protect your data. Payment information is processed securely through Paystack.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>Contact Us</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you have questions about this privacy policy, contact us at privacy@bucr.ng.
        </Text>
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
  contentContainer: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  updated: { fontSize: 13, marginBottom: 20 },
  subHeading: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22 },
});
