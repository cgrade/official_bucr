'use client';
import FeatureGate from '@/components/ui/FeatureGate';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsApi } from '@/lib/api';
import { formatCurrency, CREDIT_VALUE_NGN } from '@/lib/utils';
import {
  BarChart3, CalendarCheck, Users, Star,
  TrendingUp, TrendingDown, Clock, CheckCircle,
  XCircle, AlertCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const PERIODS = [
  { id: '7',  label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
];

function pctArrow(change: string | null | undefined) {
  if (!change) return null;
  const isDown = change.startsWith('-');
  return isDown
    ? <span className="flex items-center gap-0.5 text-[#f87171] text-[11px] font-medium"><TrendingDown className="h-3 w-3" />{change}</span>
    : <span className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-medium"><TrendingUp className="h-3 w-3" />{change}</span>;
}

function StatCard({ title, value, sub, change, icon: Icon }: { title: string; value: string | number; sub?: string; change?: string | null; icon: any }) {
  return (
    <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5 flex flex-col gap-4 hover:border-[rgba(201,168,76,0.35)] transition-all">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.1)]">
          <Icon className="h-5 w-5 text-[#c9a84c]" />
        </div>
        {pctArrow(change)}
      </div>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6]">{title}</p>
        <p className="text-2xl font-semibold text-[#f5f0e8] mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-[rgba(122,143,166,0.7)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[12px]">
        <span className="text-[#7a8fa6]">{label}</span>
        <span className="text-[#f5f0e8] font-medium">{count} <span className="text-[#7a8fa6]">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function AnalyticsPageInner() {
  const [period, setPeriod] = useState('30');

  // Dashboard = overall stats + recent activity
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
    refetchInterval: 60_000,
  });

  // Reservation stats = time-based breakdown
  const { data: resData, isLoading: resLoading } = useQuery({
    queryKey: ['analytics-reservations', period],
    queryFn: () => analyticsApi.getReservationStats(period),
    refetchInterval: 60_000,
  });

  const dash  = dashData?.data  || {};
  const stats = dash.stats       || {};
  const today = dash.today       || {};
  const changes = dash.changes   || {};

  // Reservation stats from the reservations endpoint
  const resStats   = resData?.data?.statusStats      || [];
  const dailyData  = resData?.data?.dailyReservations || [];
  const timeSlots  = resData?.data?.timeSlotAnalysis  || [];
  const partySizes = resData?.data?.partySizeDistribution || [];
  const resSummary = resData?.data?.summary          || {};

  // Build status breakdown for today
  const todayTotal = (today.confirmed || 0) + (today.checkedIn || 0) + (today.completed || 0)
    + (today.noShow || 0) + (today.cancelled || 0) + (today.pending || 0);

  const isLoading = dashLoading || resLoading;

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f2547] border-b border-[rgba(201,168,76,0.18)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
              <BarChart3 className="h-6 w-6 text-[#0f2547]" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-[#f5f0e8]">Analytics</h1>
              <p className="text-sm text-[#7a8fa6]">Performance overview for your restaurant</p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)] rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  period === p.id
                    ? 'bg-[#c9a84c] text-[#0f2547]'
                    : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">

        {/* ── Overall KPI grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Bookings"  value={stats.totalBookings  ?? 0}  icon={CalendarCheck} change={changes.monthVsLastMonth} />
          <StatCard title="Total Guests"    value={stats.totalGuests    ?? 0}  icon={Users}         sub="unique profiles" />
          <StatCard title="Avg. Rating"     value={stats.averageRating ? Number(stats.averageRating).toFixed(1) : '—'}
            sub={`${stats.totalReviews ?? 0} reviews`} icon={Star} />
          <StatCard title="Check-in Rate"   value={stats.checkInRate ?? '—'}  icon={CheckCircle}
            sub={`No-show: ${stats.noShowRate ?? '—'}`} />
        </div>

        {/* ── Today snapshot ───────────────────────────────────────────── */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[18px] font-semibold text-[#f5f0e8]">Today's Reservations</h2>
            <span className="text-[#c9a84c] font-semibold text-lg">{todayTotal}</span>
          </div>
          <div className="space-y-3">
            <StatusBar label="Pending"    count={today.pending    ?? 0} total={todayTotal} color="#7a8fa6" />
            <StatusBar label="Confirmed"  count={today.confirmed  ?? 0} total={todayTotal} color="#c9a84c" />
            <StatusBar label="Checked In" count={today.checkedIn  ?? 0} total={todayTotal} color="#34d399" />
            <StatusBar label="Completed"  count={today.completed  ?? 0} total={todayTotal} color="#818cf8" />
            <StatusBar label="No-show"    count={today.noShow     ?? 0} total={todayTotal} color="#f87171" />
            <StatusBar label="Cancelled"  count={today.cancelled  ?? 0} total={todayTotal} color="#6b7280" />
          </div>
        </div>

        {/* ── Period stats row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6] mb-1">Total in Period</p>
            <p className="text-3xl font-semibold text-[#f5f0e8]">{resSummary.totalReservations ?? 0}</p>
            <p className="text-[11px] text-[#7a8fa6] mt-1">last {period} days</p>
          </div>
          <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6] mb-1">Peak Hour</p>
            <p className="text-3xl font-semibold text-[#f5f0e8]">
              {timeSlots[0]?.timeSlot ?? '—'}
            </p>
            <p className="text-[11px] text-[#7a8fa6] mt-1">most popular booking slot</p>
          </div>
          <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6] mb-1">Avg. Party Size</p>
            <p className="text-3xl font-semibold text-[#f5f0e8]">
              {resSummary.avgPartySize ? Number(resSummary.avgPartySize).toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-[#7a8fa6] mt-1">guests per reservation</p>
          </div>
        </div>

        {/* ── Status breakdown for period ─────────────────────────────── */}
        {resStats.length > 0 && (
          <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-6">
            <h2 className="font-display text-[18px] font-semibold text-[#f5f0e8] mb-5">
              Reservation Outcomes — Last {period} Days
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {resStats.map((s: any) => {
                const COLOR: Record<string, string> = {
                  confirmed:  '#c9a84c',
                  checked_in: '#34d399',
                  completed:  '#818cf8',
                  no_show:    '#f87171',
                  cancelled:  '#6b7280',
                  pending:    '#7a8fa6',
                };
                return (
                  <div key={s.status} className="text-center p-3 rounded-lg border border-[rgba(201,168,76,0.1)] bg-[rgba(255,255,255,0.02)]">
                    <p className="text-2xl font-semibold text-[#f5f0e8]">{s.count}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mt-1"
                      style={{ color: COLOR[s.status] ?? '#7a8fa6' }}>
                      {s.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Daily activity chart (simplified bar) ───────────────────── */}
        {dailyData.length > 0 && (
          <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-6">
            <h2 className="font-display text-[18px] font-semibold text-[#f5f0e8] mb-5">Daily Reservations</h2>
            <div className="flex items-end gap-1 h-32">
              {dailyData.map((d: any) => {
                const maxCount = Math.max(...dailyData.map((x: any) => Number(x.count)));
                const heightPct = maxCount > 0 ? (Number(d.count) / maxCount) * 100 : 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block
                      bg-[#c9a84c] text-[#0f2547] text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {d.date.slice(5)}: {d.count}
                    </div>
                    <div className="w-full bg-[#c9a84c] rounded-sm transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#7a8fa6] mt-2">
              <span>{dailyData[0]?.date?.slice(5)}</span>
              <span>{dailyData[dailyData.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return <FeatureGate feature="analytics"><AnalyticsPageInner /></FeatureGate>;
}
