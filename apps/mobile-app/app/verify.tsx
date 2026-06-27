import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MailCheck, X } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../src/lib/api';
import { useTheme } from '../src/contexts/ThemeContext';

export default function VerifyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [otp, setOtp] = useState('');

  const done = () => { if (redirect) router.replace(redirect as any); else router.back(); };

  const send = useMutation({
    mutationFn: () => authApi.sendEmailVerification(),
    onSuccess: () => Alert.alert('Code sent', 'Check your email for the 6-digit code.'),
    onError: (e: any) => {
      if (String(e?.response?.data?.error || '').toLowerCase().includes('already')) { Alert.alert('Verified', 'Your email is already verified.'); done(); return; }
      Alert.alert('Error', e?.response?.data?.error || 'Could not send code');
    },
  });

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(otp.trim()),
    onSuccess: () => { Alert.alert('Verified', 'Your email is verified — you can book now.'); done(); },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.error || 'Invalid or expired code'),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={done} style={styles.close}><X size={24} color={colors.text} /></TouchableOpacity>
      </View>
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tertiaryLight }]}>
          <MailCheck size={32} color={colors.tertiary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We sent a 6-digit code to your email when you signed up. Enter it below to start booking.
        </Text>

        <TextInput
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          style={[styles.otp, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: otp.length === 6 ? colors.tertiary : colors.border }]}
          disabled={otp.length !== 6 || verify.isPending}
          onPress={() => verify.mutate()}
        >
          {verify.isPending ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={[styles.btnText, { color: otp.length === 6 ? colors.primaryDark : colors.textMuted }]}>Verify & continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => send.mutate()} disabled={send.isPending} style={styles.resend}>
          <Text style={[styles.resendText, { color: colors.tertiary }]}>{send.isPending ? 'Sending…' : "Didn't get it? Resend code"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={done}><Text style={[styles.skip, { color: colors.textMuted }]}>Skip for now</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 28, alignItems: 'center', paddingTop: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginTop: 18 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  otp: { width: '100%', height: 56, borderRadius: 14, borderWidth: 1, marginTop: 28, fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 8 },
  btn: { width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  btnText: { fontSize: 16, fontWeight: '600' },
  resend: { marginTop: 18 },
  resendText: { fontSize: 14, fontWeight: '600' },
  skip: { marginTop: 16, fontSize: 13 },
});
