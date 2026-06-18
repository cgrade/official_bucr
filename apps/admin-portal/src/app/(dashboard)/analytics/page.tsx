'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => analyticsApi.getOverview(),
  });

  const d = data?.data || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>

      {/* Single compact table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <td colSpan={4} className="px-4 py-2 font-medium text-slate-500 uppercase text-xs">Platform</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Users</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.totalUsers || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Vendors</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.totalVendors || 0)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Verified Vendors</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.verifiedVendors || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Active Users</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.activeUsers || 0)}</td>
            </tr>

            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <td colSpan={4} className="px-4 py-2 font-medium text-slate-500 uppercase text-xs">Reservations</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Total</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.totalReservations || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">This Month</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.monthlyReservations || 0)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Completion</td>
              <td className="px-4 py-3 font-semibold text-right text-green-600">{d.completionRate || 0}%</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">No-Show</td>
              <td className="px-4 py-3 font-semibold text-right text-red-500">{d.noShowRate || 0}%</td>
            </tr>

            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <td colSpan={4} className="px-4 py-2 font-medium text-slate-500 uppercase text-xs">Orders</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Total</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.totalOrders || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">This Month</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.monthlyOrders || 0)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Avg Value</td>
              <td className="px-4 py-3 font-semibold text-right">{formatCurrency(d.avgOrderValue || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Revenue</td>
              <td className="px-4 py-3 font-semibold text-right text-green-600">{formatCurrency(d.totalRevenue || 0)}</td>
            </tr>

            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <td colSpan={4} className="px-4 py-2 font-medium text-slate-500 uppercase text-xs">Credits</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">In Circulation</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.creditsInCirculation || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Purchased</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.monthlyCredits || 0)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Credit Revenue</td>
              <td className="px-4 py-3 font-semibold text-right text-green-600">{formatCurrency(d.creditRevenue || 0)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Avg Balance</td>
              <td className="px-4 py-3 font-semibold text-right">{formatNumber(d.avgUserCredits || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
