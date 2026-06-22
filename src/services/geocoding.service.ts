/**
 * Geocoding Service — Mapbox Geocoding API (server-side only).
 *
 * All geocoding calls go through the backend using the secret MAPBOX_ACCESS_TOKEN.
 * Results are cached in Redis for 30 days (Mapbox Terms of Service permit this).
 * Clients (mobile / web portals) NEVER call Mapbox geocoding directly.
 */
import { cache } from '@/lib/cache/cache-service';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

export interface ReverseGeocodingResult {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
}

const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Per-country ISO code + a proximity centre to bias forward-geocoding results.
const COUNTRY_GEO: Record<string, { iso: string; lng: number; lat: number }> = {
  nigeria: { iso: 'ng', lng: 7.4951, lat: 9.0579 }, // Abuja (launch market)
  ghana:   { iso: 'gh', lng: -0.1870, lat: 5.6037 }, // Accra
  kenya:   { iso: 'ke', lng: 36.8219, lat: -1.2921 }, // Nairobi
};
function countryGeo(country?: string) {
  return COUNTRY_GEO[(country || 'nigeria').toLowerCase()] ?? COUNTRY_GEO.nigeria;
}

function getToken(): string {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
  return token;
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Forward geocode: address string → { lat, lng, formattedAddress }.
 * Results cached in Redis for 30 days.
 */
export async function geocodeAddress(address: string, country?: string): Promise<GeocodingResult | null> {
  const normalised = normalizeAddress(address);
  const geo = countryGeo(country);
  const cacheKey = `${CACHE_KEYS.GEOCODE}${geo.iso}:${Buffer.from(normalised).toString('base64')}`;

  const cached = await cache.get<GeocodingResult>(cacheKey) as GeocodingResult | null;
  if (cached) return cached;

  try {
    const encoded = encodeURIComponent(address);
    // Restrict + bias results toward the target country
    const url = `${MAPBOX_BASE}/${encoded}.json?access_token=${getToken()}&country=${geo.iso}&types=address,place&proximity=${geo.lng},${geo.lat}&limit=1`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[geocoding] Mapbox API error ${res.status} for "${address}"`);
      return null;
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center as [number, number];
    const result: GeocodingResult = {
      lat,
      lng,
      formattedAddress: feature.place_name as string,
      placeId: feature.id as string,
    };

    await cache.set(cacheKey, result, CACHE_TTL.GEOCODE);
    return result;
  } catch (err) {
    console.error('[geocoding] Forward geocode failed:', err);
    return null;
  }
}

/**
 * Reverse geocode: { lat, lng } → human-readable address details.
 * Results cached in Redis for 30 days.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
  // Round to 4 decimal places (~11 m precision) as the cache key
  const key = `${CACHE_KEYS.REVERSE_GEOCODE}${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = (await cache.get<ReverseGeocodingResult>(key)) as ReverseGeocodingResult | null;
  if (cached) return cached;

  try {
    const url = `${MAPBOX_BASE}/${lng},${lat}.json?access_token=${getToken()}&types=address,place&limit=1`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[geocoding] Mapbox reverse geocode error ${res.status}`);
      return null;
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    // Extract city/state/country from context
    const context: Array<{ id: string; text: string }> = feature.context ?? [];
    const city    = context.find(c => c.id.startsWith('place'))?.text;
    const state   = context.find(c => c.id.startsWith('region'))?.text;
    const country = context.find(c => c.id.startsWith('country'))?.text;

    const result: ReverseGeocodingResult = {
      formattedAddress: feature.place_name as string,
      city,
      state,
      country,
    };

    await cache.set(key, result, CACHE_TTL.GEOCODE);
    return result;
  } catch (err) {
    console.error('[geocoding] Reverse geocode failed:', err);
    return null;
  }
}

/**
 * Helper: geocode an address and return only {lat, lng}, or null.
 * Used when creating/updating a VendorBranch.
 */
export async function getLatLng(
  address: string,
  city: string,
  state: string,
  country: string = 'Nigeria',
): Promise<{ lat: number; lng: number } | null> {
  const fullAddress = `${address}, ${city}, ${state}, ${country}`;
  const result = await geocodeAddress(fullAddress, country);
  if (!result) return null;
  return { lat: result.lat, lng: result.lng };
}
