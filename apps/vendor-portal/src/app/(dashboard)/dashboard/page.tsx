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
  Bell,
} from 'lucide-react';
import Link from 'next/link';

const statusConfig = {
  CONFIRMED: { label: 'Confirmed', variant: 'default' as const, icon: Clock, color: 'text-primary-500', bg: 'bg-primary-500/10' },
  CHECKED_IN: { label: 'Checked In', variant: 'success' as const, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CANCELLED: { label: 'Cancelled', variant: 'error' as const, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  NO_SHOW: { label: 'No Show', variant: 'warning' as const, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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

  const stats = [
    {
      title: "Today's Bookings",
      value: todayReservations?.data?.length || 0,
      change: '+12%',
      icon: CalendarCheck,
      gradient: 'from-primary-500 to-tertiary-500',
      lightBg: 'bg-primary-500/10 dark:bg-primary-500/20',
    },
    {
      title: 'Weekly Guests',
      value: analytics?.data?.weeklyReservations || 0,
      change: '+8%',
      icon: Users,
      gradient: 'from-emerald-500 to-teal-500',
      lightBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(analytics?.data?.monthlyRevenue || 0),
      change: '+23%',
      icon: DollarSign,
      gradient: 'from-secondary-400 to-secondary-600',
      lightBg: 'bg-secondary-500/10 dark:bg-secondary-500/20',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-slate-900 dark:text-white"
            >
              {greeting()}, <span className="gradient-text">{vendor?.businessName || 'there'}</span>!
            </motion.h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                3
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="stat-card glass-card rounded-2xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </motion.div>
          ))}

          {/* QR Scanner CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-tertiary-600 p-6 text-white"
          >
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <QrCode className="h-6 w-6" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-white/80">Quick Check-in</p>
                <p className="mt-1 text-lg font-bold">Scan Guest QR</p>
              </div>
              <Link href="/scanner">
                <Button 
                  size="sm" 
                  className="mt-4 bg-white text-primary-600 hover:bg-white/90 shadow-lg group"
                >
                  Open Scanner
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-tertiary-500">
                <CalendarCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Today&apos;s Reservations</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {todayReservations?.data?.length || 0} bookings scheduled
                </p>
              </div>
            </div>
            <Link href="/reservations">
              <Button variant="ghost" size="sm" className="group text-primary-600 dark:text-primary-400 hover:text-primary-700">
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                  <CalendarCheck className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No reservations for today</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">New bookings will appear here</p>
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
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 font-mono text-sm font-bold text-slate-600 dark:text-slate-300">
                        {formatTime(reservation.time || reservation.reservationTime)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {reservation.user?.name || reservation.user?.fullName || 'Guest'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {reservation.partySize} guests • {reservation.reference}
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
