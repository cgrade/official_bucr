'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { subscriptionApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  CreditCard,
  Check,
  Sparkles,
  Crown,
  Zap,
  BarChart3,
  Users,
  Star,
  Shield,
  Headphones,
  TrendingUp,
  Gift,
} from 'lucide-react';

// Prices and features match ECONOMICS config + /lib/features.ts FEATURE_TIERS exactly.
// Scanner is Basic (required for guest check-in and cover-fee accrual).
// Pro = analytics, guest_profiles, special_offers, experiences.
// Elite = achievements, featured, display_settings.
const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    free: true,
    period: 'month',
    description: 'Free forever — get listed and start taking reservations today',
    icon: Zap,
    popular: false,
    features: [
      'Restaurant listing & public profile',
      'Reservation management',
      'QR & PIN guest check-in scanner',
      'Menu management (dine-in & takeout)',
      'Photo gallery',
      'Guest reviews display',
      'Credit-backed deposit system',
      'KYC document upload & verification',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 30000,
    free: false,
    period: 'month',
    description: 'Growth tools for restaurants ready to scale',
    icon: Star,
    popular: true,
    features: [
      'Everything in Basic',
      'Advanced analytics & booking trends',
      'Guest profiles — CRM, notes & VIP tags',
      'Special offers & promotional discounts',
      'Special dining experiences',
      '50% off per-cover success fees',
      'Priority email & chat support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 85000,
    free: false,
    period: 'month',
    description: 'Maximum visibility for high-volume establishments',
    icon: Crown,
    popular: false,
    features: [
      'Everything in Pro',
      'Achievement badges on your public profile',
      'Featured carousel & discovery placement',
      'Custom display & branding settings',
      'Zero per-cover success fees',
      'Dedicated account manager',
      'Priority search placement in Abuja',
    ],
  },
];

const benefits = [
  { icon: BarChart3, title: 'Detailed Analytics', desc: 'Track revenue, bookings, and trends' },
  { icon: Users, title: 'Guest Profiles', desc: 'Build lasting relationships' },
  { icon: Shield, title: 'No Commissions', desc: 'Flat monthly fee, no hidden costs' },
  { icon: Headphones, title: 'Priority Support', desc: '24/7 dedicated assistance' },
];

export default function SubscriptionPage() {
  const { vendor } = useAuthStore();
  // Normalise: 'premium' (legacy) → 'elite'
  const currentTier = (vendor?.subscriptionTier?.toLowerCase() ?? 'basic').replace('premium', 'elite');
  const [selectedPlan, setSelectedPlan] = useState(currentTier);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const upgradeMutation = useMutation({
    mutationFn: (planId: string) => subscriptionApi.upgrade(planId),
    onSuccess: (data: any) => {
      // If the backend returns a Paystack authorization URL, redirect to payment
      const authUrl = data?.data?.authorizationUrl || data?.data?.authorization_url;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.success('Subscription updated successfully!');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Upgrade failed. Please try again.');
    },
  });

  const handleUpgrade = (planId: string) => {
    if (planId === 'basic') {
      toast.info('Basic is free — no payment needed.');
      return;
    }
    if (planId === currentTier) return;
    upgradeMutation.mutate(planId);
  };

  const currentPlan = plans.find(p => p.id === currentTier) ?? plans[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c] shadow-lg shadow-[#c9a84c]/30">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">Subscription</h1>
              <p className="text-sm text-[#7a8fa6]">Manage your plan and billing</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">
        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] shadow-lg`}>
                <currentPlan.icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#f5f0e8]">{currentPlan.name} Plan</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    Active
                  </span>
                </div>
                <p className="text-sm text-[#7a8fa6]">
                  {currentPlan.free ? 'Free forever' : `${formatCurrency(currentPlan.price)}/month`}
                  {!currentPlan.free && vendor?.subscriptionExpiresAt
                    ? ` • Renews on ${new Date(vendor.subscriptionExpiresAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
            </div>
            <Button variant="outline">Manage Billing</Button>
          </div>
        </motion.div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-[#c9a84c] text-[#0f2547]'
                : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-[#c9a84c] text-[#0f2547]'
                : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold tracking-wide">
              SAVE 20%
            </span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            // Normalise legacy 'premium' → 'elite' for comparison
            const normalizedTier = (vendor?.subscriptionTier?.toLowerCase() ?? 'basic').replace('premium', 'elite');
            const isCurrentPlan = plan.id === normalizedTier;
            const price = billingCycle === 'yearly' ? plan.price * 12 * 0.8 : plan.price;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative glass-card rounded-2xl p-6 ${
                  plan.popular ? 'border-2 border-primary-500 dark:border-primary-400' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-[#0f2547] text-white text-xs font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl mb-4 ${
                    isCurrentPlan ? 'bg-[#c9a84c]' : 'bg-[rgba(201,168,76,0.1)]'
                  }`}>
                    <plan.icon className={`h-7 w-7 ${isCurrentPlan ? 'text-[#0f2547]' : 'text-[#c9a84c]'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-[#f5f0e8]">{plan.name}</h3>
                  {isCurrentPlan && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold tracking-wide uppercase">
                      Your current plan
                    </span>
                  )}
                  <p className="text-[12px] text-[#7a8fa6] mt-2 leading-relaxed">{plan.description}</p>
                  <div className="mt-4">
                    {plan.free ? (
                      <span className="text-4xl font-bold text-[#f5f0e8]">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-[#f5f0e8]">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-[#7a8fa6] text-sm">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[rgba(245,240,232,0.75)]">
                      <Check className="h-4 w-4 text-[#c9a84c] flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    isCurrentPlan
                      ? 'opacity-60 cursor-default'
                      : plan.popular
                      ? 'bg-[#c9a84c] text-[#0f2547] hover:bg-[#f5f0e8] border-[#c9a84c]'
                      : ''
                  }`}
                  variant={plan.popular || isCurrentPlan ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrentPlan || upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending && upgradeMutation.variables === plan.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
                  ) : isCurrentPlan ? 'Current Plan'
                    : plan.free ? 'Get Started Free'
                    : `Upgrade to ${plan.name}`}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Why Upgrade?</h2>
            <p className="text-[#7a8fa6] mt-2">Unlock powerful features to grow your business</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] mb-4">
                  <benefit.icon className="h-6 w-6 text-[#c9a84c]" />
                </div>
                <h3 className="font-semibold text-[#f5f0e8]">{benefit.title}</h3>
                <p className="text-sm text-[#7a8fa6] mt-1">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ or Support */}
        <div className="text-center py-8">
          <p className="text-[#7a8fa6]">
            Have questions about our plans?{' '}
            <button className="text-[#c9a84c] font-medium hover:text-[#f5f0e8]">
              Contact our sales team
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
