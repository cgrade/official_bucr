import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // In Expo Go, infer host from Metro and point API to port 3000
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];

  return host ? `http://${host}:3000` : 'http://127.0.0.1:3000';
}

/**
 * Deposit is FLAT per reservation — party size does NOT affect it.
 * Amount depends on venue type (or the vendor's custom override).
 * Mirrors ECONOMICS.DEPOSIT_BY_VENUE_TYPE on the backend. 1 credit = ₦10.
 */
export const DEPOSIT_BY_VENUE_TYPE: Record<string, number> = {
  fine_dining:    Number(process.env.EXPO_PUBLIC_DEPOSIT_FINE_DINING)    || 2000, // ₦20,000
  upscale_casual: Number(process.env.EXPO_PUBLIC_DEPOSIT_UPSCALE_CASUAL) || 1500, // ₦15,000
  lounge:         Number(process.env.EXPO_PUBLIC_DEPOSIT_LOUNGE)         || 1000, // ₦10,000
  casual:         Number(process.env.EXPO_PUBLIC_DEPOSIT_CASUAL)         || 1000, // ₦10,000
};
export const DEPOSIT_DEFAULT = Number(process.env.EXPO_PUBLIC_DEPOSIT_DEFAULT) || 1000;

/** Resolve the flat deposit for a reservation. customDeposit → venue type → default. */
export function getReservationDeposit(venueType?: string | null, customDeposit?: number | null): number {
  if (customDeposit && customDeposit > 0) return customDeposit;
  if (venueType && DEPOSIT_BY_VENUE_TYPE[venueType] != null) return DEPOSIT_BY_VENUE_TYPE[venueType];
  return DEPOSIT_DEFAULT;
}

/** @deprecated Deposits are flat per reservation now. Returns the default flat deposit. */
export function getCreditsForPartySize(_partySize?: number): number {
  return DEPOSIT_DEFAULT;
}

// Economic constants mirrored from backend ECONOMICS
export const SHOWUP_BONUS_PCT  = Number(process.env.EXPO_PUBLIC_SHOWUP_BONUS_PCT)  || 0.03; // 3%
export const NOSHOW_FORFEIT_PCT = Number(process.env.EXPO_PUBLIC_NOSHOW_FORFEIT_PCT) || 0.40; // 40% forfeited
export const NOSHOW_RETURN_PCT  = 1 - NOSHOW_FORFEIT_PCT; // 60% returned to guest

export const config = {
  apiUrl: resolveApiUrl(),
  mapboxPublicToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  appName: 'Bucr',
  credits: {
    // 1 credit = ₦10 (matches ECONOMICS.CREDIT_VALUE_NGN)
    valueNgn: Number(process.env.EXPO_PUBLIC_CREDIT_VALUE_NGN) || 10,
  },
};
