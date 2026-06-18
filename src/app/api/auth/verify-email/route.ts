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
import { sendEmail } from '@/services/email.service';

const sendVerificationSchema = z.object({
  action: z.literal('send'),
});

const verifyEmailSchema = z.object({
  action: z.literal('verify'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const requestSchema = z.union([sendVerificationSchema, verifyEmailSchema]);

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
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (validation.data.action === 'send') {
      // Check if already verified
      if (user.emailVerifiedAt) {
        return errorResponse('Email already verified', 400);
      }

      // Generate verification token
      const { otp } = await createToken({
        userId: user.id,
        type: 'email_verification',
        expiryMinutes: 30,
      });

      // Send verification email
      await sendVerificationEmail({
        to: user.email,
        userName: user.name,
        otp,
      });

      return successResponse(
        { message: 'Verification email sent' },
        'Please check your email for the verification code'
      );
    } else {
      // Verify OTP
      const otpResult = await verifyOtp({
        userId: user.id,
        otp: validation.data.otp,
        type: 'email_verification',
      });

      if (!otpResult.valid) {
        return errorResponse(otpResult.error || 'Invalid or expired code', 400);
      }

      // Mark email as verified
      await db.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });

      return successResponse(
        { emailVerifiedAt: new Date() },
        'Email verified successfully'
      );
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return errorResponse('Failed to process request', 500);
  }
}

async function sendVerificationEmail(params: {
  to: string;
  userName: string;
  otp: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; letter-spacing: 8px; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Hi ${params.userName},</p>
          <p>Thanks for signing up! Please verify your email using the code below:</p>
          
          <div class="code">${params.otp}</div>
          
          <p>This code will expire in <strong>30 minutes</strong>.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Bucr. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: 'Verify Your Bucr Email',
    html,
  });
}
