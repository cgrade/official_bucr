import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getAdminContext, adminCan } from '@/lib/auth/admin-rbac';
import { sendEmail } from '@/services/email.service';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/utils/api-response';

const schema = z.object({
  subject: z.string().min(2).max(200),
  body: z.string().min(2).max(5000),
  // Audience: all vendors, or only a subscription tier.
  audience: z.enum(['all', 'basic', 'pro', 'elite']).default('all'),
});

/**
 * POST /api/admin/broadcasts — send a message to vendors. Creates a VendorMessage per
 * recipient (shown in their portal message center) and emails each vendor.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'admin') return unauthorizedResponse();
    const me = await getAdminContext(payload);
    if (!adminCan(me, 'notifications.send')) return forbiddenResponse('Insufficient permissions to send broadcasts');

    const validation = schema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));
    const { subject, body, audience } = validation.data;

    const vendors = await db.vendor.findMany({
      where: {
        deletedAt: null,
        // Broadcast to every active vendor (incl. onboarding) — only filter by tier
        // when a specific tier audience is chosen. Don't silently exclude un-approved.
        ...(audience !== 'all' ? { subscriptionTier: audience as any } : {}),
      },
      select: { id: true, email: true, businessName: true },
    });

    if (vendors.length === 0) return errorResponse('No vendors match that audience', 400);

    await db.vendorMessage.createMany({
      data: vendors.map((v) => ({ vendorId: v.id, subject, body, category: 'broadcast', sentById: me!.id })),
    });

    // Email each vendor (fire-and-forget — never block the response).
    for (const v of vendors) {
      if (v.email) {
        sendEmail({
          to: v.email,
          subject: `[Bucr] ${subject}`,
          html: `<p>Hi ${v.businessName},</p><p>${body.replace(/\n/g, '<br/>')}</p><p>— The Bucr Team</p><p style="color:#7a8fa6;font-size:12px">You can also read this in your vendor portal message center.</p>`,
          text: `${subject}\n\n${body}\n\n— The Bucr Team`,
        }).catch((e) => console.error('Broadcast email failed:', v.email, e?.message));
      }
    }

    db.auditLog.create({ data: { adminId: me!.id, action: 'create', resource: 'broadcast', metadata: { subject, audience, recipients: vendors.length } } }).catch(() => {});
    return successResponse({ recipients: vendors.length }, `Broadcast sent to ${vendors.length} vendor${vendors.length === 1 ? '' : 's'}`);
  } catch (error) {
    console.error('Broadcast error:', error);
    return errorResponse('Failed to send broadcast', 500);
  }
}
