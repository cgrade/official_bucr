'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { useAuthStore } from '@/stores/auth.store';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter your email and password'); return; }
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back!');
      router.push(params.get('redirect') || '/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <div className="text-center mb-8">
        <BucrWordmark height={36} />
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-[14px] text-muted">Sign in to book and manage your reservations.</p>
      </div>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <Input label="Email" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <div>
          <label className="block text-[13px] font-medium text-ink mb-1.5">Password</label>
          <div className="relative">
            <Input type={show ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-[12px] font-medium text-[#c9a84c] hover:underline">Forgot password?</Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isLoading}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">
        New to Bucr?{' '}
        <Link href="/register" className="font-semibold text-[#c9a84c] hover:underline">Create an account</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-5 py-16 text-center text-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
