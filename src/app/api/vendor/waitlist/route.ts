import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/** GET /api/vendor/waitlist?date=YYYY-MM-DD — the vendor's live waitlist queue. */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'view_reservations')) return forbiddenResponse('Insufficient permissions');

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    const now = new Date();
    const entries = await db.waitlist.findMany({
      where: {
        vendorId: ctx.vendor.id,
        // Lazy expiry: a notified hold past its claim window is treated as gone
        // (the daily cleanup cron persists the status flip as a backstop).
        OR: [
          { status: 'waiting' },
          { status: 'notified', claimExpiresAt: { gte: now } },
        ],
        ...(dateStr ? { desiredDate: new Date(dateStr) } : {}),
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' }, // first-come-first-served
    });

    // 1-based position among "waiting" entries (notified/seated don't hold a position).
    let pos = 0;
    const data = entries.map((e) => ({
      ...e,
      position: e.status === 'waiting' ? (pos += 1) : null,
    }));

    return successResponse({ entries: data, waitingCount: pos });
  } catch (error) {
    console.error('Vendor waitlist error:', error);
    return errorResponse('Failed to load waitlist', 500);
  }
}
