import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { waitlistPosition } from '@/services/waitlist.service';

const joinWaitlistSchema = z.object({
  vendorId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  desiredDate: z.coerce.date(),
  desiredTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  partySize: z.number().int().positive().max(50),
});

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const entries = await db.waitlist.findMany({
      where: {
        userId: payload.sub,
        status: { in: ['waiting', 'notified'] },
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach the guest's live queue position (null once notified/seated).
    const withPosition = await Promise.all(
      entries.map(async (e) => ({ ...e, position: await waitlistPosition(e) }))
    );

    return successResponse(withPosition);
  } catch (error) {
    console.error('Get waitlist error:', error);
    return errorResponse('Failed to get waitlist entries', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = joinWaitlistSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { vendorId, branchId, desiredDate, desiredTime, partySize } = validation.data;

    // Check if vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId, deletedAt: null, verificationStatus: 'approved' },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Check if already on waitlist for same date/time
    const existing = await db.waitlist.findFirst({
      where: {
        userId: payload.sub,
        vendorId,
        desiredDate,
        desiredTime,
        status: { in: ['waiting', 'notified'] },
      },
    });

    if (existing) {
      return errorResponse('Already on waitlist for this slot', 409);
    }

    const entry = await db.waitlist.create({
      data: {
        userId: payload.sub,
        vendorId,
        branchId,
        desiredDate,
        desiredTime,
        partySize,
        status: 'waiting',
      },
      include: {
        vendor: {
          select: {
            businessName: true,
            slug: true,
          },
        },
      },
    });

    return successResponse(entry, 'Added to waitlist. We\'ll notify you if a spot opens up.', undefined, 201);
  } catch (error) {
    console.error('Join waitlist error:', error);
    return errorResponse('Failed to join waitlist', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return validationErrorResponse(['entryId is required']);
    }

    const entry = await db.waitlist.findFirst({
      where: {
        id: entryId,
        userId: payload.sub,
        status: { in: ['waiting', 'notified'] },
      },
    });

    if (!entry) {
      return errorResponse('Waitlist entry not found', 404);
    }

    await db.waitlist.delete({
      where: { id: entryId },
    });

    return successResponse(null, 'Removed from waitlist');
  } catch (error) {
    console.error('Leave waitlist error:', error);
    return errorResponse('Failed to leave waitlist', 500);
  }
}
