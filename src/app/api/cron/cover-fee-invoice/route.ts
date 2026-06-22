import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * Monthly Cover-Fee Invoicing Cron
 * Rolls up 'accrued' CoverCharge rows for the previous billing month into
 * an 'invoiced' status and writes a PlatformRevenue row per vendor.
 *
 * Vercel Cron: { "path": "/api/cron/cover-fee-invoice", "schedule": "0 6 1 * *" }
 * (Runs on the 1st of every month at 06:00 UTC)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    const now = new Date();
    // Invoice the previous calendar month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const billingMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // Aggregate per vendor
    const rows = await db.coverCharge.groupBy({
      by: ['vendorId'],
      where: { billingMonth, status: 'accrued' },
      _sum: { feeCharged: true },
      _count: { id: true },
    });

    let invoicedVendors = 0;
    let totalNgn = 0;

    for (const row of rows) {
      const totalFee = row._sum.feeCharged ?? 0;
      if (totalFee <= 0) continue;

      await db.$transaction(async (tx) => {
        await tx.coverCharge.updateMany({
          where: { vendorId: row.vendorId, billingMonth, status: 'accrued' },
          data: { status: 'invoiced', invoicedAt: now },
        });

        await (tx as any).platformRevenue.create({
          data: {
            type: 'cover_fee',
            amountNgn: totalFee,
            sourceType: 'cover_charge_invoice',
            sourceId: `${row.vendorId}:${billingMonth}`,
            vendorId: row.vendorId,
            billingMonth,
          },
        }).catch(() => {/* safe if model not yet available */});
      });

      invoicedVendors++;
      totalNgn += totalFee;
    }

    return successResponse({
      message: 'Cover-fee invoicing complete',
      billingMonth,
      invoicedVendors,
      totalNgn,
    });
  } catch (error) {
    console.error('Cover-fee invoice cron error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Cron failed', 500);
  }
}
