'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3, TrendingUp, Users, Store, CreditCard, CalendarCheck,
  Download, RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

const PERIODS = [
  { id: '7',   label: '7 days' },
  { id: '30',  label: '30 days' },
  { id: '90',  label: '90 days' },
  { id: '365', label: '1 year' },
];

const CREDIT_VALUE = 10;
const SPREAD       = 0.06;

function KPI({ title, value, sub, trend, icon: Icon }:
  { title: string; value: string | number; sub?: string; trend?: 'up'|'down'|'flat'; icon: any }) {
  return (
    <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5 hover:border-[rgba(201,168,76,0.35)] transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.1)]">
          <Icon className="h-4.5 w-4.5 text-[#c9a84c]" />
        </div>
        {trend === 'up'   && <ArrowUpRight   className="h-4 w-4 text-emerald-400" />}
        {trend === 'down' && <ArrowDownRight  className="h-4 w-4 text-[#f87171]" />}
        {trend === 'flat' && <Minus           className="h-4 w-4 text-[#7a8fa6]" />}
      </div>
      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6]">{title}</p>
      <p className="text-xl font-semibold text-[#f5f0e8] mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-[rgba(122,143,166,0.7)] mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <tr className="bg-[rgba(201,168,76,0.06)] border-t border-[rgba(201,168,76,0.1)]">
      <td colSpan={3} className="px-5 py-2 text-[9px] font-bold tracking-[0.2em] uppercase text-[#c9a84c]">{title}</td>
    </tr>
  );
}

function DataRow({ label, value, highlight, sub }: { label: string; value: string | number; highlight?: boolean; sub?: string }) {
  return (
    <tr className="border-b border-[rgba(201,168,76,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <td className="px-5 py-3 text-[13px] text-[#7a8fa6] w-1/2">{label}</td>
      <td className={`px-5 py-3 text-[13px] font-semibold text-right ${highlight ? 'text-[#c9a84c]' : 'text-[#f5f0e8]'}`}>
        {value}
      </td>
      <td className="px-5 py-3 text-[11px] text-[rgba(122,143,166,0.6)] text-right">{sub ?? ''}</td>
    </tr>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod]     = useState('30');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir]   = useState<'asc'|'desc'>('desc');

  const { data: overviewData, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics-overview', period],
    queryFn: () => analyticsApi.getOverview({ period }),
    refetchInterval: 120_000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['admin-analytics-revenue', period],
    queryFn: () => analyticsApi.getRevenueStats({ period }),
  });

  const d = overviewData?.data || {};
  const r = revenueData?.data  || {};
  const fmt    = (n: number | undefined) => (n ?? 0).toLocaleString('en-NG');
  const fmtNgn = (n: number | undefined) => formatCurrency(n ?? 0);

  // Derived metrics
  const creditRevenue     = Math.round((d.monthlyCredits ?? 0) * CREDIT_VALUE * (1 + SPREAD));
  const avgCreditBalance  = d.avgUserCredits ?? 0;
  const creditCirculation = d.creditsInCirculation ?? 0;
  const circFaceValue     = creditCirculation * CREDIT_VALUE;

  // Export to CSV
  const handleExport = useCallback(() => {
    const rows = [
      ['Metric', 'Value', 'Period'],
      ['Total Users',            d.totalUsers       ?? 0, `${period}d`],
      ['Active Users',           d.activeUsers       ?? 0, `${period}d`],
      ['New Users',              d.newUsers          ?? 0, `${period}d`],
      ['Total Vendors',          d.totalVendors      ?? 0, `${period}d`],
      ['Verified Vendors',       d.verifiedVendors   ?? 0, `${period}d`],
      ['Pending Vendors',        d.pendingVendors    ?? 0, `${period}d`],
      ['Total Reservations',     d.totalReservations ?? 0, `${period}d`],
      ['Monthly Reservations',   d.monthlyReservations ?? 0, `${period}d`],
      ['Completion Rate (%)',    d.completionRate    ?? 0, `${period}d`],
      ['No-show Rate (%)',       d.noShowRate        ?? 0, `${period}d`],
      ['Credits in Circulation', creditCirculation,        `${period}d`],
      ['Credits Purchased',      d.monthlyCredits    ?? 0, `${period}d`],
      ['Avg User Balance',       avgCreditBalance,         `${period}d`],
      ['Credit Revenue (NGN)',   creditRevenue,            `${period}d`],
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `bucr-analytics-${period}d-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [d, period, creditRevenue, avgCreditBalance, creditCirculation]);

  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
            <BarChart3 className="h-6 w-6 text-[#0f2547]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">Platform Analytics</h1>
            <p className="text-[12px] text-[#7a8fa6]">Live operational metrics · auto-refreshes every 2 min</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)] rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  period === p.id ? 'bg-[#c9a84c] text-[#0f2547]' : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
                }`}>{p.label}</button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(201,168,76,0.2)] text-[#7a8fa6] hover:text-[#f5f0e8] hover:border-[#c9a84c] text-[11px] font-medium transition-all">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>

          {/* Export CSV */}
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#c9a84c] text-[#0f2547] text-[11px] font-bold hover:bg-[#f5f0e8] transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Total Users"       value={fmt(d.totalUsers)}          icon={Users}         trend="up" sub={`${fmt(d.newUsers)} new this period`} />
        <KPI title="Verified Vendors"  value={fmt(d.verifiedVendors)}     icon={Store}         sub={`${fmt(d.pendingVendors)} pending`} />
        <KPI title="Reservations"      value={fmt(d.totalReservations)}   icon={CalendarCheck} sub={`${d.completionRate ?? 0}% check-in rate`} />
        <KPI title="Credit Revenue"    value={fmtNgn(creditRevenue)}      icon={CreditCard}    trend="up" sub={`${fmt(d.monthlyCredits)} credits sold`} />
      </div>

      {/* Detailed breakdown table */}
      <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(201,168,76,0.12)]">
          <h2 className="font-semibold text-[#f5f0e8]">Detailed Breakdown — Last {period} days</h2>
          {isLoading && (
            <div className="h-4 w-4 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(201,168,76,0.1)]">
              <th className="px-5 py-2.5 text-left text-[9px] font-bold tracking-[0.15em] uppercase text-[#7a8fa6]">Metric</th>
              <th className="px-5 py-2.5 text-right text-[9px] font-bold tracking-[0.15em] uppercase text-[#7a8fa6]">Value</th>
              <th className="px-5 py-2.5 text-right text-[9px] font-bold tracking-[0.15em] uppercase text-[#7a8fa6]">Context</th>
            </tr>
          </thead>
          <tbody>
            <SectionHeader title="👥 Users" />
            <DataRow label="Total registered"           value={fmt(d.totalUsers)} />
            <DataRow label="Active (non-deleted)"        value={fmt(d.activeUsers)} />
            <DataRow label="New this period"             value={fmt(d.newUsers)}           highlight sub="growth signal" />
            <DataRow label="Avg. credit balance"         value={`${fmt(avgCreditBalance)} cr`}  sub={`₦${(avgCreditBalance * CREDIT_VALUE).toLocaleString()} value`} />

            <SectionHeader title="🏪 Vendors" />
            <DataRow label="Total registered"            value={fmt(d.totalVendors)} />
            <DataRow label="Verified & approved"         value={fmt(d.verifiedVendors)}    highlight />
            <DataRow label="Pending verification"        value={fmt(d.pendingVendors)}     sub="needs KYC review" />

            <SectionHeader title="📅 Reservations" />
            <DataRow label="Total this period"           value={fmt(d.totalReservations)} />
            <DataRow label="This calendar month"         value={fmt(d.monthlyReservations)} />
            <DataRow label="Check-in / completion rate"  value={`${d.completionRate ?? 0}%`} highlight />
            <DataRow label="No-show rate"                value={`${d.noShowRate ?? 0}%`}   sub="forfeit triggers on no-show" />

            <SectionHeader title="💳 Credits & Revenue" />
            <DataRow label="Credits in circulation"      value={fmt(creditCirculation)}     sub={`₦${fmt(circFaceValue)} face value`} />
            <DataRow label="Credits purchased (period)"  value={fmt(d.monthlyCredits)}      highlight />
            <DataRow label="Avg. user wallet"            value={`${fmt(avgCreditBalance)} cr`} />
            <DataRow label="Spread revenue (period)"     value={fmtNgn(creditRevenue)}      highlight sub={`${(SPREAD * 100).toFixed(0)}% spread on ₦${CREDIT_VALUE}/credit`} />
            <DataRow label="Breakage estimate"           value={fmtNgn(r.breakage ?? 0)}    sub="expired credits recognised" />
          </tbody>
        </table>
      </div>

      {/* Status breakdown if available */}
      {d.reservationsByStatus && d.reservationsByStatus.length > 0 && (
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
          <h2 className="font-semibold text-[#f5f0e8] mb-4">Reservation Status Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {d.reservationsByStatus.map((s: any) => {
              const COLORS: Record<string, string> = {
                confirmed: '#c9a84c', checked_in: '#34d399', completed: '#818cf8',
                no_show: '#f87171', cancelled: '#6b7280', pending: '#7a8fa6',
              };
              return (
                <div key={s.status} className="text-center p-3 rounded-lg border border-[rgba(201,168,76,0.1)] bg-[rgba(255,255,255,0.02)]">
                  <p className="text-xl font-semibold text-[#f5f0e8]">{s.count ?? s._count ?? 0}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: COLORS[s.status] ?? '#7a8fa6' }}>
                    {s.status.replace(/_/g, ' ')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
