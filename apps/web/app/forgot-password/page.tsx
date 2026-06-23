'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-16 text-center">
      <BucrWordmark height={36} />
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Reset your password</h1>
      {sent ? (
        <div className="card p-6 mt-6 text-left">
          <p className="text-[14px] text-ink">If an account exists for <strong>{email}</strong>, we’ve sent a reset link. Check your inbox.</p>
          <Link href="/login" className="mt-4 inline-block text-[14px] font-semibold text-[#c9a84c] hover:underline">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card p-6 mt-6 space-y-4 text-left">
          <p className="text-[14px] text-muted">Enter your email and we’ll send you a reset link.</p>
          <Input label="Email" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
          <Link href="/login" className="block text-center text-[13px] text-muted hover:text-ink">Back to sign in</Link>
        </form>
      )}
    </div>
  );
}
