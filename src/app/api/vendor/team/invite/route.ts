import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can, sanitizePermissions, VENDOR_ROLE_PRESETS } from '@/lib/auth/vendor-context';
import { ECONOMICS } from '@/lib/config/economics';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/utils/api-response';
import { sendEmail } from '@/services/email.service';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['manager', 'staff']).default('staff'),
  permissions: z.array(z.string()).optional(),
});

const VENDOR_PORTAL_URL = process.env.VENDOR_PORTAL_URL || 'https://vendor.bucr.ng';

/**
 * POST /api/vendor/team/invite — owner invites a staff member.
 * Creates a pending VendorStaff + one-time invite token and emails an accept link.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();

    const ctx = await getVendorContext(payload);
    if (!ctx) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'manage_staff')) return forbiddenResponse('Only the account owner can manage staff');

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));
    const { email, role } = validation.data;
    const name = validation.data.name || email.split('@')[0];
    // Effective permissions = explicit list (if given) else the role preset, sanitized
    // to the delegatable set (so staff can never exceed the owner's privileges).
    const permissions = sanitizePermissions(validation.data.permissions ?? VENDOR_ROLE_PRESETS[role]);

    // Seat limit by tier: Basic = 0, Pro = 1, Elite = 3 (configurable).
    const tier = ctx.vendor.subscriptionTier as string;
    const seatLimit = ECONOMICS.VENDOR_STAFF_SEATS[tier] ?? 0;
    if (seatLimit === 0) {
      return errorResponse('Team management requires a Pro or Elite subscription', 403);
    }

    const existing = await db.vendorStaff.findFirst({
      where: { vendorId: ctx.vendor.id, email, deletedAt: null },
    });
    if (existing?.status === 'active') {
      return errorResponse('That email is already an active team member', 409);
    }

    // Enforce the seat cap on NEW staff (re-inviting an existing pending row doesn't count).
    if (!existing) {
      const used = await db.vendorStaff.count({ where: { vendorId: ctx.vendor.id, deletedAt: null } });
      if (used >= seatLimit) {
        return errorResponse(`Your ${tier} plan allows ${seatLimit} staff account${seatLimit === 1 ? '' : 's'}. Remove a member or upgrade to add more.`, 403);
      }
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (existing) {
      await db.vendorStaff.update({
        where: { id: existing.id },
        data: { name, role, permissions, status: 'pending', inviteToken, inviteExpiresAt, invitedById: ctx.vendor.ownerId, deletedAt: null },
      });
    } else {
      await db.vendorStaff.create({
        data: { vendorId: ctx.vendor.id, email, name, role, permissions, status: 'pending', inviteToken, inviteExpiresAt, invitedById: ctx.vendor.ownerId },
      });
    }

    const acceptUrl = `${VENDOR_PORTAL_URL}/accept-invite?token=${inviteToken}`;
    sendEmail({
      to: email,
      subject: `You've been invited to join ${ctx.vendor.businessName} on Bucr`,
      html: `
        <p>You've been invited to help manage <strong>${ctx.vendor.businessName}</strong> on Bucr as a <strong>${role}</strong>.</p>
        <p>Set your password and accept the invitation (valid 7 days):</p>
        <p><a href="${acceptUrl}">${acceptUrl}</a></p>
      `,
      text: `You've been invited to manage ${ctx.vendor.businessName} on Bucr as a ${role}. Accept here (valid 7 days): ${acceptUrl}`,
    }).catch((e) => console.error('Invite email failed:', e));

    return successResponse({ email, role }, 'Invitation sent');
  } catch (error) {
    console.error('Team invite error:', error);
    return errorResponse('Failed to send invitation', 500);
  }
}
