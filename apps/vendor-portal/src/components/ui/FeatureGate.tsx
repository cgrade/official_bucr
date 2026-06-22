'use client';

/**
 * FeatureGate — wraps a page or section with a paywall overlay
 * when the vendor's subscription tier is insufficient.
 *
 * Usage:
 *   <FeatureGate feature="analytics">
 *     <AnalyticsPageContent />
 *   </FeatureGate>
 */
import Link from 'next/link';
import { Lock, Zap, Crown } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  canAccess, normalizeTier, FEATURE_TIERS, TIER_LABEL,
  type FeatureId, type Tier,
} from '@/lib/features';

interface Props {
  feature: FeatureId;
  children: React.ReactNode;
}

const TIER_ICON: Record<Tier, React.ElementType> = {
  basic: Zap,
  pro:   Zap,
  elite: Crown,
};

export default function FeatureGate({ feature, children }: Props) {
  const { vendor } = useAuthStore();
  const currentTier = normalizeTier(vendor?.subscriptionTier);
  const requiredTier = FEATURE_TIERS[feature];

  if (canAccess(currentTier, feature)) {
    return <>{children}</>;
  }

  const RequiredIcon = TIER_ICON[requiredTier];
  const requiredLabel = TIER_LABEL[requiredTier];

  return (
    <div className="flex flex-col min-h-screen bg-[#0f2547]">
      {/* Blurred preview hint */}
      <div className="pointer-events-none select-none opacity-20 blur-sm overflow-hidden max-h-64">
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.3)]">
              <Lock className="h-7 w-7 text-[#c9a84c]" />
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c9a84c] text-[#0f2547] text-[11px] font-bold tracking-[0.15em] uppercase">
              <RequiredIcon className="h-3.5 w-3.5" />
              {requiredLabel} Feature
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-3xl font-semibold text-[#f5f0e8]">
              Upgrade to {requiredLabel}
            </h2>
            <p className="text-[#7a8fa6] leading-relaxed">
              This feature is available on the <strong className="text-[#c9a84c]">{requiredLabel}</strong> plan.
              You are currently on <strong className="text-[#f5f0e8]">
                {TIER_LABEL[currentTier]}
              </strong>.
            </p>
          </div>

          {/* What you get */}
          {requiredTier === 'pro' && (
            <ul className="text-left space-y-2 text-[13px] text-[#7a8fa6]">
              {['Advanced analytics & trends', 'Guest CRM — notes, tags, VIP flags', 'Special offers & promotions', 'Special dining experiences', 'QR check-in scanner'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#c9a84c]">✓</span> {f}
                </li>
              ))}
            </ul>
          )}
          {requiredTier === 'elite' && (
            <ul className="text-left space-y-2 text-[13px] text-[#7a8fa6]">
              {['Achievement badges on your profile', 'Featured placement in discovery', 'Custom display & branding settings', 'Zero per-cover success fees', 'Dedicated account manager'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#c9a84c]">✓</span> {f}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/subscription"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#c9a84c] text-[#0f2547] rounded-lg font-semibold text-sm hover:bg-[#f5f0e8] transition-colors">
              <RequiredIcon className="h-4 w-4" />
              Upgrade to {requiredLabel} — {requiredTier === 'pro' ? '₦30,000' : '₦85,000'}/mo
            </Link>
            <Link href="/dashboard"
              className="text-[13px] text-[#7a8fa6] hover:text-[#f5f0e8] transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
