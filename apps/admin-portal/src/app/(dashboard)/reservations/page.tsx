'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reservationsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar, Search, Filter, ChevronLeft, ChevronRight,
  Eye, XCircle, CheckCircle, Clock, Users, MapPin,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  checked_in: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reservations', page, search, status],
    queryFn: () => reservationsApi.getAll({ page, search, status }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
      setSelectedReservation(null);
    },
    onError: () => toast.error('Failed to cancel reservation'),
  });

  const reservations = data?.data?.reservations || [];
  const pagination = data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reservations</h1>
          <p className="text-slate-500 mt-1">Manage all system reservations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="w-4 h-4" />
          <span>{pagination.total} total reservations</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by user, vendor, or confirmation code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No reservations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Reservation</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Guests</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Credits</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reservations.map((reservation: any) => (
                  <tr key={reservation.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                          {reservation.confirmationCode}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(reservation.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {reservation.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">{reservation.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {reservation.branch?.vendor?.businessName || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {reservation.branch?.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-900 dark:text-white">
                            {formatDate(reservation.reservationDate)}
                          </p>
                          <p className="text-xs text-slate-500">{reservation.reservationTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900 dark:text-white">{reservation.partySize}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {reservation.creditsHeld} credits
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        statusColors[reservation.status] || statusColors.pending
                      )}>
                        {reservation.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {['pending', 'confirmed'].includes(reservation.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => cancelMutation.mutate(reservation.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Reservation Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Confirmation Code</span>
                <span className="font-mono font-medium">{selectedReservation.confirmationCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">User</span>
                <span>{selectedReservation.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor</span>
                <span>{selectedReservation.branch?.vendor?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch</span>
                <span>{selectedReservation.branch?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span>{formatDate(selectedReservation.reservationDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span>{selectedReservation.reservationTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Party Size</span>
                <span>{selectedReservation.partySize} guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credits Held</span>
                <span>{selectedReservation.creditsHeld}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  statusColors[selectedReservation.status]
                )}>
                  {selectedReservation.status?.replace('_', ' ')}
                </span>
              </div>
              {selectedReservation.specialRequests && (
                <div>
                  <span className="text-slate-500 block mb-1">Special Requests</span>
                  <p className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                    {selectedReservation.specialRequests}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedReservation(null)}>
                Close
              </Button>
              {['pending', 'confirmed'].includes(selectedReservation.status) && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => cancelMutation.mutate(selectedReservation.id)}
                >
                  Cancel Reservation
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
