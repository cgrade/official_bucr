import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/utils/api-response';

/** GET /api/vendor/team/accept?token=… — validate an invite token (for the accept page). */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return errorResponse('Missing token', 400);

  const staff = await db.vendorStaff.findFirst({
    where: { inviteToken: token, status: 'pending', deletedAt: null },
    select: { email: true, name: true, role: true, inviteExpiresAt: true, vendor: { select: { businessName: true } } },
  });
  if (!staff || (staff.inviteExpiresAt && staff.inviteExpiresAt < new Date())) {
    return errorResponse('This invitation is invalid or has expired', 400);
  }
  return successResponse({ email: staff.email, name: staff.name, role: staff.role, businessName: staff.vendor.businessName });
}

const acceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number'),
});

/** POST /api/vendor/team/accept — set password + activate the staff account. */
export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const validation = acceptSchema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));
    const { token, name, password } = validation.data;

    const staff = await db.vendorStaff.findFirst({
      where: { inviteToken: token, status: 'pending', deletedAt: null },
    });
    if (!staff || (staff.inviteExpiresAt && staff.inviteExpiresAt < new Date())) {
      return errorResponse('This invitation is invalid or has expired', 400);
    }

    await db.vendorStaff.update({
      where: { id: staff.id },
      data: {
        passwordHash: await hashPassword(password),
        name: name || staff.name,
        status: 'active',
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    return successResponse({ email: staff.email }, 'Invitation accepted — you can now sign in.');
  } catch (error) {
    console.error('Accept invite error:', error);
    return errorResponse('Failed to accept invitation', 500);
  }
}
