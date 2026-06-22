import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/utils/api-response';
import { sendEmail } from '@/services/email.service';

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/vendor/team/invite — Send team invitation email
 * Team access management (Pro/Elite feature roadmap)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) return validationErrorResponse(['Invalid email address']);

    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      select: { businessName: true, subscriptionTier: true },
    });
    if (!vendor) return errorResponse('Vendor not found', 404);

    // Team management is a Pro/Elite feature
    if (vendor.subscriptionTier === 'basic') {
      return errorResponse('Team management requires a Pro or Elite subscription', 403);
    }

    await sendEmail({
      to: validation.data.email,
      subject: `You've been invited to join ${vendor.businessName} on Bucr`,
      html: `
        <p>You've been invited to help manage <strong>${vendor.businessName}</strong> on Bucr.</p>
        <p>Sign up at <a href="https://vendor.bucr.ng/register">vendor.bucr.ng/register</a> with this email address to accept the invitation.</p>
        <p>Team management access coming soon.</p>
      `,
      text: `You've been invited to manage ${vendor.businessName} on Bucr. Sign up at vendor.bucr.ng/register.`,
    });

    return successResponse({ email: validation.data.email }, 'Invitation sent successfully');
  } catch (error) {
    console.error('Team invite error:', error);
    return errorResponse('Failed to send invitation', 500);
  }
}
