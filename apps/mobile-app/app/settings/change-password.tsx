import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { authApi } from '../../src/lib/api';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Password Changed', 'Your password has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.response?.data?.error || 'Could not change password');
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!current) return setError('Enter your current password');
    if (next.length < 8) return setError('New password must be at least 8 characters');
    if (next !== confirm) return setError('New passwords do not match');
    if (next === current) return setError('New password must be different from current');
    mutation.mutate();
  };

  const Field = ({ label, value, onChange, placeholder }: any) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <Lock size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {Field({ label: 'Current Password', value: current, onChange: setCurrent, placeholder: 'Enter current password' })}
          {Field({ label: 'New Password', value: next, onChange: setNext, placeholder: 'At least 8 characters' })}
          {Field({ label: 'Confirm New Password', value: confirm, onChange: setConfirm, placeholder: 'Re-enter new password' })}

          <TouchableOpacity style={styles.showRow} onPress={() => setShow(!show)}>
            {show ? <EyeOff size={16} color={colors.textMuted} /> : <Eye size={16} color={colors.textMuted} />}
            <Text style={[styles.showText, { color: colors.textMuted }]}>{show ? 'Hide' : 'Show'} passwords</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tertiary }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <ActivityIndicator color={colors.primaryDark} />
              : <Text style={[styles.submitText, { color: colors.primaryDark }]}>Update Password</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 20, gap: 16 },
  errorBox: { borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13, textAlign: 'center' },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  showText: { fontSize: 13 },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { fontSize: 15, fontWeight: '700' },
});
