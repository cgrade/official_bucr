'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { creditsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  CreditCard, TrendingUp, TrendingDown, Wallet, Users, Store,
  Loader2, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreditsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-credits-stats'],
    queryFn: () => creditsApi.getStats(),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['admin-credits-transactions', page, filter],
    queryFn: () => creditsApi.getTransactions({ page, limit: 20, type: filter || undefined }),
  });

  const stats = statsData?.data || {
    totalCreditsInCirculation: 0,
    totalCreditsPurchased: 0,
    totalCreditsSpent: 0,
    totalUserCredits: 0,
    totalVendorCredits: 0,
    todayPurchases: 0,
  };

  const transactions = txData?.data?.transactions || [];
  const pagination = txData?.data?.pagination || { page: 1, total: 0, totalPages: 1 };

  const statCards = [
    {
      name: 'Total Credits in Circulation',
      value: stats.totalCreditsInCirculation?.toLocaleString() || '0',
      subValue: formatCurrency((stats.totalCreditsInCirculation || 0) * 10),
      icon: Wallet,
      color: '',
    },
    {
      name: 'User Credits',
      value: stats.totalUserCredits?.toLocaleString() || '0',
      subValue: 'Across all users',
      icon: Users,
      color: '',
    },
    {
      name: 'Vendor Credits',
      value: stats.totalVendorCredits?.toLocaleString() || '0',
      subValue: 'Across all vendors',
      icon: Store,
      color: '',
    },
    {
      name: "Today's Purchases",
      value: stats.todayPurchases?.toLocaleString() || '0',
      subValue: 'Credits purchased today',
      icon: TrendingUp,
      color: '',
    },
  ];

  const getTypeIcon = (type: string, amount: number) => {
    if (amount > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      redeem: 'Redemption',
      refund: 'Refund',
      bonus: 'Bonus',
      forfeit: 'Forfeit',
      adjustment: 'Adjustment',
      spend: 'Spend',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#f5f0e8]">Credit System</h1>
          <p className="text-[#7a8fa6] mt-1">Monitor credit circulation and transactions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <div key={stat.name} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#7a8fa6]">{stat.name}</p>
                  <p className="text-2xl font-bold text-[#f5f0e8]">
                    {statsLoading ? '...' : stat.value}
                  </p>
                  <p className="text-xs text-[rgba(122,143,166,0.6)]">{stat.subValue}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[rgba(201,168,76,0.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#f5f0e8]">Recent Transactions</h2>
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] text-sm"
              >
                <option value="">All Types</option>
                <option value="purchase">Purchases</option>
                <option value="redeem">Redemptions</option>
                <option value="refund">Refunds</option>
                <option value="bonus">Bonuses</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[rgba(255,255,255,0.04)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Account</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Balance After</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(201,168,76,0.08)]">
                {txLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[rgba(122,143,166,0.6)]" />
                  </td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[#7a8fa6]">No transactions found</td></tr>
                ) : (
                  transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[rgba(255,255,255,0.04)]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type, tx.amount)}
                          <span className="font-medium">{getTypeLabel(tx.type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {tx.userId ? <Users className="h-4 w-4 text-blue-500" /> : <Store className="h-4 w-4 text-green-500" />}
                          <span className="text-sm text-[#7a8fa6]">{tx.userId ? 'User' : 'Vendor'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('font-semibold', tx.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#7a8fa6]">{tx.balanceAfter?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-[#7a8fa6]">{formatDate(tx.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[rgba(201,168,76,0.1)] flex items-center justify-between">
              <p className="text-sm text-[#7a8fa6]">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
