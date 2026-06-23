'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Users, QrCode } from 'lucide-react';
import { reservationsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-[rgba(201,168,76,0.15)] text-[#0f2547]' },
  checked_in: { label: 'Checked in', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
  no_show: { label: 'No-show', cls: 'bg-red-100 text-red-600' },
};

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();

  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/bookings'); }, [ready, isAuthenticated, router]);

  const { data, isLoading } = useQuery({ queryKey: ['reservations'], queryFn: () => reservationsApi.getMine(), enabled: isAuthenticated });
  const reservations: any[] = (data?.data as any)?.items ?? data?.data ?? [];

  if (!ready || !isAuthenticated) return <div className="max-w-3xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-[#0f2547]">Your reservations</h1>

      {isLoading ? (
        <div className="mt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-28 animate-pulse bg-[#eef1f5]" />)}</div>
      ) : reservations.length ? (
        <div className="mt-6 space-y-3">
          {reservations.map((r) => {
            const s = STATUS[r.status] || { label: r.status, cls: 'bg-[rgba(15,37,71,0.08)] text-[#7a8fa6]' };
            return (
              <Link key={r.id} href={`/bookings/${r.id}`} className="card p-5 block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#0f2547]">{r.vendor?.businessName || 'Restaurant'}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#7a8fa6]">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(r.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.time}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.partySize}</span>
                    </div>
                    <p className="mt-2 text-[12px] text-[#7a8fa6]">Ref: <span className="font-mono font-medium text-[#0f2547]">{r.reference}</span></p>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold', s.cls)}>{s.label}</span>
                </div>
                {r.status === 'confirmed' && r.pin && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-[rgba(201,168,76,0.08)] px-3 py-2 text-[13px]">
                    <QrCode className="h-4 w-4 text-[#c9a84c]" />
                    <span className="text-[#7a8fa6]">Check-in PIN:</span>
                    <span className="font-bold tracking-widest text-[#0f2547]">{r.pin}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-lg text-[#0f2547]">No reservations yet</p>
          <p className="text-sm text-[#7a8fa6] mt-1">Find a table and your bookings will appear here.</p>
          <Link href="/restaurants"><Button className="mt-5">Find a restaurant</Button></Link>
        </div>
      )}
    </div>
  );
}
