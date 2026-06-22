'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { reservationsApi, analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatTime, formatCurrency } from '@/lib/utils';
import {
  CalendarCheck,
  TrendingUp,
  Users,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  DollarSign,
  ArrowUpRight,
  } from 'lucide-react';
import Link from 'next/link';
import { VendorOnboarding } from '@/components/VendorOnboarding';

const statusConfig = {
  CONFIRMED: { label: 'Confirmed', variant: 'default' as const, icon: Clock, color: 'text-[#c9a84c]', bg: 'bg-[rgba(201,168,76,0.1)]' },
  CHECKED_IN: { label: 'Checked In', variant: 'success' as const, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CANCELLED: { label: 'Cancelled', variant: 'error' as const, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  NO_SHOW: { label: 'No Show', variant: 'warning' as const, icon: AlertCircle, color: 'text-[#c9a84c]', bg: 'bg-[#c9a84c]/10' },
  COMPLETED: { label: 'Completed', variant: 'success' as const, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export default function DashboardPage() {
  const { vendor } = useAuthStore();

  const { data: todayReservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: () => reservationsApi.getToday(),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // All stats come from the analytics API — no hardcoded values
  const analyticsData = analytics?.data || {};
  const reliabilityScore   = analyticsData?.vendor?.reliabilityScore ?? null;
  const bookWithConfidence = analyticsData?.vendor?.bookWithConfidence ?? false;

  const stats = [
    {
      title: "Today's Bookings",
      value: analyticsData?.today?.reservations ?? 0,
      change: analyticsData?.changes?.todayVsYesterday ?? null,
      icon: CalendarCheck,
      gradient: 'bg-[#0f2547]',
      lightBg: 'bg-primary-500/10 dark:bg-primary-500/20',
    },
    {
      title: 'Weekly Reservations',
      value: analyticsData?.thisWeek?.reservations ?? 0,
      change: analyticsData?.changes?.weekVsLastWeek ?? null,
      icon: Users,
      gradient: 'bg-emerald-600',
      lightBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    },
    {
      title: 'Monthly Check-ins',
      value: analyticsData?.thisMonth?.reservations ?? 0,
      change: analyticsData?.changes?.monthVsLastMonth ?? null,
      icon: DollarSign,
      gradient: 'bg-[rgba(255,255,255,0.06)]',
      lightBg: 'bg-secondary-500/10 dark:bg-secondary-500/20',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-[#f5f0e8]"
            >
              {greeting()}, <span className="text-[#c9a84c]">{vendor?.businessName || 'there'}</span>!
            </motion.h1>
            <p className="text-sm text-[#7a8fa6]">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">
        {/* First-run setup checklist (auto-hides once complete or dismissed) */}
        <VendorOnboarding />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="stat-card glass-card rounded-2xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-[#7a8fa6]">{stat.title}</p>
                <p className="mt-1 text-3xl font-bold text-[#f5f0e8]">{stat.value}</p>
              </div>
            </motion.div>
          ))}

          {/* Reliability Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="stat-card rounded-2xl bg-[#0f2547] border border-[rgba(201,168,76,0.2)] p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(201,168,76,0.1)]">
                <Sparkles className="h-6 w-6 text-[#c9a84c]" />
              </div>
              {bookWithConfidence && (
                <span className="flex items-center gap-1 rounded-full bg-[rgba(201,168,76,0.15)] px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-[#c9a84c]">
                  ✓ Verified
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-[#7a8fa6]">Reliability Score</p>
              <p className="mt-1 text-3xl font-bold text-[#f5f0e8]">
                {reliabilityScore != null ? `${(reliabilityScore * 100).toFixed(0)}%` : '—'}
              </p>
              <p className="text-[11px] text-[#7a8fa6] mt-1">
                {bookWithConfidence
                  ? 'Book With Confidence badge earned'
                  : reliabilityScore != null
                    ? `${((1 - reliabilityScore) * 100).toFixed(0)}% away from badge`
                    : 'Score computed after first bookings'}
              </p>
            </div>
          </motion.div>

          {/* QR Scanner CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card relative overflow-hidden rounded-2xl bg-[#0f2547] border border-[rgba(201,168,76,0.2)] p-6 text-white"
          >
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(201,168,76,0.15)]">
                <QrCode className="h-6 w-6 text-[#c9a84c]" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-[#7a8fa6]">Quick Check-in</p>
                <p className="mt-1 text-lg font-bold">Scan Guest QR</p>
              </div>
              <Link href="/scanner">
                <Button size="sm" variant="outline" className="mt-4 gap-2">
                  Open Scanner
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Today's Reservations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2547]">
                <CalendarCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#f5f0e8]">Today&apos;s Reservations</h2>
                <p className="text-sm text-[#7a8fa6]">
                  {todayReservations?.data?.length || 0} bookings scheduled
                </p>
              </div>
            </div>
            <Link href="/reservations">
              <Button variant="ghost" size="sm" className="group text-[#c9a84c] hover:text-[#f5f0e8]">
                View All
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          
          <div className="p-6">
            {reservationsLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : todayReservations?.data?.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.05)] mb-4">
                  <CalendarCheck className="h-8 w-8 text-[#7a8fa6]" />
                </div>
                <p className="text-[#7a8fa6] font-medium">No reservations for today</p>
                <p className="text-sm text-[#7a8fa6] text-[rgba(122,143,166,0.7)] mt-1">New bookings will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayReservations?.data?.slice(0, 5).map((reservation: any, index: number) => {
                  const status = statusConfig[reservation.status as keyof typeof statusConfig] || statusConfig.CONFIRMED;
                  const StatusIcon = status.icon;
                  return (
                    <motion.div
                      key={reservation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(201,168,76,0.1)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(201,168,76,0.25)] transition-colors group"
                    >
                      {/* Diner avatar (image if available, else initials) */}
                      {(() => {
                        const name = reservation.user?.name || reservation.user?.fullName || 'Guest';
                        const avatar = reservation.user?.avatar;
                        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                        return avatar ? (
                          <img
                            src={avatar.startsWith('http') ? avatar : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${avatar}`}
                            alt={name}
                            className="h-12 w-12 flex-shrink-0 rounded-full object-cover border border-[rgba(201,168,76,0.3)]"
                          />
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#0f2547] border border-[rgba(201,168,76,0.3)] text-sm font-bold text-[#c9a84c]">
                            {initials}
                          </div>
                        );
                      })()}

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#f5f0e8] truncate">
                          {reservation.user?.name || reservation.user?.fullName || 'Guest'}
                        </p>
                        <p className="text-sm text-[#7a8fa6] truncate">
                          {formatTime(reservation.time || reservation.reservationTime)} · {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'} · {reservation.reference}
                        </p>
                      </div>
                      
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      
                      {reservation.status === 'CONFIRMED' || reservation.status === 'confirmed' ? (
                        <Link href={`/scanner?ref=${reservation.reference}`}>
                          <Button size="sm" className="btn-gradient opacity-0 group-hover:opacity-100 transition-opacity">
                            Check-in
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/reservations/${reservation.id}`}>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Details
                          </Button>
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
