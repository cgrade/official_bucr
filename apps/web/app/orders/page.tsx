'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { formatNaira, formatDate, cn } from '@/lib/utils';

const STATUS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-[rgba(201,168,76,0.15)] text-[#0f2547]',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/orders'); }, [ready, isAuthenticated, router]);

  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => ordersApi.getAll(), enabled: isAuthenticated });
  const orders: any[] = (data?.data as any)?.items ?? data?.data ?? [];

  if (!ready || !isAuthenticated) return <div className="max-w-3xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-[#0f2547]">Your orders</h1>
      {isLoading ? (
        <div className="mt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-[#eef1f5]" />)}</div>
      ) : orders.length ? (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(201,168,76,0.12)]"><ShoppingBag className="h-5 w-5 text-[#c9a84c]" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#0f2547] truncate">{o.vendor?.businessName || 'Restaurant'}</h3>
                <p className="text-[13px] text-[#7a8fa6]">{o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} · {formatDate(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#0f2547]">{formatNaira(Number(o.total || o.totalAmount || 0))}</p>
                <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS[o.status] || 'bg-[rgba(15,37,71,0.08)] text-[#7a8fa6]')}>{o.status}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#7a8fa6]" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-[#c9a84c]" />
          <p className="text-lg text-[#0f2547] mt-3">No orders yet</p>
          <Link href="/restaurants"><Button className="mt-5">Browse restaurants</Button></Link>
        </div>
      )}
    </div>
  );
}
