import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext } from '@/lib/auth/vendor-context';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/utils/api-response';

/** PATCH /api/vendor/messages/[id] — mark a message read. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');

    const msg = await db.vendorMessage.findFirst({ where: { id: params.id, vendorId: ctx.vendor.id } });
    if (!msg) return notFoundResponse('Message');

    await db.vendorMessage.update({ where: { id: msg.id }, data: { isRead: true, readAt: new Date() } });
    return successResponse({ id: msg.id }, 'Marked read');
  } catch (error) {
    console.error('Mark message read error:', error);
    return errorResponse('Failed to update message', 500);
  }
}
