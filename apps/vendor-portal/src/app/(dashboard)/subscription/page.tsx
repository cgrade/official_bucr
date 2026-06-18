'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
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

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 75000,
    period: 'month',
    description: 'Perfect for getting started',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    features: [
      'Restaurant listing',
      'Reservation management',
      'Credit integration',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 145000,
    period: 'month',
    description: 'Best for growing restaurants',
    icon: Star,
    color: 'from-primary-500 to-tertiary-500',
    popular: true,
    features: [
      'Everything in Basic',
      'Advanced analytics',
      'Custom profile page',
      'Priority support',
      'Guest CRM',
      'Multi-branch support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 250000,
    period: 'month',
    description: 'For high-volume establishments',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: [
      'Everything in Pro',
      'Marketing tools',
      'Featured placement',
      'Advanced CRM',
      'Dedicated account manager',
      'API access',
      'White-label options',
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
  const [selectedPlan, setSelectedPlan] = useState(vendor?.subscriptionTier?.toLowerCase() || 'basic');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = (planId: string) => {
    toast.info(`Upgrading to ${planId} plan...`);
  };

  const currentPlan = plans.find(p => p.id === vendor?.subscriptionTier?.toLowerCase()) || plans[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your plan and billing</p>
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
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${currentPlan.color} shadow-lg`}>
                <currentPlan.icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentPlan.name} Plan</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    Active
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatCurrency(currentPlan.price)}/month • Renews on Feb 24, 2026
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-primary-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-primary-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Yearly
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              Save 20%
            </span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.id === vendor?.subscriptionTier?.toLowerCase();
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
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-tertiary-500 text-white text-xs font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color} shadow-lg mb-4`}>
                    <plan.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(price)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? 'btn-gradient' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Why Upgrade?</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Unlock powerful features to grow your business</p>
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
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-tertiary-500/10 mb-4">
                  <benefit.icon className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{benefit.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ or Support */}
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">
            Have questions about our plans?{' '}
            <button className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Contact our sales team
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
