'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wallet as WalletIcon, Plus, Check, Gift, History } from 'lucide-react';
import { creditsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { formatNaira, cn } from '@/lib/utils';

const PURCHASE_PRICE = 10.6; // ₦10 + 6% spread
const PACKAGES = [50, 100, 200, 500];

export default function WalletPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();
  const [selected, setSelected] = useState(100);

  useEffect(() => {
    if (ready && !isAuthenticated) router.push('/login?redirect=/wallet');
  }, [ready, isAuthenticated, router]);

  const { data } = useQuery({ queryKey: ['credits'], queryFn: () => creditsApi.getBalance(), enabled: isAuthenticated });
  const balance = (data?.data as any)?.balance ?? 0;

  const buy = useMutation({
    mutationFn: (credits: number) =>
      creditsApi.initializePurchase(credits, typeof window !== 'undefined' ? `${window.location.origin}/wallet` : undefined),
    onSuccess: (res) => {
      const url = res?.authorizationUrl;
      if (url) window.location.href = url;
      else toast.error('Could not start payment');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not start payment'),
  });

  if (!ready || !isAuthenticated) return <div className="max-w-3xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-ink">Wallet</h1>

      <div className="card p-6 mt-6 bg-[#0f2547] text-[#f5f0e8]">
        <div className="flex items-center gap-2 text-[#c9a84c]"><WalletIcon className="h-5 w-5" /><span className="text-[13px] font-semibold">Bucr Credits</span></div>
        <p className="mt-3 text-4xl font-bold">{balance.toLocaleString()} <span className="text-lg font-normal text-[rgba(245,240,232,0.7)]">credits</span></p>
        <p className="text-[14px] text-[#c9a84c]">{formatNaira(balance * 10)} value</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Link href="/wallet/gift" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <Gift className="h-5 w-5 text-[#c9a84c]" />
          <span className="text-[14px] font-semibold text-ink">Gift credits</span>
        </Link>
        <Link href="/wallet/history" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <History className="h-5 w-5 text-[#c9a84c]" />
          <span className="text-[14px] font-semibold text-ink">History</span>
        </Link>
      </div>

      <h2 className="font-display text-2xl font-semibold text-ink mt-10 mb-1">Top up</h2>
      <p className="text-[13px] text-muted mb-4">1 credit = ₦10 value · ₦{PURCHASE_PRICE.toFixed(2)} to buy (6% spread). Valid for 90 days.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PACKAGES.map((credits) => (
          <button key={credits} onClick={() => setSelected(credits)}
            className={cn('card p-4 text-left relative transition-all', selected === credits ? 'ring-2 ring-[#c9a84c]' : '')}>
            {selected === credits && <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#c9a84c] flex items-center justify-center"><Check className="h-3 w-3 text-[#070f1e]" /></span>}
            <p className="text-2xl font-bold text-ink">{credits}</p>
            <p className="text-[12px] text-muted">credits</p>
            <p className="mt-2 text-[14px] font-semibold text-[#c9a84c]">{formatNaira(Math.ceil(credits * PURCHASE_PRICE))}</p>
            <p className="text-[11px] text-muted">{formatNaira(credits * 10)} value</p>
          </button>
        ))}
      </div>

      <Button size="lg" className="w-full mt-6" loading={buy.isPending} onClick={() => buy.mutate(selected)}>
        <Plus className="h-4 w-4" /> Pay {formatNaira(Math.ceil(selected * PURCHASE_PRICE))} with Paystack
      </Button>
      <p className="mt-3 text-center text-[12px] text-muted">Secure payment via Paystack · card, transfer, USSD</p>
    </div>
  );
}
