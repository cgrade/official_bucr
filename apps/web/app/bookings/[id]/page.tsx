'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, Users, MapPin, Star, X } from 'lucide-react';
import { reservationsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { formatDate, formatNaira, creditsToNaira, cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-[rgba(201,168,76,0.15)] text-[#0f2547]' },
  checked_in: { label: 'Checked in', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
  no_show: { label: 'No-show', cls: 'bg-red-100 text-red-600' },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['reservation', id], queryFn: () => reservationsApi.getById(id), enabled: !!id });
  const r = data?.data;

  const cancel = useMutation({
    mutationFn: () => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reservation cancelled — any refund has been credited per policy.');
      qc.invalidateQueries({ queryKey: ['reservation', id] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
      setConfirming(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not cancel'),
  });

  if (isLoading) return <div className="max-w-2xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;
  if (!r) return (
    <div className="max-w-2xl mx-auto px-5 py-20 text-center">
      <p className="text-lg text-[#0f2547]">Reservation not found</p>
      <Link href="/bookings"><Button variant="outline" className="mt-4">Back to bookings</Button></Link>
    </div>
  );

  const s = STATUS[r.status] || { label: r.status, cls: 'bg-[rgba(15,37,71,0.08)] text-[#7a8fa6]' };
  const qrValue = r.qrCode || r.reference || r.id;
  const canCancel = r.status === 'confirmed';

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-[#7a8fa6] hover:text-[#0f2547] mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-[#0f2547]">{r.vendor?.businessName || 'Restaurant'}</h1>
          <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold', s.cls)}>{s.label}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-[rgba(15,37,71,0.03)] p-3"><Calendar className="h-4 w-4 mx-auto text-[#c9a84c]" /><p className="mt-1 text-[12px] text-[#7a8fa6]">Date</p><p className="text-[13px] font-semibold text-[#0f2547]">{formatDate(r.date)}</p></div>
          <div className="rounded-xl bg-[rgba(15,37,71,0.03)] p-3"><Clock className="h-4 w-4 mx-auto text-[#c9a84c]" /><p className="mt-1 text-[12px] text-[#7a8fa6]">Time</p><p className="text-[13px] font-semibold text-[#0f2547]">{r.time}</p></div>
          <div className="rounded-xl bg-[rgba(15,37,71,0.03)] p-3"><Users className="h-4 w-4 mx-auto text-[#c9a84c]" /><p className="mt-1 text-[12px] text-[#7a8fa6]">Party</p><p className="text-[13px] font-semibold text-[#0f2547]">{r.partySize}</p></div>
        </div>

        {r.vendor?.mainBranch?.address && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-[#7a8fa6]"><MapPin className="h-4 w-4 text-[#c9a84c]" /> {r.vendor.mainBranch.address}</p>
        )}
      </div>

      {/* Check-in pass */}
      {r.status === 'confirmed' && (
        <div className="card p-6 mt-5 text-center">
          <h2 className="font-display text-xl font-semibold text-[#0f2547]">Your check-in pass</h2>
          <p className="text-[13px] text-[#7a8fa6] mt-1">Show this at the venue to check in.</p>
          <div className="mt-5 inline-block rounded-2xl bg-white p-4 border border-[rgba(15,37,71,0.1)]">
            <QRCode value={String(qrValue)} size={180} fgColor="#0f2547" />
          </div>
          {r.pin && (
            <div className="mt-5">
              <p className="text-[12px] text-[#7a8fa6]">Or give your PIN</p>
              <p className="text-3xl font-bold tracking-[0.3em] text-[#0f2547]">{r.pin}</p>
            </div>
          )}
          <p className="mt-4 text-[12px] text-[#7a8fa6]">Ref: <span className="font-mono font-medium text-[#0f2547]">{r.reference}</span></p>
        </div>
      )}

      {/* Deposit */}
      {typeof r.creditsDeposited === 'number' && (
        <div className="card p-5 mt-5">
          <h3 className="font-semibold text-[#0f2547] mb-2">Deposit</h3>
          <div className="flex items-center justify-between text-[14px]"><span className="text-[#7a8fa6]">Held</span><span className="font-semibold text-[#0f2547]">{formatNaira(creditsToNaira(r.creditsDeposited))}</span></div>
          {r.status === 'completed' && typeof r.creditsRefunded === 'number' && (
            <div className="flex items-center justify-between text-[14px] mt-1"><span className="text-[#7a8fa6]">Returned (+ bonus)</span><span className="font-semibold text-emerald-600">{formatNaira(creditsToNaira(r.creditsRefunded + (r.bonusCredits || 0)))}</span></div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 space-y-2">
        {r.status === 'completed' && !r.hasReview && (
          <Link href={`/account/reviews?reservation=${r.id}`}>
            <Button variant="outline" className="w-full"><Star className="h-4 w-4 text-[#c9a84c]" /> Leave a review</Button>
          </Link>
        )}
        {canCancel && !confirming && (
          <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)}><X className="h-4 w-4" /> Cancel reservation</Button>
        )}
        {canCancel && confirming && (
          <div className="card p-4 border-red-200">
            <p className="text-[13px] text-[#0f2547]">Cancel this reservation? Refund follows the policy: 24h+ 100% · 12–24h 50% · under 12h 0%.</p>
            <div className="flex gap-2 mt-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>Keep it</Button>
              <Button variant="navy" className="flex-1 bg-red-600 hover:bg-red-700 text-white" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel reservation</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
