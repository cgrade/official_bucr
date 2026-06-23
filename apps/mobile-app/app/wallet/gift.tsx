import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gift, User, Phone, Mail, MessageSquare } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuthStore } from '../../src/stores/auth.store';
import { giftsApi } from '../../src/lib/api';

const CREDIT_VALUE_NGN = 10;
const GIFT_FEE_PCT = 0.08;

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function GiftCreditsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientType, setRecipientType] = useState<'email' | 'phone'>('phone');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');

  const effectiveAmount = customAmount ? parseInt(customAmount, 10) || 0 : creditAmount;
  const feeCredits = Math.round(effectiveAmount * GIFT_FEE_PCT);
  const totalDebit = effectiveAmount + feeCredits;
  const hasSufficientCredits = (user?.creditsBalance ?? 0) >= totalDebit;

  const sendMutation = useMutation({
    mutationFn: () =>
      giftsApi.send({
        creditAmount: effectiveAmount,
        ...(recipientType === 'email' ? { recipientEmail: recipient } : { recipientPhone: recipient }),
        ...(message.trim() ? { message: message.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      Alert.alert(
        'Gift Sent!',
        `${effectiveAmount} credits have been sent. The recipient will receive an invite to claim them.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.message || 'Failed to send gift';
      Alert.alert('Error', msg);
    },
  });

  const handleSend = () => {
    if (effectiveAmount <= 0) return Alert.alert('Invalid amount', 'Enter a positive credit amount');
    if (!recipient.trim()) return Alert.alert('Missing recipient', 'Enter a phone number or email');
    if (!hasSufficientCredits) {
      return Alert.alert('Insufficient credits', `You need ${totalDebit} credits (${effectiveAmount} + ${feeCredits} fee) but have ${user?.creditsBalance ?? 0}`);
    }

    Alert.alert(
      'Confirm Gift',
      `Send ${effectiveAmount} credits to ${recipient.trim()}?\n\nYou will be charged ${totalDebit} credits (including ${feeCredits} fee).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Gift', onPress: () => sendMutation.mutate() },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gift Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Your balance */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your balance</Text>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>{user?.creditsBalance ?? 0} credits</Text>
          <Text style={[styles.balanceValue, { color: colors.textMuted }]}>
            ₦{((user?.creditsBalance ?? 0) * CREDIT_VALUE_NGN).toLocaleString()} value
          </Text>
        </View>

        {/* Amount */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Amount to gift</Text>
        <View style={styles.quickAmounts}>
          {QUICK_AMOUNTS.map((amt) => {
            const selected = creditAmount === amt && !customAmount;
            return (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountChip,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  selected && { borderColor: colors.tertiary, backgroundColor: colors.tertiaryLight },
                ]}
                onPress={() => { setCreditAmount(amt); setCustomAmount(''); }}
              >
                <Text style={[styles.amountChipText, { color: selected ? colors.tertiary : colors.text }]}>{amt}</Text>
                <Text style={[styles.amountChipSub, { color: selected ? colors.tertiary : colors.textMuted }]}>
                  ₦{(amt * CREDIT_VALUE_NGN).toLocaleString()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Custom amount"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={customAmount}
          onChangeText={setCustomAmount}
          onFocus={() => setCreditAmount(0)}
        />

        {/* Fee summary */}
        <View style={[styles.feeCard, { backgroundColor: colors.card }]}>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Gift amount</Text>
            <Text style={[styles.feeValue, { color: colors.text }]}>{effectiveAmount} credits</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Service fee (8%)</Text>
            <Text style={[styles.feeValue, { color: colors.text }]}>{feeCredits} credits</Text>
          </View>
          <View style={[styles.feeDivider, { backgroundColor: colors.border }]} />
          <View style={styles.feeRow}>
            <Text style={[styles.feeTotalLabel, { color: colors.text }]}>Total deducted</Text>
            <Text style={[styles.feeTotalValue, { color: hasSufficientCredits ? colors.tertiary : colors.error }]}>
              {totalDebit} credits
            </Text>
          </View>
        </View>

        {/* Recipient */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipient</Text>
        <View style={styles.recipientToggle}>
          {(['phone', 'email'] as const).map((type) => {
            const sel = recipientType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.toggleBtn,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  sel && { backgroundColor: colors.tertiary, borderColor: colors.tertiary },
                ]}
                onPress={() => setRecipientType(type)}
              >
                {type === 'phone'
                  ? <Phone size={14} color={sel ? colors.primaryDark : colors.textMuted} />
                  : <Mail  size={14} color={sel ? colors.primaryDark : colors.textMuted} />}
                <Text style={[styles.toggleBtnText, { color: sel ? colors.primaryDark : colors.text }]}>
                  {type === 'phone' ? 'Phone' : 'Email'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder={recipientType === 'phone' ? '+234 800 000 0000' : 'recipient@email.com'}
          placeholderTextColor={colors.textMuted}
          keyboardType={recipientType === 'phone' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          value={recipient}
          onChangeText={setRecipient}
        />

        {/* Message */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Message (optional)</Text>
        <TextInput
          style={[styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Add a personal note..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={280}
          value={message}
          onChangeText={setMessage}
        />
        <Text style={[styles.charCount, { color: colors.textMuted }]}>{message.length}/280</Text>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Gift size={16} color={colors.tertiary} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            If the recipient doesn't have a Bucr account, they'll get an invite. The gift expires in 30 days — unclaimed gifts are fully refunded including the fee.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: hasSufficientCredits ? colors.tertiary : colors.border },
          ]}
          onPress={handleSend}
          disabled={sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator color="#070f1e" />
          ) : (
            <Text style={styles.sendButtonText}>Send {effectiveAmount} Credits</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  balanceCard: { padding: 16, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  balanceLabel: { fontSize: 13 },
  balanceAmount: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  balanceValue: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  quickAmounts: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  amountChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', gap: 2,
  },
  amountChipText: { fontSize: 15, fontWeight: '700' },
  amountChipSub:  { fontSize: 10 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 12,
  },
  inputMultiline: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, textAlign: 'right', marginBottom: 12 },
  feeCard: { padding: 14, borderRadius: 12, marginBottom: 20 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  feeLabel: { fontSize: 14 },
  feeValue: { fontSize: 14 },
  feeDivider: { height: 1, marginVertical: 8 },
  feeTotalLabel: { fontSize: 15, fontWeight: '600' },
  feeTotalValue: { fontSize: 15, fontWeight: '700' },
  recipientToggle: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  toggleBtnText: { fontSize: 14, fontWeight: '500' },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { padding: 20, paddingBottom: 34, borderTopWidth: 1 },
  sendButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sendButtonText: { fontSize: 16, fontWeight: '700', color: '#070f1e' },
});
