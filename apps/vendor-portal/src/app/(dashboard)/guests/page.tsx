'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guestsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Star,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
  Crown,
  TrendingUp,
  Heart,
  AlertCircle,
  X,
  Loader2,
  Edit2,
  Save,
} from 'lucide-react';

interface Guest {
  id: string;
  user?: { name?: string; fullName?: string; email?: string; phone?: string };
  totalVisits: number;
  lastVisit?: string;
  dietaryRestrictions?: string;
  notes?: string;
  preferences?: string;
}

export default function GuestsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [preferencesValue, setPreferencesValue] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['guests', page, search],
    queryFn: () => guestsApi.getAll({ page, search }),
  });

  const guests: Guest[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  // Update guest notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: ({ guestId, notes, preferences }: { guestId: string; notes: string; preferences: string }) =>
      guestsApi.updateNotes(guestId, { notes, preferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      toast.success('Guest notes updated');
      setSelectedGuest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update notes');
    },
  });

  const openGuestDetails = useCallback((guest: Guest) => {
    setSelectedGuest(guest);
    setNotesValue(guest.notes || '');
    setPreferencesValue(guest.preferences || '');
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (!selectedGuest) return;
    updateNotesMutation.mutate({
      guestId: selectedGuest.id,
      notes: notesValue,
      preferences: preferencesValue,
    });
  }, [selectedGuest, notesValue, preferencesValue, updateNotesMutation]);

  // Stats from pagination data
  const stats = [
    { label: 'Total Guests', value: pagination?.total || 0, icon: Users, color: 'from-tertiary-500 to-tertiary-600' },
    { label: 'VIP Guests', value: guests.filter((g: Guest) => g.totalVisits >= 5).length, icon: Crown, color: 'from-amber-500 to-orange-500' },
    { label: 'Returning', value: guests.filter((g: Guest) => g.totalVisits > 1).length, icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
    { label: 'With Preferences', value: guests.filter((g: Guest) => g.dietaryRestrictions || g.preferences).length, icon: Heart, color: 'from-pink-500 to-rose-500' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Guest Profiles</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your guest CRM & preferences</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search guests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-10 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border-0"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-2xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guests List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl"
        >
          <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All Guests</h2>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : guests.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No guests found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Guests will appear after their first reservation</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {guests.map((guest: any, index: number) => (
                <motion.div
                  key={guest.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => openGuestDetails(guest)}
                  className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300">
                      {(guest.user?.name || guest.user?.fullName || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {guest.user?.name || guest.user?.fullName || 'Guest'}
                        </p>
                        {guest.totalVisits >= 5 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                            <Crown className="h-3 w-3" />
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {guest.user?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {guest.user.email}
                          </span>
                        )}
                        {guest.user?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {guest.user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {guest.totalVisits || 0} visits
                      </div>
                      {guest.lastVisit && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Last: {formatDate(guest.lastVisit)}
                        </p>
                      )}
                    </div>

                    {guest.dietaryRestrictions && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Dietary
                      </div>
                    )}

                    <ChevronRight className="h-5 w-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/50 dark:border-slate-800/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Guest Details Modal */}
      <AnimatePresence>
        {selectedGuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedGuest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-xl font-bold text-white">
                    {(selectedGuest.user?.name || selectedGuest.user?.fullName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedGuest.user?.name || selectedGuest.user?.fullName || 'Guest'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedGuest.totalVisits} visits
                      </span>
                      {selectedGuest.totalVisits >= 5 && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Crown className="h-4 w-4" />
                          VIP
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedGuest(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                {selectedGuest.user?.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{selectedGuest.user.email}</span>
                  </div>
                )}
                {selectedGuest.user?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{selectedGuest.user.phone}</span>
                  </div>
                )}
                {selectedGuest.dietaryRestrictions && (
                  <div className="flex items-center gap-3 text-sm">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-rose-600 dark:text-rose-400">{selectedGuest.dietaryRestrictions}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Preferences</label>
                  <textarea
                    value={preferencesValue}
                    onChange={(e) => setPreferencesValue(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    rows={2}
                    placeholder="Seating preferences, favorite dishes, etc..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Internal Notes</label>
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    rows={3}
                    placeholder="Add notes about this guest..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedGuest(null)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  className="btn-gradient flex-1" 
                  onClick={handleSaveNotes}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Notes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
