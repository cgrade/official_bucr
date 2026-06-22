import { db } from '@/lib/db';

/**
 * Admin-tunable OPERATIONAL settings (distinct from ECONOMICS, which is the
 * legally-reviewed economic source of truth and stays env-driven). These are
 * stored in the SystemSetting key/value table by the admin portal and READ HERE
 * by the code paths they affect — that's what makes an admin edit take effect.
 *
 * Cached briefly in-memory so hot paths (e.g. reservation creation) don't hit
 * the DB on every request; an admin edit propagates within `CACHE_TTL_MS`.
 */
export interface OperationalSettings {
  platformName: string;
  supportEmail: string;
  maxPartySize: number;
  minPasswordLength: number;
  vendorVerificationRequired: boolean;
  rateLimitRpm: number;
}

export const DEFAULT_OPERATIONAL_SETTINGS: OperationalSettings = {
  platformName: 'Bucr',
  supportEmail: 'support@bucr.ng',
  maxPartySize: 20,
  minPasswordLength: 8,
  vendorVerificationRequired: true,
  rateLimitRpm: 100,
};

const CACHE_TTL_MS = 60_000;
let cache: { value: OperationalSettings; at: number } | null = null;

/** Force cache refresh on next read (called after an admin settings update). */
export function invalidateSystemSettingsCache() {
  cache = null;
}

function coerce(raw: Record<string, unknown>): OperationalSettings {
  const num = (v: unknown, d: number) => {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    platformName: typeof raw.platformName === 'string' ? raw.platformName : DEFAULT_OPERATIONAL_SETTINGS.platformName,
    supportEmail: typeof raw.supportEmail === 'string' ? raw.supportEmail : DEFAULT_OPERATIONAL_SETTINGS.supportEmail,
    maxPartySize: num(raw.maxPartySize, DEFAULT_OPERATIONAL_SETTINGS.maxPartySize),
    minPasswordLength: num(raw.minPasswordLength, DEFAULT_OPERATIONAL_SETTINGS.minPasswordLength),
    vendorVerificationRequired:
      typeof raw.vendorVerificationRequired === 'boolean'
        ? raw.vendorVerificationRequired
        : DEFAULT_OPERATIONAL_SETTINGS.vendorVerificationRequired,
    rateLimitRpm: num(raw.rateLimitRpm, DEFAULT_OPERATIONAL_SETTINGS.rateLimitRpm),
  };
}

export async function getOperationalSettings(): Promise<OperationalSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const rows = await db.systemSetting.findMany();
    const raw: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        raw[r.key] = JSON.parse(r.value);
      } catch {
        raw[r.key] = r.value;
      }
    }
    const value = coerce(raw);
    cache = { value, at: Date.now() };
    return value;
  } catch {
    // Table missing or DB hiccup — fall back to defaults, don't break the request.
    return DEFAULT_OPERATIONAL_SETTINGS;
  }
}
