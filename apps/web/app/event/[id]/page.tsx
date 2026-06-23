'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, ArrowLeft, Minus, Plus, Ticket } from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { getImageUrl, formatNaira, formatDate } from '@/lib/utils';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [qty, setQty] = useState(1);

  const { data, isLoading } = useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.getById(id), enabled: !!id });
  const event = data?.data;

  const buy = useMutation({
    mutationFn: () => eventsApi.purchaseTicket(id, qty),
    onSuccess: () => { toast.success('Tickets booked! See them under your account.'); router.push('/account'); },
    onError: (err: any) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not book tickets'),
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;
  if (!event) return (
    <div className="max-w-4xl mx-auto px-5 py-20 text-center">
      <p className="text-lg text-[#0f2547]">Event not found</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push('/events')}>Browse events</Button>
    </div>
  );

  const img = getImageUrl(event.coverImage || event.image);
  const price = Number(event.ticketPrice ?? event.price ?? 0);
  const onBuy = () => { if (!isAuthenticated) { router.push(`/login?redirect=/event/${id}`); return; } buy.mutate(); };

  return (
    <div>
      <div className="relative h-[40vh] min-h-[260px] bg-[#0f2547]">
        {img && <img src={img} alt={event.title} className="w-full h-full object-cover opacity-80" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2547] via-transparent to-transparent" />
        <button onClick={() => router.back()} className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0f2547]"><ArrowLeft className="h-5 w-5" /></button>
      </div>

      <div className="max-w-4xl mx-auto px-5 -mt-14 relative grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="card p-6">
          {event.category && <span className="inline-block rounded-full bg-[rgba(201,168,76,0.12)] px-3 py-1 text-[12px] font-semibold text-[#0f2547] mb-3">{event.category}</span>}
          <h1 className="font-display text-3xl font-semibold text-[#0f2547]">{event.title}</h1>
          <div className="mt-4 space-y-2 text-[14px] text-[#3a4a5f]">
            <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#c9a84c]" /> {formatDate(event.startDate || event.date)}{event.startTime ? ` · ${event.startTime}` : ''}</p>
            {(event.venue?.businessName || event.location) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#c9a84c]" /> {event.venue?.businessName || event.location}</p>}
          </div>
          {event.description && <p className="mt-5 text-[14px] text-[#3a4a5f] leading-relaxed whitespace-pre-line">{event.description}</p>}
        </div>

        <div className="lg:sticky lg:top-20 h-fit">
          <div className="card p-6">
            <p className="text-[13px] text-[#7a8fa6]">Price per ticket</p>
            <p className="text-2xl font-bold text-[#0f2547]">{price > 0 ? formatNaira(price) : 'Free'}</p>

            <div className="mt-5">
              <label className="block text-[12px] font-medium text-[#7a8fa6] mb-1">Quantity</label>
              <div className="flex items-center gap-4">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 rounded-lg border border-[rgba(15,37,71,0.18)] text-[#0f2547] flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                <span className="text-lg font-semibold text-[#0f2547] w-6 text-center">{qty}</span>
                <button onClick={() => setQty(Math.min(10, qty + 1))} className="h-10 w-10 rounded-lg border border-[rgba(15,37,71,0.18)] text-[#0f2547] flex items-center justify-center"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-[14px] border-t border-[rgba(15,37,71,0.08)] pt-4">
              <span className="text-[#7a8fa6]">Total</span>
              <span className="font-bold text-[#0f2547]">{formatNaira(price * qty)}</span>
            </div>

            <Button size="lg" className="w-full mt-4" loading={buy.isPending} onClick={onBuy}>
              <Ticket className="h-4 w-4" /> {isAuthenticated ? 'Get tickets' : 'Sign in to book'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
