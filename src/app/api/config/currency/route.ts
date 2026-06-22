import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { ECONOMICS } from '@/lib/config/economics';
import { getFxRates } from '@/services/fx.service';

/**
 * GET /api/config/currency
 *
 * One source of truth for clients (mobile + portals): per-country phone format,
 * display currency, and the live local value of a credit. The credit base is
 * always ₦10 (NGN); other currencies are derived from live FX (display only).
 */
export const GET = withRateLimit(
  withErrorHandler(async (_request: NextRequest) => {
    const fx = await getFxRates();

    const countries: Record<string, any> = {};
    for (const [country, currency] of Object.entries(ECONOMICS.COUNTRY_CURRENCY)) {
      const phone = ECONOMICS.COUNTRY_PHONE[country];
      const perNGN = fx.perNGN[currency] ?? ECONOMICS.FX_FALLBACK_PER_NGN[currency] ?? 1;
      countries[country] = {
        currency,
        symbol: ECONOMICS.CURRENCIES[currency]?.symbol ?? '₦',
        dialCode: phone?.dialCode ?? '+234',
        phonePlaceholder: phone?.placeholder ?? '',
        phoneRegex: phone?.regex ?? '',
        phoneExample: phone?.example ?? '',
        perNGN,
        // Local value of one credit (e.g. Nigeria 10, Ghana ~0.098).
        creditValueLocal: ECONOMICS.CREDIT_VALUE_NGN * perNGN,
      };
    }

    return successResponse({
      base: 'NGN',
      creditValueNGN: ECONOMICS.CREDIT_VALUE_NGN,
      defaultCountry: ECONOMICS.DEFAULT_COUNTRY,
      fxSource: fx.source,
      fxUpdatedAt: fx.updatedAt,
      countries,
    });
  }),
  apiLimiter
);
