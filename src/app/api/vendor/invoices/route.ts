import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext } from '@/lib/auth/vendor-context';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/** GET /api/vendor/invoices — the vendor's per-cover invoices + outstanding total. */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');

    const invoices = await db.coverInvoice.findMany({
      where: { vendorId: ctx.vendor.id },
      orderBy: { issuedAt: 'desc' },
      take: 60,
    });

    const outstanding = invoices
      .filter((i) => i.status === 'pending' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.amountNgn, 0);

    return successResponse({ invoices, outstanding });
  } catch (error) {
    console.error('Vendor invoices error:', error);
    return errorResponse('Failed to load invoices', 500);
  }
}
