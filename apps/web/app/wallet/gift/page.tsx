'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Gift as GiftIcon } from 'lucide-react';
import { giftsApi, creditsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth.store';
import { formatNaira, cn } from '@/lib/utils';

const GIFT_FEE = 0.08; // 8%

export default function GiftPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/wallet/gift'); }, [ready, isAuthenticated, router]);

  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');

  const { data: bal } = useQuery({ queryKey: ['credits'], queryFn: () => creditsApi.getBalance(), enabled: isAuthenticated });
  const balance = (bal?.data as any)?.balance ?? 0;
  const { data: giftsData } = useQuery({ queryKey: ['gifts'], queryFn: () => giftsApi.getAll(), enabled: isAuthenticated });
  const received: any[] = (giftsData?.data as any)?.received ?? [];

  const fee = Math.ceil(amount * GIFT_FEE);
  const total = amount + fee;

  const send = useMutation({
    mutationFn: () => giftsApi.send({ creditAmount: amount, ...(method === 'email' ? { recipientEmail: recipient.trim() } : { recipientPhone: recipient.trim() }), message: message.trim() || undefined }),
    onSuccess: () => { toast.success('Gift sent! 🎁'); qc.invalidateQueries({ queryKey: ['credits'] }); qc.invalidateQueries({ queryKey: ['gifts'] }); setRecipient(''); setMessage(''); },
    onError: (err: any) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not send gift'),
  });

  const claim = useMutation({
    mutationFn: (giftId: string) => giftsApi.claim(giftId),
    onSuccess: () => { toast.success('Gift claimed!'); qc.invalidateQueries({ queryKey: ['credits'] }); qc.invalidateQueries({ queryKey: ['gifts'] }); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not claim'),
  });

  if (!ready || !isAuthenticated) return <div className="max-w-xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-[#7a8fa6] hover:text-[#0f2547] mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="font-display text-3xl font-semibold text-[#0f2547] flex items-center gap-2"><GiftIcon className="h-7 w-7 text-[#c9a84c]" /> Gift credits</h1>
      <p className="mt-1 text-[13px] text-[#7a8fa6]">Your balance: {balance.toLocaleString()} credits · 8% gift fee applies.</p>

      <div className="card p-6 mt-6 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#0f2547] mb-1.5">Amount (credits)</label>
          <div className="flex gap-2 mb-2">
            {[50, 100, 200, 500].map((a) => (
              <button key={a} onClick={() => setAmount(a)} className={cn('flex-1 h-10 rounded-lg border text-[13px] font-medium', amount === a ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#0f2547]' : 'border-[rgba(15,37,71,0.18)] text-[#7a8fa6]')}>{a}</button>
            ))}
          </div>
          <Input type="number" min={10} value={amount} onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))} />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#0f2547] mb-1.5">Send to</label>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setMethod('email')} className={cn('flex-1 h-10 rounded-lg border text-[13px] font-medium', method === 'email' ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#0f2547]' : 'border-[rgba(15,37,71,0.18)] text-[#7a8fa6]')}>Email</button>
            <button onClick={() => setMethod('phone')} className={cn('flex-1 h-10 rounded-lg border text-[13px] font-medium', method === 'phone' ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#0f2547]' : 'border-[rgba(15,37,71,0.18)] text-[#7a8fa6]')}>Phone</button>
          </div>
          <Input type={method === 'email' ? 'email' : 'tel'} placeholder={method === 'email' ? 'friend@email.com' : '0801 234 5678'} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        </div>

        <Input label="Message (optional)" placeholder="Enjoy a meal on me 🎉" value={message} onChange={(e) => setMessage(e.target.value)} />

        <div className="rounded-xl bg-[rgba(201,168,76,0.08)] p-3 text-[13px] space-y-1">
          <div className="flex justify-between"><span className="text-[#7a8fa6]">Gift amount</span><span className="text-[#0f2547]">{amount} cr ({formatNaira(amount * 10)})</span></div>
          <div className="flex justify-between"><span className="text-[#7a8fa6]">Fee (8%)</span><span className="text-[#0f2547]">{fee} cr</span></div>
          <div className="flex justify-between font-bold border-t border-[rgba(15,37,71,0.1)] pt-1 mt-1"><span className="text-[#0f2547]">Total deducted</span><span className="text-[#0f2547]">{total} cr</span></div>
        </div>

        <Button size="lg" className="w-full" loading={send.isPending} disabled={!recipient || total > balance} onClick={() => send.mutate()}>
          {total > balance ? 'Insufficient balance' : `Send ${amount} credits`}
        </Button>
      </div>

      {received.filter((g) => g.status === 'pending').length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold text-[#0f2547] mb-3">Gifts to claim</h2>
          <div className="space-y-2">
            {received.filter((g) => g.status === 'pending').map((g) => (
              <div key={g.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#0f2547]">{g.amount} credits</p>
                  <p className="text-[12px] text-[#7a8fa6]">from {g.sender?.name || 'a friend'}{g.message ? ` · “${g.message}”` : ''}</p>
                </div>
                <Button size="sm" loading={claim.isPending} onClick={() => claim.mutate(g.id)}>Claim</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center"><Link href="/wallet/history" className="text-[13px] font-medium text-[#c9a84c] hover:underline">View transaction history</Link></p>
    </div>
  );
}
