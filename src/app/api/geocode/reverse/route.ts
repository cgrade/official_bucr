/**
 * GET /api/geocode/reverse?lat=...&lng=...
 * Proxy for reverse geocoding — secret token stays server-side.
 */
import { NextRequest } from 'next/server';
import { reverseGeocode } from '@/services/geocoding.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');

  if (isNaN(lat) || isNaN(lng)) return errorResponse('lat and lng are required', 400);

  try {
    const result = await reverseGeocode(lat, lng);
    if (!result) return errorResponse('Location not found', 404);
    return successResponse(result);
  } catch (err) {
    console.error('[/api/geocode/reverse]', err);
    return errorResponse('Reverse geocoding failed', 500);
  }
}
