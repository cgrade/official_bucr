import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Share, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gift, Users, Copy, Share2, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTheme } from '../../src/contexts/ThemeContext';
import { referralApi } from '../../src/lib/api';

export default function ReferralScreen() {
  const router        = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { colors }    = useTheme();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referralCode ?? '';

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: referralApi.getStats,
    enabled: isAuthenticated && !!referralCode,
  });

  const stats = statsData?.data ?? { friendsReferred: 0, creditsEarned: 0, bonusPerReferral: 20, inviteeBonus: 10 };

  const handleCopy = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `I use Bucr for restaurant reservations in Abuja — no more no-shows!\n\nSign up with my code ${referralCode} and you'll get ${stats.inviteeBonus} free credits to start.\n\nhttps://bucr.ng`,
      title: 'Join Bucr',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Refer Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.tertiaryLight }]}>
            <Gift size={40} color={colors.tertiary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Earn {stats.bonusPerReferral} Credits</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            For every friend who joins Bucr with your code.{'\n'}
            They also get {stats.inviteeBonus} free credits to start.
          </Text>
        </View>

        {/* Code card */}
        {referralCode ? (
          <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Your Referral Code</Text>
            <View style={styles.codeRow}>
              <Text style={[styles.code, { color: colors.tertiary }]}>{referralCode}</Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: copied ? colors.success + '20' : colors.inputBackground }]}
                onPress={handleCopy}
              >
                {copied
                  ? <Check size={16} color={colors.success} />
                  : <Copy size={16} color={colors.tertiary} />}
                <Text style={[styles.copyTxt, { color: copied ? colors.success : colors.tertiary }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
              {isAuthenticated ? 'Referral code loading…' : 'Sign in to get your referral code'}
            </Text>
          </View>
        )}

        {/* Share button */}
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.tertiary, opacity: referralCode ? 1 : 0.5 }]}
          onPress={handleShare}
          disabled={!referralCode}
        >
          <Share2 size={18} color={colors.primaryDark} />
          <Text style={[styles.shareTxt, { color: colors.primaryDark }]}>Share with Friends</Text>
        </TouchableOpacity>

        {/* How it works */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How it works</Text>
          {[
            { n: '1', title: 'Share your code', desc: 'Send your unique code to friends' },
            { n: '2', title: 'Friend signs up', desc: 'They create a Bucr account using your code' },
            { n: '3', title: 'You both earn', desc: `You get ${stats.bonusPerReferral} credits · they get ${stats.inviteeBonus} credits instantly` },
          ].map(step => (
            <View key={step.n} style={[styles.step, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.stepNum, { backgroundColor: colors.tertiaryLight }]}>
                <Text style={[styles.stepNumTxt, { color: colors.tertiary }]}>{step.n}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Stats */}
        {isAuthenticated && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Users size={22} color={colors.tertiary} />
              {isLoading
                ? <ActivityIndicator size="small" color={colors.tertiary} style={{ marginVertical: 4 }} />
                : <Text style={[styles.statNum, { color: colors.text }]}>{stats.friendsReferred}</Text>}
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Friends Referred</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Gift size={22} color={colors.tertiary} />
              {isLoading
                ? <ActivityIndicator size="small" color={colors.tertiary} style={{ marginVertical: 4 }} />
                : <Text style={[styles.statNum, { color: colors.text }]}>{stats.creditsEarned}</Text>}
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Credits Earned</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn:    { padding: 4 },
  title:      { fontSize: 18, fontWeight: '600' },
  content:    { padding: 16, gap: 12 },

  hero: {
    borderRadius: 20, borderWidth: 1, padding: 28,
    alignItems: 'center', gap: 10,
  },
  heroIcon:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroTitle:  { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  heroSub:    { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  codeCard:   { borderRadius: 16, borderWidth: 1, padding: 18, gap: 10 },
  codeLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  codeRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code:       { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  copyTxt:    { fontSize: 13, fontWeight: '600' },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  shareTxt:   { fontSize: 15, fontWeight: '700' },

  section:    { borderRadius: 16, borderWidth: 1, padding: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  step: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepNum:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt: { fontSize: 14, fontWeight: '700' },
  stepContent: { flex: 1 },
  stepTitle:  { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  stepDesc:   { fontSize: 13, lineHeight: 18 },

  statsRow:   { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 18,
    alignItems: 'center', gap: 6,
  },
  statNum:    { fontSize: 24, fontWeight: '700' },
  statLbl:    { fontSize: 12, textAlign: 'center' },
});
