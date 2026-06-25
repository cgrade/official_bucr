import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import { seatWaitlistEntry } from '@/services/waitlist.service';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/** POST /api/vendor/waitlist/[id]/seat — mark a waitlist party as seated. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'check_in')) return forbiddenResponse('Insufficient permissions');

    const entry = await seatWaitlistEntry(params.id, ctx.vendor.id);
    return successResponse(entry, 'Guest seated.');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to seat guest';
    return errorResponse(msg, msg.includes('not found') ? 404 : 500);
  }
}
