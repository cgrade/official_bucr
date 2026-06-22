/**
 * Subscription-based feature gating for the BUCR Vendor Portal.
 *
 * Basic (free)  — core operations, every vendor gets this
 * Pro  (₦30k)   — growth tools, analytics, CRM
 * Elite (₦85k)  — marketing, advanced customisation, zero cover fees
 *
 * "coming_soon" features are removed from the current build and will
 * return as paid upgrades.
 */

export type Tier = 'basic' | 'pro' | 'elite';

export type FeatureId =
  | 'dashboard'
  | 'reservations'
  | 'scanner'
  | 'menu'
  | 'gallery'
  | 'reviews'
  | 'settings'
  | 'documents'
  | 'credits'
  | 'subscription'
  | 'analytics'
  | 'guest_profiles'
  | 'special_offers'
  | 'experiences'
  | 'achievements'
  | 'featured'
  | 'display_settings';

/** Minimum tier required to access each feature */
export const FEATURE_TIERS: Record<FeatureId, Tier> = {
  // ── Basic (always available) ─────────────────────────────────────────
  dashboard:        'basic',
  reservations:     'basic',
  menu:             'basic',
  gallery:          'basic',
  reviews:          'basic',
  settings:         'basic',
  documents:        'basic',
  credits:          'basic',
  subscription:     'basic',

  // ── Basic — scanner is core operations (check-in triggers cover-fee accrual) ─
  scanner:          'basic',  // guest check-in + cover-fee recording

  // ── Pro ──────────────────────────────────────────────────────────────
  analytics:        'pro',    // advanced analytics & trends
  guest_profiles:   'pro',    // CRM, notes, VIP tags
  special_offers:   'pro',    // promotions, discounts
  experiences:      'pro',    // special dining experiences

  // ── Elite ────────────────────────────────────────────────────────────
  achievements:     'elite',  // badges displayed on profile
  featured:         'elite',  // paid marketing placement
  display_settings: 'elite',  // customise what guests see
};

const TIER_ORDER: Tier[] = ['basic', 'pro', 'elite'];

/** Returns true if the vendor's current tier grants access to the feature */
export function canAccess(vendorTier: string | undefined, feature: FeatureId): boolean {
  const current = normalizeTier(vendorTier);
  const required = FEATURE_TIERS[feature];
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}

/** Normalise legacy 'premium' → 'elite' and handle undefined */
export function normalizeTier(tier: string | undefined | null): Tier {
  if (!tier) return 'basic';
  if (tier === 'premium') return 'elite';
  if (['basic', 'pro', 'elite'].includes(tier)) return tier as Tier;
  return 'basic';
}

/** Human-readable label for a tier */
export const TIER_LABEL: Record<Tier, string> = {
  basic: 'Basic',
  pro:   'Pro',
  elite: 'Elite',
};

/** Badge colour for tier tags */
export const TIER_COLOR: Record<Tier, string> = {
  basic: 'rgba(122,143,166,0.25)',
  pro:   'rgba(201,168,76,0.2)',
  elite: '#c9a84c',
};

export const TIER_TEXT_COLOR: Record<Tier, string> = {
  basic: '#7a8fa6',
  pro:   '#c9a84c',
  elite: '#0f2547',
};
