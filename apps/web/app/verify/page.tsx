'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MailCheck, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/';
  const { isAuthenticated, ready } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [sentOnce, setSentOnce] = useState(false);

  useEffect(() => { if (ready && !isAuthenticated) router.push(`/login?redirect=/verify`); }, [ready, isAuthenticated, router]);

  const send = useMutation({
    mutationFn: () => authApi.sendEmailVerification(),
    onSuccess: () => { setSentOnce(true); toast.success('Verification code sent to your email'); },
    onError: (e: any) => {
      // "already verified" → just proceed
      if (e?.response?.data?.error?.toLowerCase?.().includes('already')) { toast.success('Already verified'); router.push(redirect); return; }
      toast.error(e?.response?.data?.error || 'Could not send code');
    },
  });

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(otp.trim()),
    onSuccess: () => { toast.success('Email verified! You can book now.'); router.push(redirect); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Invalid or expired code'),
  });

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <div className="card p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(201,168,76,0.12)]">
          <MailCheck className="h-7 w-7 text-[#c9a84c]" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Verify your email</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          We sent a 6-digit code to your email when you signed up. Enter it below to start booking.
          {' '}Didn't get it? <button onClick={() => send.mutate()} disabled={send.isPending} className="text-[#c9a84c] font-medium hover:underline">{send.isPending ? 'Sending…' : sentOnce ? 'Resend' : 'Send code'}</button>
        </p>

        <input
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="mt-6 w-full text-center tracking-[0.5em] text-2xl font-semibold h-14 rounded-xl border border-line bg-surface text-ink focus:outline-none focus:border-[#c9a84c]"
        />

        <Button size="lg" className="w-full mt-4" loading={verify.isPending} disabled={otp.length !== 6} onClick={() => verify.mutate()}>
          Verify & continue
        </Button>
        <button onClick={() => router.push(redirect)} className="mt-3 text-[13px] text-muted hover:text-ink">Skip for now</button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-5 py-20 text-center text-muted"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}>
      <VerifyInner />
    </Suspense>
  );
}
