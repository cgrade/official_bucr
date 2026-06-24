import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, TrendingUp, Calendar, ChevronRight, Plus, History, Gift } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Header } from '../../src/components/Header';
import { SlideMenu } from '../../src/components/SlideMenu';
import { GradientButton } from '../../src/components/ui';

import { creditsApi, authApi, giftsApi } from '../../src/lib/api';
import { formatMoney, isLocalized } from '../../src/lib/currency';
import { useAuthStore } from '../../src/stores/auth.store';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
}

// Accurate fallback label when a transaction has no stored description.
// NOTE: prefer transaction.description (precise) over these generic labels.
export function creditTypeLabel(type: string) {
  switch (type) {
    case 'purchase': return 'Credit purchase';
    case 'refund': return 'Refund';
    case 'bonus': return 'Bonus credits';
    case 'redeem': return 'Reservation deposit';
    case 'forfeit': return 'Forfeited credits';
    case 'expire': return 'Credits expired';
    case 'adjustment': return 'Adjustment';
    default: return type;
  }
}

function TransactionItem({ transaction, colors }: { transaction: Transaction; colors: any }) {
  const isPositive = transaction.amount > 0;
  const Icon = isPositive ? Calendar : ChevronRight;
  // Use the backend's precise description ("3% show-up bonus", "Cancellation refund",
  // "Review bonus: 5 credits", …) as the title; fall back to a generic type label.
  const title = transaction.description?.trim() || creditTypeLabel(transaction.type);

  return (
    <View style={[styles.transactionItem, { backgroundColor: colors.card }]}>
      <View style={[styles.transactionIcon, { backgroundColor: isPositive ? colors.success + '15' : colors.error + '15' }]}>
        <Icon size={16} color={isPositive ? colors.success : colors.error} />
      </View>
      <View style={styles.transactionContent}>
        <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
          {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: isPositive ? colors.success : colors.error }]}>
        {isPositive ? '+' : ''}{transaction.amount} credits
      </Text>
    </View>
  );
}

function AuthRequiredView({ onLogin, colors }: { onLogin: () => void; colors: any }) {
  return (
    <View style={styles.authRequired}>
      <CreditCard size={64} color={colors.textMuted} />
      <Text style={[styles.authTitle, { color: colors.text }]}>Sign in to view wallet</Text>
      <Text style={[styles.authSubtitle, { color: colors.textSecondary }]}>
        Create an account or sign in to manage your credits
      </Text>
      <TouchableOpacity style={[styles.signInButton, { backgroundColor: colors.tertiary }]} onPress={onLogin}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WalletScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, refreshBalance } = useAuthStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const { data: creditsData, refetch } = useQuery({
    queryKey: ['credits'],
    queryFn: () => creditsApi.getBalance(),
    enabled: isAuthenticated,
  });

  // Received (pending) gifts that can be claimed
  const { data: giftsData } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => giftsApi.getAll(),
    enabled: isAuthenticated,
  });
  const pendingGifts = (giftsData?.data?.received?.data ?? []).filter((g: any) => g.status === 'pending');

  const claimMutation = useMutation({
    mutationFn: (giftId: string) => giftsApi.claim(giftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['gifts'] });
      Alert.alert('🎁 Gift Claimed!', 'Credits have been added to your wallet.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Could not claim gift');
    },
  });

  const CREDIT_VALUE_NGN = 10;
  const transactions = creditsData?.data?.transactions || [];
  const balance = creditsData?.data?.balance || user?.creditsBalance || 0;
  // balanceValue from API if present (preferred), otherwise compute locally
  const balanceValue = creditsData?.data?.balanceValue ?? balance * CREDIT_VALUE_NGN;
  const expiringIn30Days = creditsData?.data?.expiringIn30Days || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refreshBalance()]);
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header 
          onMenuPress={() => setMenuVisible(true)}
        />
        <SlideMenu 
          visible={menuVisible} 
          onClose={() => setMenuVisible(false)} 
        />
        <AuthRequiredView onLogin={() => router.push('/(auth)/login')} colors={colors} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        onMenuPress={() => setMenuVisible(true)}
      />
      <SlideMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCardContainer}>
          <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.balanceHeader}>
              <CreditCard size={24} color={colors.tertiary} />
              <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Bucr Credits</Text>
            </View>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>{balance} credits</Text>
            <Text style={[styles.balanceValue, { color: colors.tertiary }]}>{formatMoney(balanceValue)} value</Text>
            {isLocalized() && (
              <Text style={[styles.localityNote, { color: colors.textMuted }]}>
                Indicative; you’re charged in Naira (₦)
              </Text>
            )}

            {expiringIn30Days > 0 && (
              <View style={[styles.expiryWarning, { backgroundColor: colors.warningLight }]}>
                <Calendar size={14} color={colors.warning} />
                <Text style={[styles.expiryText, { color: colors.warning }]}>{expiringIn30Days} credits expiring in 30 days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.tertiary }]}
            onPress={() => router.push('/wallet/buy')}
            activeOpacity={0.85}
          >
            <CreditCard size={22} color={colors.primaryDark} />
            <Text style={[styles.actionCardTitle, { color: colors.primaryDark }]}>Buy Credits</Text>
            <Text style={[styles.actionCardSub, { color: 'rgba(7,15,30,0.6)' }]}>₦10.60/credit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/wallet/gift')}
            activeOpacity={0.85}
          >
            <Gift size={22} color={colors.tertiary} />
            <Text style={[styles.actionCardTitle, { color: colors.text }]}>Gift Credits</Text>
            <Text style={[styles.actionCardSub, { color: colors.textMuted }]}>Send to a friend</Text>
          </TouchableOpacity>
        </View>

        {/* Credit Expiry Info */}
        {expiringIn30Days > 0 && (
          <View style={[styles.expiryCard, { backgroundColor: colors.card, borderColor: colors.warning + '40' }]}>
            <View style={styles.expiryCardHeader}>
              <Calendar size={18} color={colors.warning} />
              <Text style={[styles.expiryCardTitle, { color: colors.text }]}>Credits Expiring Soon</Text>
            </View>
            <Text style={[styles.expiryCardAmount, { color: colors.warning }]}>
              {expiringIn30Days} credits
            </Text>
            <Text style={[styles.expiryCardDesc, { color: colors.textSecondary }]}>
              expiring within 30 days
            </Text>
            <View style={styles.expiryProgressBg}>
              <View style={[
                styles.expiryProgressBar,
                { 
                  backgroundColor: colors.warning,
                  width: `${Math.min(100, (expiringIn30Days / Math.max(balance, 1)) * 100)}%`,
                },
              ]} />
            </View>
            <Text style={[styles.expiryCardHint, { color: colors.textMuted }]}>
              Book a reservation to use your credits before they expire. Credits expire 90 days after purchase.
            </Text>
          </View>
        )}

        {/* Credit Info — accurate to the credit economy (1cr=₦10, +3% show-up,
            +5/review, keep 60% on no-show, gifts, 90-day expiry). */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>How credits work</Text>
          {[
            `1 credit = ${formatMoney(CREDIT_VALUE_NGN)} · buy at ${formatMoney(CREDIT_VALUE_NGN * 1.06)}/credit (6% service fee)`,
            'Use credits as a refundable deposit to confirm a reservation',
            'Show up → full deposit back + 3% bonus credits',
            'Leave a review after you dine → earn 5 credits',
            'No-show → you keep 60% of the deposit (40% is forfeited)',
            'Receive credits as gifts from friends',
            'Credits expire 90 days after purchase',
          ].map((line, i) => (
            <View key={i} style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: colors.tertiary }]}>•</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{line}</Text>
            </View>
          ))}
        </View>

        {/* Pending Gifts to Claim */}
        {pendingGifts.length > 0 && (
          <View style={[styles.giftsSection, { backgroundColor: colors.card, borderColor: colors.tertiary + '40' }]}>
            <View style={styles.giftsSectionHeader}>
              <Gift size={16} color={colors.tertiary} />
              <Text style={[styles.giftsSectionTitle, { color: colors.text }]}>Gifts to Claim</Text>
            </View>
            {pendingGifts.map((gift: any) => (
              <View key={gift.id} style={[styles.giftItem, { borderColor: colors.border }]}>
                <View style={styles.giftInfo}>
                  <Text style={[styles.giftAmount, { color: colors.tertiary }]}>
                    {gift.creditAmount} credits
                  </Text>
                  <Text style={[styles.giftMeta, { color: colors.textMuted }]}>
                    {formatMoney(gift.creditAmount * CREDIT_VALUE_NGN)} value
                  </Text>
                  {gift.message && (
                    <Text style={[styles.giftMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                      "{gift.message}"
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.claimButton, { backgroundColor: colors.tertiary }]}
                  onPress={() => claimMutation.mutate(gift.id)}
                  disabled={claimMutation.isPending}
                >
                  <Text style={[styles.claimButtonText, { color: colors.primaryDark }]}>Claim</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Transactions Header */}
        <View style={styles.transactionsHeader}>
          <Text style={[styles.transactionsTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/wallet/history')}>
            <Text style={[styles.seeAllText, { color: colors.tertiary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View>
          {transactions.length > 0 ? (
            transactions.map((item: Transaction) => (
              <TransactionItem key={item.id} transaction={item} colors={colors} />
            ))
          ) : (
            <View style={styles.emptyTransactions}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  balanceCardContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#070f1e',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#070f1e',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 16,
    color: '#070f1e',
    opacity: 0.8,
  },
  localityNote: {
    fontSize: 11,
    marginTop: 4,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  expiryText: {
    fontSize: 13,
    color: '#FCD34D',
  },
  buyButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 0,
  },
  actionCard: {
    flex: 1, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16,
    alignItems: 'center', gap: 6,
  },
  actionCardTitle: { fontSize: 14, fontWeight: '700' },
  actionCardSub:   { fontSize: 11 },
  giftButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  giftButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expiryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  expiryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  expiryCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  expiryCardAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  expiryCardDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  expiryProgressBg: {
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  expiryProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  expiryCardHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconPositive: {},
  transactionIconNegative: {},
  transactionContent: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountPositive: {},
  amountNegative: {},
  emptyTransactions: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  authRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#070f1e',
  },
  // Gifts
  giftsSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  giftsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  giftsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  giftInfo: {
    flex: 1,
  },
  giftAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  giftMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  giftMessage: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  claimButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 12,
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
