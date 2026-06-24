'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { creditsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, cn } from '@/lib/utils';

// Fallback labels keyed by the real CreditTransactionType enum
// (purchase | refund | bonus | forfeit | redeem | expire | adjustment).
// Prefer the backend's precise `description` over these generic labels.
const LABELS: Record<string, string> = {
  purchase: 'Credit purchase',
  redeem: 'Reservation deposit',
  refund: 'Refund',
  bonus: 'Bonus credits',
  forfeit: 'Forfeited credits',
  expire: 'Credits expired',
  adjustment: 'Adjustment',
};

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/wallet/history'); }, [ready, isAuthenticated, router]);

  const { data, isLoading } = useQuery({ queryKey: ['credit-tx'], queryFn: () => creditsApi.getTransactions({ limit: 50 }), enabled: isAuthenticated });
  const txns: any[] = (data?.data as any)?.transactions ?? [];

  if (!ready || !isAuthenticated) return <div className="max-w-2xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-muted hover:text-ink mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="font-display text-3xl font-semibold text-ink">Transaction history</h1>

      {isLoading ? (
        <div className="mt-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-surface2" />)}</div>
      ) : txns.length ? (
        <div className="card mt-6 divide-y divide-line">
          {txns.map((t) => {
            const credit = t.amount > 0;
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', credit ? 'bg-emerald-50' : 'bg-[var(--fill)]')}>
                  {credit ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink">{t.description?.trim() || LABELS[t.type] || 'Transaction'}</p>
                  <p className="text-[12px] text-muted">{(LABELS[t.type] || t.type)} · {formatDate(t.createdAt)}</p>
                </div>
                <span className={cn('text-[14px] font-semibold', credit ? 'text-emerald-600' : 'text-ink')}>{credit ? '+' : ''}{t.amount} cr</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-12 text-center text-muted">No transactions yet.</p>
      )}
    </div>
  );
}
