import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getAdminContext, adminCan } from '@/lib/auth/admin-rbac';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/utils/api-response';

const patchSchema = z.object({
  // 'hide' = false review confirmed → remove from public; 'dismiss' = report unfounded → keep visible
  action: z.enum(['hide', 'restore', 'dismiss']),
});

/** PATCH /api/admin/reviews/[id] — resolve a reported review (support/ops). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'admin') return unauthorizedResponse();
    const me = await getAdminContext(payload);
    if (!adminCan(me, 'reviews.moderate')) return forbiddenResponse('Insufficient permissions for this resource');

    const validation = patchSchema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));
    const { action } = validation.data;

    const review = await db.review.findUnique({ where: { id: params.id } });
    if (!review) return notFoundResponse('Review');

    const data =
      action === 'hide'      ? { isVisible: false, isReported: false } :   // confirmed false → hide it
      action === 'restore'   ? { isVisible: true, isReported: false } :    // bring back a hidden review
                               { isReported: false };                       // dismiss the report, keep visible

    const updated = await db.review.update({
      where: { id: review.id },
      data,
      select: { id: true, isVisible: true, isReported: true },
    });

    db.auditLog.create({ data: { adminId: me!.id, action: 'update', resource: 'review', resourceId: review.id, metadata: { action } } }).catch(() => {});
    return successResponse(updated, `Review ${action === 'hide' ? 'hidden' : action === 'restore' ? 'restored' : 'report dismissed'}`);
  } catch (error) {
    console.error('Admin moderate review error:', error);
    return errorResponse('Failed to update review', 500);
  }
}
