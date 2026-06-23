import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = refreshSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { refreshToken } = validation.data;

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);

    if (!payload) {
      return unauthorizedResponse('Invalid or expired refresh token');
    }

    // ── Vendor-staff refresh ──────────────────────────────────────────────
    // Staff tokens aren't backed by a User row; re-issue scoped staff tokens and
    // re-check the staff is still active (so removal/disable takes effect on refresh).
    if (payload.staffId && payload.vendorId) {
      const staff = await db.vendorStaff.findFirst({
        where: { id: payload.staffId, vendorId: payload.vendorId, status: 'active', deletedAt: null },
        select: { id: true, email: true, vendorId: true, role: true },
      });
      if (!staff) return unauthorizedResponse('Staff account not found or disabled');
      const claims = {
        sub: staff.id, email: staff.email, role: 'vendor' as const,
        vendorId: staff.vendorId, staffId: staff.id, staffRole: staff.role,
      };
      return successResponse({
        tokens: { accessToken: await signAccessToken(claims), refreshToken: await signRefreshToken(claims) },
      });
    }

    // Check if user still exists and is active
    // For admin tokens, check admin table; for user/vendor tokens, check user table
    let userId: string;
    let userEmail: string;
    let userRole: 'user' | 'vendor' | 'admin';

    if (payload.role === 'admin') {
      const admin = await db.admin.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true },
      });
      if (!admin) return unauthorizedResponse('Admin not found');
      userId = admin.id;
      userEmail = admin.email;
      userRole = 'admin';
    } else {
      const user = await db.user.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, role: true },
      });
      if (!user) return unauthorizedResponse('User not found');
      userId = user.id;
      userEmail = user.email;
      userRole = user.role as 'user' | 'vendor' | 'admin';
    }

    // Generate new tokens
    const newAccessToken = await signAccessToken({
      sub: userId,
      email: userEmail,
      role: userRole,
    });

    const newRefreshToken = await signRefreshToken({
      sub: userId,
      email: userEmail,
      role: userRole,
    });

    return successResponse({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return errorResponse('Token refresh failed', 500);
  }
}
