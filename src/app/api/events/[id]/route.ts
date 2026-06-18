import { NextRequest } from 'next/server';
import { getEventById, updateEvent, publishEvent, cancelEvent } from '@/services/event.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';

/**
 * GET /api/events/[id] - Get event details (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEventById(params.id);

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    return successResponse(event);
  } catch (error) {
    console.error('Get event error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get event',
      500
    );
  }
}

/**
 * PATCH /api/events/[id] - Update event (vendor only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Verify vendor owns this event
    const event = await getEventById(params.id);
    if (!event) {
      return errorResponse('Event not found', 404);
    }

    const vendor = await db.vendor.findFirst({
      where: { ownerId: user.sub },
    });

    if (!vendor || vendor.id !== event.vendorId) {
      return errorResponse('Not authorized to update this event', 403);
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    // Handle special actions
    if (action === 'publish') {
      const published = await publishEvent(params.id);
      return successResponse(published);
    }

    if (action === 'cancel') {
      const cancelled = await cancelEvent(params.id, body.reason);
      return successResponse(cancelled);
    }

    // Regular update
    const updated = await updateEvent(params.id, updateData);
    return successResponse(updated);
  } catch (error) {
    console.error('Update event error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update event',
      500
    );
  }
}
