'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, Clock, BellRing, Check, X, Loader2, ListOrdered } from 'lucide-react';
import { authApi } from '@/lib/api';

function fmtTime(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function WaitlistPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-waitlist', date],
    queryFn: () => authApi.getWaitlist(date),
    refetchInterval: 20_000,
  });
  const entries: any[] = data?.data?.entries ?? [];

  const mkOpts = (ok: string) => ({
    onSuccess: () => { toast.success(ok); qc.invalidateQueries({ queryKey: ['vendor-waitlist'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Action failed'),
  });
  const notify = useMutation({ mutationFn: (id: string) => authApi.notifyWaitlist(id), ...mkOpts('Guest notified — table held for them') });
  const seat = useMutation({ mutationFn: (id: string) => authApi.seatWaitlist(id), ...mkOpts('Guest seated') });
  const remove = useMutation({ mutationFn: (id: string) => authApi.removeWaitlist(id), ...mkOpts('Removed from waitlist') });
  const pending = notify.isPending || seat.isPending || remove.isPending;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#f5f0e8] flex items-center gap-2">
            <ListOrdered className="h-7 w-7 text-[#c9a84c]" /> Waitlist
          </h1>
          <p className="mt-1 text-[14px] text-[#7a8fa6]">Notify the next party when a table frees up, then seat them. Holds last 15 minutes.</p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-lg border border-[rgba(201,168,76,0.25)] bg-[rgba(255,255,255,0.04)] px-3 text-[14px] text-[#f5f0e8] focus:outline-none focus:border-[#c9a84c]" />
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7a8fa6]" /></div>
      ) : entries.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-10 text-center">
          <Users className="h-9 w-9 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-[#f5f0e8]">No one on the waitlist</p>
          <p className="text-[13px] text-[#7a8fa6]">Parties who join the waitlist for this date show up here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {entries.map((e) => {
            const notified = e.status === 'notified';
            return (
              <div key={e.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${notified ? 'border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.06)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.15)] text-[13px] font-bold text-[#c9a84c]">
                    {e.position ? `#${e.position}` : <BellRing className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#f5f0e8] truncate">{e.user?.name || 'Guest'} <span className="text-[12px] font-normal text-[#7a8fa6]">· party of {e.partySize}</span></p>
                    <p className="text-[12px] text-[#7a8fa6] flex items-center gap-2">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> wants {e.desiredTime}</span>
                      {notified && e.claimExpiresAt && <span className="text-[#c9a84c]">· held until {fmtTime(e.claimExpiresAt)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notified && (
                    <button onClick={() => notify.mutate(e.id)} disabled={pending}
                      className="rounded-lg border border-[#c9a84c] px-3 h-9 text-[13px] font-semibold text-[#c9a84c] hover:bg-[rgba(201,168,76,0.1)] disabled:opacity-50 flex items-center gap-1.5">
                      <BellRing className="h-3.5 w-3.5" /> Notify
                    </button>
                  )}
                  <button onClick={() => seat.mutate(e.id)} disabled={pending}
                    className="rounded-lg bg-[#c9a84c] px-3 h-9 text-[13px] font-semibold text-[#0f2547] hover:bg-[#d4b85f] disabled:opacity-50 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Seat
                  </button>
                  <button onClick={() => remove.mutate(e.id)} disabled={pending} aria-label="Remove"
                    className="rounded-lg border border-[rgba(255,255,255,0.12)] h-9 w-9 flex items-center justify-center text-[#7a8fa6] hover:text-[#f87171] disabled:opacity-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
