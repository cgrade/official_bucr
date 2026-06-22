import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TermsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.heading, { color: colors.text }]}>Terms of Service</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: January 2025</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Welcome to Bucr. By using our application, you agree to the following terms and conditions.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>1. Account Registration</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>2. Reservations & Credits</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Credits purchased through Bucr are used to make reservations at participating restaurants. Credits are non-refundable except as required by applicable law. Unused credits may expire as detailed in your account settings.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>3. Cancellation Policy</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Reservations may be cancelled up to 2 hours before the scheduled time for a full credit refund. Late cancellations may result in forfeiture of credits used.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>4. User Conduct</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You agree not to misuse the platform, including but not limited to: creating fake reservations, abusing the referral system, or engaging in fraudulent activity.
        </Text>
        <Text style={[styles.subHeading, { color: colors.text }]}>5. Contact</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          For questions about these terms, contact us at support@bucr.app.
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
