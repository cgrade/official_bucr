import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { creditsApi } from '../../src/lib/api';
import { format } from 'date-fns';
import { useTheme } from '../../src/contexts/ThemeContext';
import { creditTypeLabel } from '../(tabs)/wallet';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const { colors } = useTheme();
  const isPositive = transaction.amount > 0;
  const Icon = isPositive ? ArrowDownLeft : ArrowUpRight;
  // Precise backend description as the title; generic type label only as fallback.
  const title = transaction.description?.trim() || creditTypeLabel(transaction.type);

  return (
    <View style={[styles.transactionItem, { backgroundColor: colors.card }]}>
      <View style={[styles.transactionIcon, { backgroundColor: isPositive ? colors.tertiaryLight : colors.errorLight }]}>
        <Icon size={16} color={isPositive ? colors.tertiary : colors.error} />
      </View>
      <View style={styles.transactionContent}>
        <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
          {creditTypeLabel(transaction.type)} · {format(new Date(transaction.createdAt), 'MMM d, yyyy • h:mm a')}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: isPositive ? colors.tertiary : colors.error }]}>
        {isPositive ? '+' : ''}{transaction.amount}
      </Text>
    </View>
  );
}

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => creditsApi.getTransactions({ limit: 50 }),
  });

  const transactions = data?.data?.transactions || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Your credit transactions will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPositive: {},
  iconNegative: {},
  transactionContent: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountPositive: {},
  amountNegative: {},
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
  },
});
