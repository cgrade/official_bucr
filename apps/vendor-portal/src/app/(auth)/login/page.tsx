'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import {
  Eye, EyeOff, ArrowRight,
  QrCode, BarChart3, Users, ShieldCheck,
} from 'lucide-react';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: QrCode,    title: 'QR Check-in',     desc: 'Verify guests instantly' },
  { icon: BarChart3, title: 'Live Analytics',   desc: 'Track every booking' },
  { icon: Users,     title: 'Guest CRM',        desc: 'Know your regulars' },
  { icon: ShieldCheck, title: 'Reliable Revenue', desc: 'Credit-backed deposits' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f2547]">

      {/* ── Left panel — brand story ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 border-r border-[rgba(201,168,76,0.12)]">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2">
          <BucrWordmark height={40} />
          <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-[#7a8fa6] border border-[rgba(201,168,76,0.2)] px-1.5 py-0.5 rounded ml-1">
            Vendor
          </span>
        </motion.div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="space-y-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#c9a84c]">
              Bucr Vendor Portal — Abuja
            </p>
            <h1 className="font-display text-5xl font-semibold text-[#f5f0e8] leading-[1.1]">
              Your table,<br />
              <em className="not-italic text-[#c9a84c]">actually waiting.</em>
            </h1>
            <p className="text-[15px] text-[#7a8fa6] leading-relaxed max-w-sm">
              Nigeria's first credit-backed reservation platform.
              Guests deposit credits to confirm — no-shows become revenue, not losses.
            </p>
          </div>

          {/* Feature tiles */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-[rgba(201,168,76,0.12)] bg-[rgba(255,255,255,0.03)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.1)] flex-shrink-0">
                  <f.icon className="h-4.5 w-4.5 text-[#c9a84c]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#f5f0e8] leading-tight">{f.title}</p>
                  <p className="text-[11px] text-[#7a8fa6] mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-[11px] text-[rgba(122,143,166,0.6)]">
          © 2026 Bucr Limited · Abuja, Nigeria
        </motion.p>
      </div>

      {/* ── Right panel — login form ───────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-10">

        {/* Mobile logo */}
        <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
          <BucrWordmark height={40} />
          <p className="text-[11px] text-[#7a8fa6] tracking-wider uppercase">Vendor Portal</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-display text-3xl font-semibold text-[#f5f0e8]">Welcome back</h2>
            <p className="mt-1.5 text-[13px] text-[#7a8fa6]">Sign in to manage your restaurant</p>
          </div>

          {/* Form card */}
          <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] rounded-2xl p-7 space-y-5">

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold tracking-[0.06em] text-[#7a8fa6] uppercase">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="you@restaurant.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold tracking-[0.06em] text-[#7a8fa6] uppercase">
                    Password
                  </label>
                  <Link href="/forgot-password"
                    className="text-[11px] text-[#c9a84c] hover:text-[#f5f0e8] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a8fa6] hover:text-[#f5f0e8] transition-colors">
                    {showPwd ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" size="lg" className="w-full gap-2" loading={isLoading}>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(201,168,76,0.12)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[rgba(255,255,255,0.04)] px-3 text-[11px] text-[#7a8fa6]">
                  New to Bucr?
                </span>
              </div>
            </div>

            {/* Register link */}
            <Link href="/register"
              className="flex items-center justify-center w-full h-11 rounded-lg border border-[rgba(201,168,76,0.25)] text-[#c9a84c] text-[13px] font-semibold hover:bg-[rgba(201,168,76,0.08)] hover:border-[#c9a84c] transition-all">
              Register your restaurant →
            </Link>
          </div>

          <p className="mt-6 text-center text-[11px] text-[rgba(122,143,166,0.5)]">
            By continuing you agree to Bucr's Terms of Service
          </p>
        </motion.div>
      </div>
    </div>
  );
}
