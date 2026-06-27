import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { scheduleDowngrade, clearScheduledDowngrade } from '@/services/subscription.service';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/utils/api-response';

const schema = z.object({ tier: z.enum(['basic', 'pro']) });

/**
 * POST /api/vendor/subscription/downgrade { tier } — schedule a downgrade to a lower tier
 * effective at the end of the current paid period (no refund — closed loop). Owner-only.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const vendor = await db.vendor.findFirst({ where: { ownerId: payload.sub, deletedAt: null }, select: { id: true } });
    if (!vendor) return forbiddenResponse('No vendor account found');

    const validation = schema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));

    const { effectiveAt } = await scheduleDowngrade(vendor.id, validation.data.tier);
    return successResponse(
      { scheduledTier: validation.data.tier, effectiveAt },
      `Downgrade to ${validation.data.tier} scheduled for ${effectiveAt.toISOString().split('T')[0]}. You keep your current plan until then.`,
    );
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to schedule downgrade', 400);
  }
}

/** DELETE — cancel a pending scheduled downgrade. */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const vendor = await db.vendor.findFirst({ where: { ownerId: payload.sub, deletedAt: null }, select: { id: true } });
    if (!vendor) return forbiddenResponse('No vendor account found');

    await clearScheduledDowngrade(vendor.id);
    return successResponse(null, 'Scheduled downgrade cancelled — you stay on your current plan.');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to cancel downgrade', 400);
  }
}
