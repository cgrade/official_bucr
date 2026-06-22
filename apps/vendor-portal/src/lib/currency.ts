import { api } from '@/lib/api';
import { setDisplayCurrency } from '@/lib/utils';

interface CountryCurrency {
  currency: string;
  symbol: string;
  perNGN: number;
}

/**
 * Loads the live currency config and sets the dashboard's display currency to
 * match the vendor's country. All money in the portal is NGN-based; this only
 * changes how it's PRESENTED (e.g. a Ghana vendor sees GH₵, a Kenya vendor KSh).
 * Falls back silently to ₦ NGN if the config can't be loaded.
 */
export async function loadDisplayCurrency(country?: string): Promise<void> {
  try {
    const res = await api.get('/config/currency');
    const countries: Record<string, CountryCurrency> = res.data?.data?.countries ?? {};
    const cfg = countries[country || 'Nigeria'] ?? countries['Nigeria'];
    if (cfg) {
      setDisplayCurrency({ code: cfg.currency, symbol: cfg.symbol, perNGN: cfg.perNGN });
    }
  } catch {
    // keep the default (₦ NGN)
  }
}
