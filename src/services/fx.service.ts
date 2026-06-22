/**
 * FX Service — live exchange rates for multi-currency DISPLAY only.
 *
 * The credit unit is always priced in NGN (₦10 = 1 credit, the locked base).
 * For Ghana/Kenya we show local-currency equivalents using live rates from a
 * free provider (open.er-api.com — no API key, supports NGN/GHS/KES). Results
 * are cached in Redis; if the feed is unavailable we fall back to the
 * provisional rates in ECONOMICS.FX_FALLBACK_PER_NGN. Money never settles in
 * these currencies — this is presentation only.
 */
import { cache } from '@/lib/cache/cache-service';
import { ECONOMICS } from '@/lib/config/economics';

const FX_CACHE_KEY = 'fx:per_ngn';
const PROVIDER_URL = 'https://open.er-api.com/v6/latest/NGN';

export interface FxSnapshot {
  /** Units of local currency per 1 NGN, e.g. { NGN: 1, GHS: 0.0098, KES: 0.086 }. */
  perNGN: Record<string, number>;
  /** ISO timestamp of when the snapshot was produced. */
  updatedAt: string;
  /** 'live' when fetched from the provider, 'fallback' when using ECONOMICS defaults. */
  source: 'live' | 'fallback';
}

const SUPPORTED = Object.keys(ECONOMICS.CURRENCIES); // ['NGN','GHS','KES']

function fallbackSnapshot(): FxSnapshot {
  return {
    perNGN: { ...ECONOMICS.FX_FALLBACK_PER_NGN },
    updatedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

/**
 * Returns the current "local currency per 1 NGN" rates for the supported
 * markets. Cached for ECONOMICS.FX_CACHE_TTL_SECONDS; falls back gracefully.
 */
export async function getFxRates(): Promise<FxSnapshot> {
  const cached = (await cache.get<FxSnapshot>(FX_CACHE_KEY)) as FxSnapshot | null;
  if (cached) return cached;

  try {
    const res = await fetch(PROVIDER_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`FX provider ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) throw new Error('FX provider bad payload');

    // Keep only the currencies we support; NGN is always exactly 1.
    const perNGN: Record<string, number> = { NGN: 1 };
    for (const code of SUPPORTED) {
      if (code === 'NGN') continue;
      const rate = Number(data.rates[code]);
      // Guard against zero/garbage — fall back per-currency if a value is missing.
      perNGN[code] = rate > 0 ? rate : ECONOMICS.FX_FALLBACK_PER_NGN[code] ?? 1;
    }

    const snapshot: FxSnapshot = { perNGN, updatedAt: new Date().toISOString(), source: 'live' };
    await cache.set(FX_CACHE_KEY, snapshot, ECONOMICS.FX_CACHE_TTL_SECONDS);
    return snapshot;
  } catch (err) {
    console.error('[fx] live rate fetch failed, using fallback:', (err as Error).message);
    return fallbackSnapshot();
  }
}

/**
 * Local-currency value of `credits` for a given country, using the NGN base.
 * e.g. 2000 credits in Ghana = 2000 × ₦10 × (GHS per NGN).
 */
export function creditsToLocal(credits: number, country: string, snapshot: FxSnapshot): { amount: number; currency: string; symbol: string } {
  const currency = ECONOMICS.COUNTRY_CURRENCY[country] ?? 'NGN';
  const per = snapshot.perNGN[currency] ?? ECONOMICS.FX_FALLBACK_PER_NGN[currency] ?? 1;
  const amount = credits * ECONOMICS.CREDIT_VALUE_NGN * per;
  return { amount, currency, symbol: ECONOMICS.CURRENCIES[currency]?.symbol ?? '₦' };
}
