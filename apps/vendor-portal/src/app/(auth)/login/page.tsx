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
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';
import { Eye, EyeOff, Sparkles, ArrowRight, UtensilsCrossed, QrCode, BarChart3, Shield, Clock, TrendingUp } from 'lucide-react';
import { BucrLogo } from '@/components/ui/BucrLogo';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  { icon: QrCode, title: 'QR Check-in', desc: 'Instant guest verification' },
  { icon: TrendingUp, title: 'Reduce No-Shows', desc: 'Credit-based deposits' },
  { icon: BarChart3, title: 'Analytics', desc: 'Track your performance' },
];

const benefits = [
  { icon: Shield, text: 'Secure & Verified' },
  { icon: Clock, text: '24/7 Support' },
  { icon: UtensilsCrossed, text: '500+ Restaurants' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding with Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image - Replace /images/login-bg.jpg with your image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
        />
        
        {/* Gradient Overlay - Creates the beautiful brand color effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-primary-900/80" />
        
        {/* Animated Color Highlights */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-secondary-500/20 rounded-full blur-3xl animate-pulse delay-500" />
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12">
          {/* Logo - Replace with your logo image */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <BucrLogo width={160} height={40} />
            <span className="text-sm text-slate-400 ml-2">Vendor Portal</span>
          </motion.div>
          
          {/* Hero Text */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl font-bold text-white leading-tight">
                Manage your
                <span className="block mt-2 bg-gradient-to-r from-primary-400 via-tertiary-400 to-primary-400 bg-clip-text text-transparent">
                  restaurant bookings
                </span>
                with ease.
              </h1>
              <p className="mt-6 text-lg text-slate-400 max-w-md">
                Streamline reservations, reduce no-shows, and grow your business with our powerful vendor platform.
              </p>
            </motion.div>
            
            {/* Features */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-6"
            >
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500/20 to-tertiary-500/20">
                    <feature.icon className="h-5 w-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{feature.title}</p>
                    <p className="text-sm text-slate-400">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          {/* Footer */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm text-slate-500"
          >
            © 2026 Bucr. Empowering Nigerian restaurants.
          </motion.p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.04),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.08),transparent_50%)]" />
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <ThemeToggle />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="mb-8 text-center lg:hidden">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex justify-center mb-4"
            >
              <BucrLogo width={160} height={40} />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Portal</h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Manage your restaurant bookings</p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8 hidden lg:block">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold text-slate-900 dark:text-white"
            >
              Welcome back!
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-slate-600 dark:text-slate-400"
            >
              Sign in to access your vendor dashboard
            </motion.p>
          </div>

          {/* Login Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/50 dark:border-slate-700/50"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="vendor@restaurant.com"
                  error={errors.email?.message}
                  className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  {...register('email')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={errors.password?.message}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 dark:bg-slate-800 transition-colors" 
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary-500 via-primary-600 to-tertiary-500 hover:from-primary-600 hover:via-primary-700 hover:to-tertiary-600 text-white text-base font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300 group" 
                size="lg" 
                loading={isLoading}
              >
                Sign In
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-slate-900 px-4 text-slate-500 dark:text-slate-400">
                  New to Bucr?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-gradient-to-r hover:from-primary-50 hover:to-tertiary-50 dark:hover:from-primary-500/10 dark:hover:to-tertiary-500/10 hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-300 group"
            >
              <Sparkles className="h-5 w-5 text-primary-500 group-hover:scale-110 transition-transform" />
              Register your restaurant
            </Link>
          </motion.div>

          {/* Trust badges - Mobile only */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex items-center justify-center gap-6 lg:hidden"
          >
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <benefit.icon className="h-3.5 w-3.5 text-primary-500" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </motion.div>

          {/* Mobile Footer */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500 lg:hidden"
          >
            © 2026 Bucr. All rights reserved.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
