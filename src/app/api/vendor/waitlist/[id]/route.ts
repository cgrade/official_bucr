import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import { removeWaitlistEntry } from '@/services/waitlist.service';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/** DELETE /api/vendor/waitlist/[id] — remove a party from the waitlist (vendor-side). */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'check_in')) return forbiddenResponse('Insufficient permissions');

    await removeWaitlistEntry(params.id, ctx.vendor.id);
    return successResponse(null, 'Removed from waitlist.');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to remove entry';
    return errorResponse(msg, msg.includes('not found') ? 404 : 500);
  }
}
