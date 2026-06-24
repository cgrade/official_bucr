import { db } from '@/lib/db';
import { sendEmail } from './email.service';

export type VendorMessageCategory =
  | 'reservation'
  | 'cancellation'
  | 'invoice'
  | 'broadcast'
  | 'system'
  | 'message';

interface NotifyVendorParams {
  vendorId: string;
  category: VendorMessageCategory;
  subject: string;
  body: string;
  link?: string;
  sentById?: string;
  /** Also send an email (default false — most in-app notifications don't need one). */
  email?: boolean;
}

/**
 * Drop a message into a vendor's message center (the in-portal notification inbox),
 * optionally emailing them too. Fire-and-forget friendly: callers should not block
 * the main response on this (wrap in `.catch()`).
 */
export async function notifyVendor(params: NotifyVendorParams): Promise<void> {
  const { vendorId, category, subject, body, link, sentById, email } = params;

  await db.vendorMessage.create({
    data: { vendorId, category, subject, body, link, sentById },
  });

  if (email) {
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { email: true, businessName: true },
    });
    if (vendor?.email) {
      await sendEmail({
        to: vendor.email,
        subject: `[Bucr] ${subject}`,
        html: `<p>Hi ${vendor.businessName},</p><p>${body.replace(/\n/g, '<br/>')}</p><p style="color:#7a8fa6;font-size:12px">Open your vendor portal message center for details.</p>`,
        text: `${subject}\n\n${body}`,
      }).catch((e) => console.error('notifyVendor email failed:', vendor.email, e?.message));
    }
  }
}
