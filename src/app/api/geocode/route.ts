/**
 * GET /api/geocode?address=...
 * Thin proxy so browser clients never call Mapbox directly with the secret token.
 * Only the public Mapbox token goes to the browser (for map display);
 * all geocoding uses MAPBOX_ACCESS_TOKEN (server-side).
 */
import { NextRequest } from 'next/server';
import { geocodeAddress } from '@/services/geocoding.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address?.trim()) return errorResponse('address is required', 400);

  try {
    const result = await geocodeAddress(address.trim());
    if (!result) return errorResponse('Address not found', 404);
    return successResponse(result);
  } catch (err) {
    console.error('[/api/geocode]', err);
    return errorResponse('Geocoding failed', 500);
  }
}
