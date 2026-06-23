'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { formatNaira, formatDate, cn } from '@/lib/utils';

const STATUS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-[rgba(201,168,76,0.15)] text-[#0f2547]',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.getById(id), enabled: !!id });
  const o = data?.data;

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => { toast.success('Order cancelled'); qc.invalidateQueries({ queryKey: ['order', id] }); qc.invalidateQueries({ queryKey: ['orders'] }); setConfirming(false); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not cancel'),
  });

  if (isLoading) return <div className="max-w-2xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;
  if (!o) return (
    <div className="max-w-2xl mx-auto px-5 py-20 text-center">
      <p className="text-lg text-[#0f2547]">Order not found</p>
      <Link href="/orders"><Button variant="outline" className="mt-4">Back to orders</Button></Link>
    </div>
  );

  const items: any[] = o.items || [];
  const canCancel = ['pending', 'confirmed'].includes(o.status);

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-[#7a8fa6] hover:text-[#0f2547] mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#0f2547]">{o.vendor?.businessName || 'Restaurant'}</h1>
            <p className="text-[13px] text-[#7a8fa6] mt-1 capitalize">{o.orderType} · {formatDate(o.createdAt)}</p>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize', STATUS[o.status] || 'bg-[rgba(15,37,71,0.08)] text-[#7a8fa6]')}>{o.status}</span>
        </div>
        {o.orderType === 'delivery' && o.deliveryAddress && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-[#7a8fa6]"><MapPin className="h-4 w-4 text-[#c9a84c]" /> {o.deliveryAddress}</p>
        )}
        {o.scheduledTime && <p className="mt-1 flex items-center gap-2 text-[13px] text-[#7a8fa6]"><Clock className="h-4 w-4 text-[#c9a84c]" /> {formatDate(o.scheduledTime)}</p>}
      </div>

      <div className="card p-6 mt-5">
        <h2 className="font-semibold text-[#0f2547] mb-3">Items</h2>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-[14px]">
              <span className="text-[#3a4a5f]">{it.quantity}× {it.name}</span>
              <span className="font-medium text-[#0f2547]">{formatNaira(Number(it.price) * it.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[rgba(15,37,71,0.08)] mt-4 pt-4 flex items-center justify-between">
          <span className="font-semibold text-[#0f2547]">Total</span>
          <span className="font-bold text-[#0f2547]">{formatNaira(Number(o.total || o.totalAmount || 0))}</span>
        </div>
        <p className="mt-2 text-[12px] text-[#7a8fa6]">Pay the restaurant directly at pickup/delivery. Bucr doesn’t collect the bill.</p>
      </div>

      {canCancel && (
        <div className="mt-5">
          {!confirming ? (
            <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)}>Cancel order</Button>
          ) : (
            <div className="card p-4 border-red-200">
              <p className="text-[13px] text-[#0f2547]">Cancel this order?</p>
              <div className="flex gap-2 mt-3">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>Keep it</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel order</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
