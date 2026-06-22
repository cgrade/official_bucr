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
          <h1 className="text-2xl font-bold text-[#f5f0e8]">Reservations</h1>
          <p className="text-[#7a8fa6] mt-1">Manage all system reservations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#7a8fa6]">
          <Calendar className="w-4 h-4" />
          <span>{pagination.total} total reservations</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(122,143,166,0.6)]" />
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
            className="px-4 py-2 rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] text-sm"
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
          <div className="p-8 text-center text-[#7a8fa6]">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-[#7a8fa6]">No reservations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[rgba(255,255,255,0.04)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Reservation</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Guests</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Credits</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7a8fa6] uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-[#7a8fa6] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(201,168,76,0.08)]">
                {reservations.map((reservation: any) => (
                  <tr key={reservation.id} className="hover:bg-[rgba(255,255,255,0.04)]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono text-sm font-medium text-[#f5f0e8]">
                          {reservation.confirmationCode}
                        </p>
                        <p className="text-xs text-[#7a8fa6]">
                          {formatDate(reservation.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#f5f0e8]">
                          {reservation.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-[#7a8fa6]">{reservation.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#f5f0e8]">
                          {reservation.branch?.vendor?.businessName || 'Unknown'}
                        </p>
                        <p className="text-xs text-[#7a8fa6] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {reservation.branch?.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[rgba(122,143,166,0.6)]" />
                        <div>
                          <p className="text-sm text-[#f5f0e8]">
                            {formatDate(reservation.reservationDate)}
                          </p>
                          <p className="text-xs text-[#7a8fa6]">{reservation.reservationTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-[rgba(122,143,166,0.6)]" />
                        <span className="text-sm text-[#f5f0e8]">{reservation.partySize}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-[#f5f0e8]">
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(201,168,76,0.1)]">
            <p className="text-sm text-[#7a8fa6]">
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
          <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Reservation Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Confirmation Code</span>
                <span className="font-mono font-medium">{selectedReservation.confirmationCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">User</span>
                <span>{selectedReservation.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Vendor</span>
                <span>{selectedReservation.branch?.vendor?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Branch</span>
                <span>{selectedReservation.branch?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Date</span>
                <span>{formatDate(selectedReservation.reservationDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Time</span>
                <span>{selectedReservation.reservationTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Party Size</span>
                <span>{selectedReservation.partySize} guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Credits Held</span>
                <span>{selectedReservation.creditsHeld}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7a8fa6]">Status</span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  statusColors[selectedReservation.status]
                )}>
                  {selectedReservation.status?.replace('_', ' ')}
                </span>
              </div>
              {selectedReservation.specialRequests && (
                <div>
                  <span className="text-[#7a8fa6] block mb-1">Special Requests</span>
                  <p className="bg-[rgba(255,255,255,0.02)] p-2 rounded-lg">
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
