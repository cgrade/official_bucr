import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import { ECONOMICS } from '@/lib/config/economics';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/**
 * GET /api/vendor/analytics/roi?period=30 — the "BUCR impact" view: the value the deposit
 * system creates for this vendor (show-rate, deposit value put at stake, no-show
 * compensation earned, covers seated). This is the retention/ROI story for the per-cover fee.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'view_analytics')) return forbiddenResponse('Insufficient permissions');

    const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get('period')) || 30));
    const since = new Date(Date.now() - days * 86400000);
    const vendorId = ctx.vendor.id;
    const NGN = ECONOMICS.CREDIT_VALUE_NGN;

    const [byStatus, depositAgg, coversAgg, compAgg] = await Promise.all([
      // Outcome counts over the window
      db.reservation.groupBy({
        by: ['status'],
        where: { vendorId, createdAt: { gte: since } },
        _count: { id: true },
      }),
      // Deposit value put at stake on bookings that were honoured or are still live
      db.reservation.aggregate({
        where: { vendorId, createdAt: { gte: since }, status: { in: ['confirmed', 'checked_in', 'completed'] } },
        _sum: { creditsDeposited: true },
      }),
      // Covers actually seated
      db.reservation.aggregate({
        where: { vendorId, createdAt: { gte: since }, status: { in: ['checked_in', 'completed'] } },
        _sum: { partySize: true },
      }),
      // No-show compensation the vendor earned (the 30% marketing-credit share)
      (db as any).vendorCreditTransaction.aggregate({
        where: {
          type: 'no_show_share',
          createdAt: { gte: since },
          wallet: { vendorId },
        },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const count = (s: string) => byStatus.find((b) => b.status === s)?._count.id ?? 0;
    const showed = count('checked_in') + count('completed');
    const noShow = count('no_show');
    const cancelled = count('cancelled');
    const resolved = showed + noShow; // reservations that reached an arrival outcome
    const showRate = resolved > 0 ? Math.round((showed / resolved) * 1000) / 10 : null;

    const depositsProtectedCredits = depositAgg._sum.creditsDeposited ?? 0;
    const compEarnedCredits = compAgg?._sum?.amount ?? 0;

    return successResponse({
      periodDays: days,
      showed,
      noShow,
      cancelled,
      showRatePct: showRate,
      coversSeated: coversAgg._sum.partySize ?? 0,
      depositsProtected: { credits: depositsProtectedCredits, ngn: depositsProtectedCredits * NGN },
      noShowCompensation: { credits: compEarnedCredits, ngn: compEarnedCredits * NGN },
    });
  } catch (error) {
    console.error('Vendor ROI analytics error:', error);
    return errorResponse('Failed to load impact metrics', 500);
  }
}
