'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { dashboardApi, vendorsApi, analyticsApi } from '@/lib/api';
import { formatCurrency, formatNumber, formatRelative, cn } from '@/lib/utils';
import {
  Users, Store, CreditCard, Calendar, TrendingUp, TrendingDown,
  Activity, DollarSign, UserCheck, AlertTriangle, ArrowRight,
  Clock, CheckCircle, XCircle, Eye, Zap, BarChart3, PieChart,
  MapPin, Star, ShoppingBag, Wallet, Bell, ChevronRight
} from 'lucide-react';

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'vendor_registration' | 'reservation' | 'payment';
  description: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'failed';
}

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => dashboardApi.getStats(),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['recent-vendors'],
    queryFn: () => vendorsApi.getAll({ limit: 5 }),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.getOverview(),
  });

  const { data: activityData } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => dashboardApi.getRecentActivity(),
  });

  const stats = statsData?.data || {
    totalUsers: 0,
    activeUsers: 0,
    totalVendors: 0,
    verifiedVendors: 0,
    totalCredits: 0,
    creditsPurchased: 0,
    todayReservations: 0,
    pendingVerifications: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
  };

  const recentActivities: RecentActivity[] = activityData?.data?.activities || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vendor_registration': return Store;
      case 'user_signup': return Users;
      case 'reservation': return Calendar;
      case 'payment': return Wallet;
      default: return Activity;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const mainStats = [
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: `+${stats.monthlyGrowth}% this month`,
      trend: 'up',
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      name: 'Active Users',
      value: formatNumber(stats.totalUsers),
      change: `${stats.activeUsers} active today`,
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      name: 'Vendors',
      value: formatNumber(stats.totalVendors),
      change: `${stats.verifiedVendors} verified`,
      trend: 'up',
      icon: Store,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      name: 'Credits Sold',
      value: formatNumber(stats.totalCredits),
      change: formatCurrency(stats.creditsPurchased),
      trend: 'up',
      icon: CreditCard,
      color: 'from-primary-500 to-tertiary-500',
      bgColor: 'bg-primary-50 dark:bg-primary-500/10',
      textColor: 'text-primary-600 dark:text-primary-400'
    },
  ];

  const quickStats = [
    { label: "Today's Bookings", value: stats.todayReservations, icon: Calendar },
    { label: 'Pending Reviews', value: stats.pendingVerifications, icon: Clock },
    { label: 'Total Orders', value: stats.totalOrders || 0, icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back! Here&apos;s what&apos;s happening with Bucr today.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {stats.pendingVerifications > 0 && (
            <div className="glass-card rounded-2xl p-4 border-l-4 border-amber-500">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {stats.pendingVerifications} vendor(s) need verification
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Review and approve vendor documents to complete onboarding</p>
                    </div>
                    <Link href="/vendors" className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium">
                      Review Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {mainStats.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div key={stat.name} className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shadow-sm', stat.bgColor)}>
                          <IconComponent className={cn('h-6 w-6', stat.textColor)} />
                        </div>
                        <div className="flex items-center gap-2">
                          {stat.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.name}</p>
                      <p className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {statsLoading ? (
                          <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded block"></span>
                        ) : stat.value}
                      </p>
                      <p className={cn('text-xs font-medium', stat.textColor)}>{stat.change}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats Bar */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Overview</h3>
              <Link href="/analytics" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View Details <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickStats.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
                </div>
                <Link href="/activity" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</Link>
              </div>
              
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.timestamp}</p>
                      </div>
                      {activity.status && (
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(activity.status))}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h3>
              </div>
              
              <div className="space-y-3">
                <Link href="/vendors" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Manage Vendors</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
                
                <Link href="/users" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">User Management</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
                
                <Link href="/credits" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Credit System</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
                
                <Link href="/analytics" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">View Analytics</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
                
                <Link href="/settings" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">System Settings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
