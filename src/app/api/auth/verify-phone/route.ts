import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { createToken, verifyOtp } from '@/services/token.service';
import { sendPhoneVerificationSms } from '@/services/sms.service';

const sendVerificationSchema = z.object({
  action: z.literal('send'),
});

const verifyPhoneSchema = z.object({
  action: z.literal('verify'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const requestSchema = z.union([sendVerificationSchema, verifyPhoneSchema]);

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, name: true, phoneVerifiedAt: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (!user.phone) {
      return errorResponse('No phone number on account', 400);
    }

    if (validation.data.action === 'send') {
      // Check if already verified
      if (user.phoneVerifiedAt) {
        return errorResponse('Phone already verified', 400);
      }

      // Generate verification token
      const { otp } = await createToken({
        userId: user.id,
        type: 'phone_verification',
        expiryMinutes: 10,
      });

      // Send verification SMS
      const result = await sendPhoneVerificationSms({
        to: user.phone,
        otp,
      });

      if (!result.success) {
        return errorResponse('Failed to send verification SMS', 500);
      }

      return successResponse(
        { 
          message: 'Verification SMS sent',
          // In development, include OTP for testing
          ...(process.env.NODE_ENV === 'development' && { otp }),
        },
        'Please check your phone for the verification code'
      );
    } else {
      // Verify OTP
      const otpResult = await verifyOtp({
        userId: user.id,
        otp: validation.data.otp,
        type: 'phone_verification',
      });

      if (!otpResult.valid) {
        return errorResponse(otpResult.error || 'Invalid or expired code', 400);
      }

      // Mark phone as verified
      await db.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });

      return successResponse(
        { phoneVerifiedAt: new Date() },
        'Phone number verified successfully'
      );
    }
  } catch (error) {
    console.error('Phone verification error:', error);
    return errorResponse('Failed to process request', 500);
  }
}
