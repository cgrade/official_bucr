'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { reservationsApi } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, Clock, Users, MapPin, CreditCard,
  CheckCircle, XCircle, AlertCircle, QrCode, Phone, Mail,
  MessageSquare, Loader2,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  confirmed:   { label: 'Confirmed',   color: 'text-[#c9a84c]',   bg: 'bg-[rgba(201,168,76,0.1)]',   icon: Clock },
  pending:     { label: 'Pending',     color: 'text-[#c9a84c]',   bg: 'bg-[rgba(201,168,76,0.1)]',   icon: Clock },
  checked_in:  { label: 'Checked In', color: 'text-emerald-400', bg: 'bg-[rgba(52,211,153,0.1)]', icon: CheckCircle },
  completed:   { label: 'Completed',  color: 'text-emerald-400', bg: 'bg-[rgba(52,211,153,0.1)]', icon: CheckCircle },
  cancelled:   { label: 'Cancelled',  color: 'text-[#f87171]',   bg: 'bg-[rgba(248,113,113,0.1)]',  icon: XCircle },
  no_show:     { label: 'No-show',    color: 'text-[#f87171]',   bg: 'bg-[rgba(248,113,113,0.1)]',  icon: AlertCircle },
};

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(201,168,76,0.08)] last:border-0">
      <Icon className="h-4 w-4 text-[#c9a84c] mt-0.5 flex-shrink-0" />
      <span className="text-[12px] text-[#7a8fa6] w-28 flex-shrink-0">{label}</span>
      <span className="text-[14px] text-[#f5f0e8] font-medium">{value}</span>
    </div>
  );
}

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-reservation', id],
    queryFn: () => reservationsApi.getById(id),
    enabled: !!id,
  });

  const reservation = (data?.data as any) || (data as any);

  const cancelMutation = useMutation({
    mutationFn: () => reservationsApi.cancel(id, 'Cancelled by vendor'),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-reservation', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to cancel'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1d3a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-[#0a1d3a] flex flex-col items-center justify-center gap-4">
        <p className="text-[#7a8fa6]">Reservation not found</p>
        <Button variant="outline" onClick={() => router.push('/reservations')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reservations
        </Button>
      </div>
    );
  }

  const statusKey = (reservation.status || '').toLowerCase().replace('-', '_');
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.confirmed;
  const StatusIcon = status.icon;
  const deposit = reservation.creditsDeposited ?? 0;
  const isActive = ['confirmed', 'pending'].includes(statusKey);

  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/reservations')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">
            {reservation.user?.name || 'Guest'}
          </h1>
          <p className="text-[12px] text-[#7a8fa6] mt-0.5">Ref: {reservation.reference}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
          <StatusIcon className={`h-4 w-4 ${status.color}`} />
          <span className={`text-[12px] font-semibold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Reservation details */}
      <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f5f0e8] mb-4 text-[15px]">Reservation Details</h2>
        <Row icon={Calendar}   label="Date"         value={formatDate(reservation.date || reservation.reservationDate)} />
        <Row icon={Clock}      label="Time"         value={formatTime(reservation.time || reservation.reservationTime)} />
        <Row icon={Users}      label="Party size"   value={`${reservation.partySize} ${reservation.partySize === 1 ? 'guest' : 'guests'}`} />
        {reservation.branch && (
          <Row icon={MapPin}   label="Branch"       value={`${reservation.branch.address}, ${reservation.branch.city}`} />
        )}
        {reservation.specialRequests && (
          <Row icon={MessageSquare} label="Requests" value={reservation.specialRequests} />
        )}
      </div>

      {/* Guest details */}
      <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f5f0e8] mb-4 text-[15px]">Guest Details</h2>
        <Row icon={Users} label="Name"  value={reservation.user?.name || 'Guest'} />
        {reservation.user?.email && (
          <Row icon={Mail}  label="Email" value={reservation.user.email} />
        )}
        {reservation.user?.phone && (
          <Row icon={Phone} label="Phone" value={reservation.user.phone} />
        )}
      </div>

      {/* Deposit */}
      <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-5">
        <h2 className="font-semibold text-[#f5f0e8] mb-4 text-[15px]">Deposit</h2>
        <Row icon={CreditCard} label="Credits held"  value={`${deposit} credits`} />
        <Row icon={CreditCard} label="Value"         value={`₦${(deposit * 10).toLocaleString()}`} />
        {reservation.pin && (
          <Row icon={QrCode}   label="Check-in PIN"  value={<span className="font-mono tracking-widest text-[#c9a84c] text-[18px]">{reservation.pin}</span>} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isActive && (
          <>
            <Button
              className="gap-2"
              onClick={() => router.push(`/scanner?ref=${reservation.reference}`)}
            >
              <QrCode className="h-4 w-4" /> Check-in Guest
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-[#f87171] border-[rgba(248,113,113,0.3)] hover:bg-[rgba(248,113,113,0.08)]"
              onClick={() => {
                if (window.confirm('Cancel this reservation? The guest will receive a refund per cancellation policy.')) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
