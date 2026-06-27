import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { captureException } from '@/lib/monitoring/capture';
import { ECONOMICS } from '@/lib/config/economics';
import { notifyVendor } from '@/services/vendor-message.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * Per-Cover Invoicing Cron (run DAILY — Vercel: "0 6 * * *").
 * Three jobs in one pass:
 *   1. ISSUE bi-weekly invoices (on COVER_INVOICE_ANCHOR_DAYS) — roll every unbilled
 *      'accrued' cover charge into one CoverInvoice with a 1-week grace due date.
 *   2. REMIND on unpaid invoices every COVER_INVOICE_REMINDER_HOURS (48h).
 *   3. Mark invoices OVERDUE once past their due date.
 * Revenue is recognised on PAYMENT (see processCompletedPayment), not at issuance.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    const now = new Date();
    const naira = (ngn: number) => `₦${ngn.toLocaleString()}`;
    let issued = 0, reminded = 0, overdue = 0, totalNgn = 0;

    // ── 1. ISSUE invoices on anchor days ────────────────────────────────────
    if (ECONOMICS.COVER_INVOICE_ANCHOR_DAYS.includes(now.getDate())) {
      const rows = await db.coverCharge.groupBy({
        by: ['vendorId'],
        where: { status: 'accrued', invoiceId: null, feeCharged: { gt: 0 } },
        _sum: { feeCharged: true },
        _count: { id: true },
        _min: { createdAt: true },
      });

      for (const row of rows) {
        const amountNgn = row._sum.feeCharged ?? 0;
        if (amountNgn <= 0) continue;
        const dueDate = new Date(now.getTime() + ECONOMICS.COVER_INVOICE_GRACE_DAYS * 86400000);

        await db.$transaction(async (tx) => {
          const invoice = await tx.coverInvoice.create({
            data: {
              vendorId: row.vendorId,
              periodStart: row._min.createdAt ?? now,
              periodEnd: now,
              amountNgn,
              coverCount: row._count.id,
              status: 'pending',
              dueDate,
            },
          });
          await tx.coverCharge.updateMany({
            where: { vendorId: row.vendorId, status: 'accrued', invoiceId: null, feeCharged: { gt: 0 } },
            data: { status: 'invoiced', invoiceId: invoice.id, invoicedAt: now },
          });
        });

        notifyVendor({
          vendorId: row.vendorId,
          category: 'invoice',
          subject: `Per-cover invoice · ${naira(amountNgn)} due ${dueDate.toISOString().split('T')[0]}`,
          body: `Your per-cover success fee for ${row._count.id} seated cover(s) is ${naira(amountNgn)}. Please pay within ${ECONOMICS.COVER_INVOICE_GRACE_DAYS} days from your Billing page. Reminders are sent every ${ECONOMICS.COVER_INVOICE_REMINDER_HOURS} hours until paid.`,
          link: '/billing',
          email: true,
        }).catch((e) => console.error('Invoice notify failed:', e?.message));

        issued++;
        totalNgn += amountNgn;
      }
    }

    // ── 2 & 3. REMINDERS + OVERDUE for unpaid invoices ──────────────────────
    const reminderCutoff = new Date(now.getTime() - ECONOMICS.COVER_INVOICE_REMINDER_HOURS * 3600000);
    const unpaid = await db.coverInvoice.findMany({
      where: { status: { in: ['pending', 'overdue'] } },
      select: { id: true, vendorId: true, amountNgn: true, dueDate: true, lastReminderAt: true, issuedAt: true, status: true },
    });

    for (const inv of unpaid) {
      const isOverdue = now > inv.dueDate;
      if (isOverdue && inv.status !== 'overdue') {
        await db.coverInvoice.update({ where: { id: inv.id }, data: { status: 'overdue' } });
        overdue++;
      }
      const lastTouch = inv.lastReminderAt ?? inv.issuedAt;
      if (lastTouch <= reminderCutoff) {
        await db.coverInvoice.update({ where: { id: inv.id }, data: { lastReminderAt: now } });
        notifyVendor({
          vendorId: inv.vendorId,
          category: 'invoice',
          subject: `${isOverdue ? 'OVERDUE' : 'Reminder'}: per-cover invoice ${naira(inv.amountNgn)}`,
          body: `Your per-cover invoice of ${naira(inv.amountNgn)} is ${isOverdue ? 'now overdue' : `due by ${inv.dueDate.toISOString().split('T')[0]}`}. Pay from your Billing page to keep your account in good standing.`,
          link: '/billing',
          email: true,
        }).catch((e) => console.error('Reminder notify failed:', e?.message));
        reminded++;
      }
    }

    return successResponse({ message: 'Per-cover invoicing pass complete', issued, totalNgn, reminded, overdue });
  } catch (error) {
    captureException(error, { scope: 'cron:cover-fee-invoice' });
    return errorResponse(error instanceof Error ? error.message : 'Cron failed', 500);
  }
}
