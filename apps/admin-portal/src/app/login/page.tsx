'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ShieldCheck, ArrowRight, Users, Store, TrendingUp, Lock } from 'lucide-react';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (res.success && res.data) {
        setAuth(res.data.admin, res.data.tokens.accessToken);
        toast.success('Welcome back!');
        router.push('/dashboard');
      } else {
        toast.error(res.message || 'Login failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const PILLARS = [
    { icon: ShieldCheck, label: 'Vendor KYC & Verification' },
    { icon: Users,       label: 'User & Credit Management' },
    { icon: Store,       label: 'Restaurant Oversight' },
    { icon: TrendingUp,  label: 'Platform Revenue Ledger' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0f2547]">

      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 border-r border-[rgba(201,168,76,0.12)]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2">
          <BucrWordmark height={32} />
          <span className="text-[8px] font-bold tracking-[0.22em] uppercase text-[#7a8fa6] border border-[rgba(201,168,76,0.2)] px-1.5 py-0.5 rounded ml-1">
            Admin
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="space-y-8">
          <div className="space-y-3">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#c9a84c]">
              Platform Administration
            </span>
            <h1 className="font-display text-5xl font-semibold text-[#f5f0e8] leading-[1.1]">
              Control centre<br />
              <em className="not-italic text-[#c9a84c]">for Bucr.</em>
            </h1>
            <p className="text-[14px] text-[#7a8fa6] leading-relaxed max-w-sm">
              Manage vendors, review KYC documents, adjust credits, and monitor platform health — all from one secured interface.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PILLARS.map((p, i) => (
              <motion.div key={p.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(201,168,76,0.12)] bg-[rgba(255,255,255,0.03)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.1)] flex-shrink-0">
                  <p.icon className="h-4 w-4 text-[#c9a84c]" />
                </div>
                <p className="text-[12px] text-[rgba(245,240,232,0.7)] leading-tight">{p.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="text-[10px] text-[rgba(122,143,166,0.5)]">
          © 2026 Bucr Limited · Restricted access
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-10">

        {/* Mobile logo */}
        <div className="flex flex-col items-center gap-2 mb-10 lg:hidden">
          <BucrWordmark height={32} />
          <p className="text-[10px] text-[#7a8fa6] tracking-[0.2em] uppercase">Admin Portal</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="w-full max-w-sm">

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.25)]">
                <Lock className="h-5 w-5 text-[#c9a84c]" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-[#f5f0e8]">Admin Sign In</h2>
            </div>
            <p className="text-[12px] text-[#7a8fa6] ml-13">Authorised personnel only</p>
          </div>

          <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] rounded-2xl p-7 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6]">
                  Admin Email
                </label>
                <Input type="email" placeholder="admin@bucr.ng" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6]">
                  Password
                </label>
                <div className="relative">
                  <Input type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                    autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a8fa6] hover:text-[#f5f0e8] transition-colors">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" loading={isLoading}>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-[10px] text-[rgba(122,143,166,0.5)]">
            This portal is restricted to Bucr team members
          </p>
        </motion.div>
      </div>
    </div>
  );
}
