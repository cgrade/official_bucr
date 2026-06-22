/**
 * Display currency for the diner app.
 *
 * Every stored amount is NGN (the credit base is ₦10). For Ghana/Kenya diners we
 * DISPLAY the local-currency equivalent of credit VALUES (balance, deposits,
 * what credits are worth) using a live FX rate. Actual purchase charges stay in
 * NGN (Paystack settles in Naira), so purchase prices are NOT converted.
 */
import { configApi } from './api';

let display = { code: 'NGN', symbol: '₦', perNGN: 1 };

export function setDisplayCurrency(c: { code: string; symbol: string; perNGN: number }) {
  display = c;
}
export function getDisplayCurrency() {
  return display;
}

/** Convert an NGN amount to the active display currency and format it. */
export function formatMoney(naira: number): string {
  const local = (naira || 0) * display.perNGN;
  return `${display.symbol}${local.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * Loads the live currency config and sets the display currency for the diner's
 * country. Falls back silently to ₦ NGN.
 */
export async function loadDisplayCurrency(country?: string): Promise<void> {
  try {
    const res = await configApi.getCurrency();
    const countries = (res.data as any)?.countries ?? {};
    const cfg = countries[country || 'Nigeria'] ?? countries['Nigeria'];
    if (cfg) setDisplayCurrency({ code: cfg.currency, symbol: cfg.symbol, perNGN: cfg.perNGN });
  } catch {
    // keep default ₦ NGN
  }
}
