'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { analyticsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarCheck,
  DollarSign,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
} from 'lucide-react';

const timeRanges = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '1y', label: 'Last year' },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const analyticsData = data?.data || {};
  
  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(analyticsData.monthlyRevenue || 0),
      change: analyticsData.revenueChange || '0%',
      trend: (analyticsData.revenueChange || '').startsWith('-') ? 'down' : 'up',
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Total Reservations',
      value: analyticsData.totalReservations || 0,
      change: analyticsData.reservationsChange || '0%',
      trend: (analyticsData.reservationsChange || '').startsWith('-') ? 'down' : 'up',
      icon: CalendarCheck,
      gradient: 'from-primary-500 to-tertiary-500',
    },
    {
      title: 'Total Guests',
      value: analyticsData.totalGuests || 0,
      change: analyticsData.guestsChange || '0%',
      trend: (analyticsData.guestsChange || '').startsWith('-') ? 'down' : 'up',
      icon: Users,
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      title: 'Avg. Rating',
      value: analyticsData.avgRating || 0,
      change: analyticsData.ratingChange || '0',
      trend: (analyticsData.ratingChange || '').startsWith('-') ? 'down' : 'up',
      icon: Star,
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  const metrics = analyticsData.metrics || [
    { label: 'Check-in Rate', value: '0%', change: '0%', trend: 'up' },
    { label: 'No-show Rate', value: '0%', change: '0%', trend: 'up' },
    { label: 'Avg. Party Size', value: '0', change: '0', trend: 'up' },
    { label: 'Repeat Guests', value: '0%', change: '0%', trend: 'up' },
  ];

  const topItems = analyticsData.topItems || [];

  const peakHours = analyticsData.peakHours || [];

  const maxBookings = peakHours.length > 0 ? Math.max(...peakHours.map((h: any) => h.bookings)) : 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-tertiary-500 to-blue-500 shadow-lg shadow-tertiary-500/30">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track your restaurant performance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {timeRanges.find(t => t.id === timeRange)?.label}
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button className="btn-gradient">Export Report</Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  stat.trend === 'up' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              {metrics.map((metric: any) => (
                <div key={metric.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{metric.value}</span>
                    <span className={`text-xs font-medium ${
                      metric.trend === 'up' && metric.label !== 'No-show Rate'
                        ? 'text-emerald-500' 
                        : metric.trend === 'down' && metric.label === 'No-show Rate'
                          ? 'text-emerald-500'
                          : 'text-red-500'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Peak Hours Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Peak Hours</h3>
            {peakHours.length > 0 ? (
              <>
                <div className="flex items-end justify-between gap-2 h-40">
                  {peakHours.map((hour: any) => (
                    <div key={hour.hour} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-primary-500 to-tertiary-500 rounded-t-lg transition-all duration-500"
                        style={{ height: `${maxBookings > 0 ? (hour.bookings / maxBookings) * 100 : 0}%` }}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{hour.hour.split(':')[0]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  Peak: {maxBookings} bookings
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400">
                No peak hours data available
              </div>
            )}
          </motion.div>

          {/* Top Menu Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Menu Items</h3>
            {topItems.length > 0 ? (
              <div className="space-y-3">
                {topItems.map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                      index === 0 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.orders} orders</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400">
                No menu items data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Revenue Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Revenue Overview</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary-500 to-tertiary-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Bookings</span>
              </div>
            </div>
          </div>
          
          {/* Placeholder for chart */}
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Revenue chart visualization</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Integration with chart library coming soon</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
