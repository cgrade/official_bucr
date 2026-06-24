import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext } from '@/lib/auth/vendor-context';
import { initializePayment } from '@/services/payment.service';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/utils/api-response';

/**
 * POST /api/vendor/invoices/[id]/pay — start a Paystack payment for a per-cover invoice.
 * Money flows TO Bucr only (no settlement out), preserving the closed-loop posture.
 * Owner-only (paying bills is not a delegatable staff capability).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');
    if (!ctx.isOwner) return forbiddenResponse('Only the account owner can pay invoices');

    const invoice = await db.coverInvoice.findFirst({ where: { id: params.id, vendorId: ctx.vendor.id } });
    if (!invoice) return notFoundResponse('Invoice');
    if (invoice.status === 'paid') return errorResponse('Invoice already paid', 400);
    if (invoice.amountNgn <= 0) return errorResponse('Nothing to pay on this invoice', 400);

    const vendor = await db.vendor.findUnique({ where: { id: ctx.vendor.id }, select: { email: true } });
    if (!vendor?.email) return errorResponse('No billing email on file', 400);

    let callbackUrl: string | undefined;
    try {
      const body = await request.json();
      if (body?.callbackUrl) callbackUrl = String(body.callbackUrl);
    } catch { /* no body is fine */ }

    const result = await initializePayment({
      vendorId: ctx.vendor.id,
      purpose: 'cover_fee',
      amountKobo: invoice.amountNgn * 100,
      email: vendor.email,
      callbackUrl,
      metadata: { invoiceId: invoice.id, type: 'cover_invoice' },
    });

    return successResponse({
      authorizationUrl: result.authorizationUrl,
      reference: result.payment.reference,
      amountNgn: invoice.amountNgn,
    });
  } catch (error) {
    console.error('Invoice pay error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Failed to start payment', 500);
  }
}
