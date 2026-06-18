'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reservationsApi } from '@/lib/api';
import { formatTime, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Eye,
  CalendarCheck,
  Users,
  Phone,
  Mail,
} from 'lucide-react';

const tabs = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

const statusConfig = {
  CONFIRMED: { label: 'Confirmed', color: 'text-primary-500', bg: 'bg-primary-500/10', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'text-primary-500', bg: 'bg-primary-500/10', icon: Clock },
  CHECKED_IN: { label: 'Checked In', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  checked_in: { label: 'Checked In', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertCircle },
  no_show: { label: 'No Show', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertCircle },
  COMPLETED: { label: 'Completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  completed: { label: 'Completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
  PENDING: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
};

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState('today');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const getDateFilter = () => {
    const today = new Date();
    if (activeTab === 'today') {
      return today.toISOString().split('T')[0];
    }
    return undefined;
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reservations', activeTab, page, search],
    queryFn: () =>
      reservationsApi.getAll({
        date: getDateFilter(),
        page,
        status: activeTab === 'past' ? 'COMPLETED,CANCELLED,NO_SHOW' : undefined,
      }),
  });

  const reservations = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-tertiary-500 shadow-lg shadow-primary-500/30">
              <CalendarCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reservations</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage all your restaurant bookings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-10 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border-0"
              />
            </div>
            <Button variant="outline" className="h-11 w-11 p-0 rounded-xl">
              <Filter className="h-4 w-4" />
            </Button>
            <Link href="/scanner">
              <Button className="btn-gradient gap-2">
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-tertiary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reservations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl"
        >
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <CalendarCheck className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No reservations found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Bookings will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {reservations.map((reservation: any, index: number) => {
                const status = statusConfig[reservation.status as keyof typeof statusConfig] || statusConfig.CONFIRMED;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={reservation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-6 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Time */}
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatTime(reservation.time || reservation.reservationTime)}
                      </span>
                    </div>

                    {/* Guest Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {reservation.user?.name || reservation.user?.fullName || 'Guest'}
                        </p>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {reservation.reference}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {reservation.user?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {reservation.user.phone}
                          </span>
                        )}
                        {reservation.user?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {reservation.user.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Party Size */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {reservation.partySize} guests
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatDate(reservation.date || reservation.reservationDate)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(reservation.status === 'CONFIRMED' || reservation.status === 'confirmed') && (
                        <Link href={`/scanner?ref=${reservation.reference}`}>
                          <Button size="sm" className="btn-gradient">
                            <QrCode className="mr-1 h-4 w-4" />
                            Check-in
                          </Button>
                        </Link>
                      )}
                      <Link href={`/reservations/${reservation.id}`}>
                        <Button size="sm" variant="outline" className="rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
