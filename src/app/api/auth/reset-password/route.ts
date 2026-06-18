import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { verifyOtp, invalidateUserTokens } from '@/services/token.service';
import { passwordSchema, emailSchema, phoneSchema } from '@/lib/utils/validation';
import { applyRateLimit } from '@/lib/middleware/rate-limit';

const resetPasswordSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: passwordSchema,
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for password reset
    const rateLimitResponse = applyRateLimit(request, 'passwordReset');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, phone, otp, newPassword } = validation.data;

    // Find user by email or phone
    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!user) {
      return errorResponse('Invalid credentials', 400);
    }

    // Verify OTP
    const otpResult = await verifyOtp({
      userId: user.id,
      otp,
      type: 'password_reset',
    });

    if (!otpResult.valid) {
      return errorResponse(otpResult.error || 'Invalid or expired code', 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all password reset tokens for this user
    await invalidateUserTokens(user.id, 'password_reset');

    return successResponse(
      { message: 'Password reset successful' },
      'Your password has been reset. Please login with your new password.'
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse('Failed to reset password', 500);
  }
}
