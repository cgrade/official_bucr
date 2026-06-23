'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Gift, Copy, Users } from 'lucide-react';
import { referralApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

export default function ReferralPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/account/referral'); }, [ready, isAuthenticated, router]);

  const { data, isLoading } = useQuery({ queryKey: ['referral'], queryFn: () => referralApi.getStats(), enabled: isAuthenticated });
  const stats: any = data?.data ?? {};
  const code = stats.referralCode || stats.code || '—';
  const link = typeof window !== 'undefined' && code !== '—' ? `${window.location.origin}/register?ref=${code}` : '';

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied!'); } catch { toast.error('Could not copy'); }
  };

  if (!ready || !isAuthenticated) return <div className="max-w-xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-muted hover:text-ink mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>

      <div className="card p-6 text-center bg-[#0f2547] text-[#f5f0e8]">
        <Gift className="h-9 w-9 mx-auto text-[#c9a84c]" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Refer & earn</h1>
        <p className="mt-1 text-[14px] text-[rgba(245,240,232,0.75)]">Invite friends — you both earn bonus credits when they make their first booking.</p>
      </div>

      <div className="card p-6 mt-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Your referral code</p>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-[rgba(201,168,76,0.1)] px-4 py-3">
          <span className="text-2xl font-bold tracking-widest text-ink">{isLoading ? '…' : code}</span>
          <button onClick={() => copy(code)} className="text-[#c9a84c] hover:text-ink"><Copy className="h-5 w-5" /></button>
        </div>
        {link && <Button className="w-full mt-4" onClick={() => copy(link)}><Copy className="h-4 w-4" /> Copy invite link</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="card p-5 text-center">
          <Users className="h-5 w-5 mx-auto text-[#c9a84c]" />
          <p className="mt-2 text-2xl font-bold text-ink">{stats.totalReferrals ?? stats.referralCount ?? 0}</p>
          <p className="text-[12px] text-muted">Friends joined</p>
        </div>
        <div className="card p-5 text-center">
          <Gift className="h-5 w-5 mx-auto text-[#c9a84c]" />
          <p className="mt-2 text-2xl font-bold text-ink">{stats.creditsEarned ?? stats.totalEarned ?? 0}</p>
          <p className="text-[12px] text-muted">Credits earned</p>
        </div>
      </div>
    </div>
  );
}
