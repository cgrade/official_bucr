'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

export default function VendorForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (e: string) => authApi.forgotPassword(e),
    // Always show success to avoid email enumeration
    onSuccess: () => setSent(true),
    onError: () => setSent(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    mutation.mutate(email.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f2547] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BucrWordmark height={32} />
        </div>

        {sent ? (
          <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] rounded-2xl p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(201,168,76,0.12)] mx-auto">
              <CheckCircle className="h-8 w-8 text-[#c9a84c]" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">Check your email</h1>
            <p className="text-[14px] text-[#7a8fa6] leading-relaxed">
              If an account exists for <strong className="text-[#f5f0e8]">{email}</strong>, we&apos;ve sent a password reset link.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-[13px] text-[#c9a84c] hover:text-[#f5f0e8] transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>
        ) : (
          <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] rounded-2xl p-8 space-y-5">
            <div className="text-center space-y-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(201,168,76,0.1)] mx-auto">
                <Mail className="h-6 w-6 text-[#c9a84c]" />
              </div>
              <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">Forgot password?</h1>
              <p className="text-[13px] text-[#7a8fa6]">Enter your email and we&apos;ll send a reset link.</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)]">
                <p className="text-[12px] text-[#f87171]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@restaurant.ng" />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>

            <Link href="/login" className="flex items-center justify-center gap-2 text-[13px] text-[#7a8fa6] hover:text-[#f5f0e8] transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
