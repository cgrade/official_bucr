'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { dashboardApi, analyticsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Users, Store, CreditCard, CalendarCheck,
  TrendingUp, AlertTriangle, ArrowRight, Activity,
  CheckCircle, Clock, ShieldAlert, Wallet, FileText, BarChart3,
} from 'lucide-react';

const CREDIT_VALUE_NGN = 10;

function KpiCard({ title, value, sub, icon: Icon, accent = false }:
  { title: string; value: string | number; sub?: string; icon: any; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border transition-all hover:border-[rgba(201,168,76,0.4)] ${
      accent
        ? 'bg-[#c9a84c] border-[#c9a84c]'
        : 'bg-[#0f2547] border-[rgba(201,168,76,0.18)]'
    }`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg mb-4 ${
        accent ? 'bg-[rgba(15,37,71,0.2)]' : 'bg-[rgba(201,168,76,0.1)]'
      }`}>
        <Icon className={`h-5 w-5 ${accent ? 'text-[#0f2547]' : 'text-[#c9a84c]'}`} />
      </div>
      <p className={`text-[11px] font-semibold tracking-[0.12em] uppercase mb-0.5 ${accent ? 'text-[rgba(15,37,71,0.7)]' : 'text-[#7a8fa6]'}`}>
        {title}
      </p>
      <p className={`text-2xl font-semibold ${accent ? 'text-[#0f2547]' : 'text-[#f5f0e8]'}`}>
        {value}
      </p>
      {sub && <p className={`text-[11px] mt-0.5 ${accent ? 'text-[rgba(15,37,71,0.6)]' : 'text-[rgba(122,143,166,0.7)]'}`}>{sub}</p>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href}
      className="flex items-center justify-between p-3.5 rounded-lg border border-[rgba(201,168,76,0.12)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(201,168,76,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-all group">
      <div className="flex items-center gap-3">
        <Icon className="h-4.5 w-4.5 text-[#c9a84c]" />
        <span className="text-[13px] font-medium text-[rgba(245,240,232,0.75)] group-hover:text-[#f5f0e8]">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-[rgba(201,168,76,0.4)] group-hover:text-[#c9a84c] transition-colors" />
    </Link>
  );
}

export default function DashboardPage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 60_000,
  });

  const stats = statsData?.data || {};
  const recent = stats.recent || {};
  const credits = stats.credits || {};

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('en-NG');

  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#f5f0e8]">Dashboard</h1>
          <p className="text-[13px] text-[#7a8fa6] mt-1">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[12px] font-medium text-emerald-400">Systems Operational</span>
        </div>
      </div>

      {/* Pending verifications alert */}
      {(stats.pendingVerifications || 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.3)]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#c9a84c] flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#f5f0e8] text-[14px]">
                {stats.pendingVerifications} vendor{stats.pendingVerifications !== 1 ? 's' : ''} pending verification
              </p>
              <p className="text-[12px] text-[#7a8fa6]">Review KYC documents to complete onboarding</p>
            </div>
          </div>
          <Link href="/documents"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c9a84c] text-[#0f2547] text-[12px] font-bold hover:bg-[#f5f0e8] transition-colors whitespace-nowrap">
            Review <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Platform Revenue" icon={Wallet}
          value={formatCurrency(stats.totalRevenue ?? 0)}
          sub="total credit-spread earnings"
          accent />
        <KpiCard title="Total Users"    icon={Users}
          value={fmt(stats.totalUsers)}
          sub={`${fmt(stats.activeUsers)} active`} />
        <KpiCard title="Total Vendors"  icon={Store}
          value={fmt(stats.totalVendors)}
          sub={`${fmt(stats.verifiedVendors)} verified`} />
        <KpiCard title="Credits in Wallet" icon={CreditCard}
          value={fmt(credits.totalInCirculation)}
          sub={`₦${((credits.totalInCirculation ?? 0) * CREDIT_VALUE_NGN).toLocaleString()} face value`} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Today's Reservations" icon={CalendarCheck}
          value={fmt(stats.todayReservations)} />
        <KpiCard title="Monthly Reservations" icon={TrendingUp}
          value={fmt(stats.thisMonth?.reservations)} />
        <KpiCard title="Pending KYC"  icon={ShieldAlert}
          value={fmt(stats.pendingVerifications)}
          sub="documents awaiting review" />
        <KpiCard title="Credits Purchased" icon={Activity}
          value={formatCurrency(stats.creditsPurchased ?? 0)}
          sub="total spend on credits" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent users */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#f5f0e8]">Recent Users</h3>
            <Link href="/users" className="text-[11px] text-[#c9a84c] hover:text-[#f5f0e8]">View all →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => (
              <div key={i} className="h-10 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
            ))}</div>
          ) : (recent.users || []).length === 0 ? (
            <p className="text-[12px] text-[#7a8fa6] text-center py-6">No users yet</p>
          ) : (
            <div className="space-y-2.5">
              {(recent.users || []).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  {u.avatar ? (
                    <img
                      src={u.avatar.startsWith('http') ? u.avatar : `${process.env.NEXT_PUBLIC_API_URL || ''}${u.avatar}`}
                      alt={u.name}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[rgba(201,168,76,0.12)] flex items-center justify-center text-[11px] font-bold text-[#c9a84c] flex-shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#f5f0e8] truncate">{u.name}</p>
                    <p className="text-[10px] text-[#7a8fa6] truncate">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent vendors */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#f5f0e8]">Recent Vendors</h3>
            <Link href="/vendors" className="text-[11px] text-[#c9a84c] hover:text-[#f5f0e8]">View all →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => (
              <div key={i} className="h-10 rounded-lg bg-[rgba(255,255,255,0.04)] animate-pulse" />
            ))}</div>
          ) : (recent.vendors || []).length === 0 ? (
            <p className="text-[12px] text-[#7a8fa6] text-center py-6">No vendors yet</p>
          ) : (
            <div className="space-y-2.5">
              {(recent.vendors || []).map((v: any) => {
                const STATUS_COLORS: Record<string, string> = {
                  approved: 'text-emerald-400', rejected: 'text-[#f87171]', pending: 'text-[#c9a84c]',
                };
                return (
                  <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-[rgba(201,168,76,0.12)] flex items-center justify-center text-[11px] font-bold text-[#c9a84c] flex-shrink-0">
                      {v.businessName?.charAt(0)?.toUpperCase() ?? 'V'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#f5f0e8] truncate">{v.businessName}</p>
                      <p className={`text-[10px] font-semibold capitalize ${STATUS_COLORS[v.verificationStatus] ?? 'text-[#7a8fa6]'}`}>
                        {v.verificationStatus}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
          <h3 className="font-semibold text-[#f5f0e8] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <QuickLink href="/vendors"   icon={Store}     label="Manage Vendors" />
            <QuickLink href="/users"     icon={Users}     label="User Management" />
            <QuickLink href="/documents" icon={FileText}  label="KYC Documents" />
            <QuickLink href="/credits"   icon={Wallet}    label="Credit System" />
            <QuickLink href="/analytics" icon={BarChart3} label="Platform Analytics" />
            <QuickLink href="/revenue"   icon={TrendingUp} label="Revenue Ledger" />
          </div>
        </div>
      </div>
    </div>
  );
}
