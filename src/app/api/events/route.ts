import { NextRequest } from 'next/server';
import { getUpcomingEvents, createEvent } from '@/services/event.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

/**
 * GET /api/events - List upcoming events (public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const vendorId = searchParams.get('vendorId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getUpcomingEvents({
      city,
      category,
      vendorId,
      page,
      limit,
    });

    return successResponse(result);
  } catch (error) {
    console.error('Get events error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get events',
      500
    );
  }
}

/**
 * POST /api/events - Create event (vendor only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get vendor for this user
    const vendor = await db.vendor.findFirst({
      where: { ownerId: user.sub },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      endDate,
      location,
      address,
      city,
      capacity,
      ticketPrice,
      images,
      category,
      bundleDiscount,
    } = body;

    if (!title || !date || !location || !capacity || ticketPrice === undefined) {
      return errorResponse('Missing required fields', 400);
    }

    const event = await createEvent({
      vendorId: vendor.id,
      title,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      location,
      address,
      city,
      capacity,
      ticketPrice: Number(ticketPrice),
      images,
      category,
      bundleDiscount,
    });

    return successResponse(event, 'Event created successfully', undefined, 201);
  } catch (error) {
    console.error('Create event error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create event',
      500
    );
  }
}
