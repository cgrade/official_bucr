import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { createToken } from '@/services/token.service';
import { sendEmail } from '@/services/email.service';
import { sendPasswordResetSms } from '@/services/sms.service';
import { emailSchema, phoneSchema } from '@/lib/utils/validation';
import { applyRateLimit } from '@/lib/middleware/rate-limit';

const forgotPasswordSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for password reset
    const rateLimitResponse = applyRateLimit(request, 'passwordReset');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, phone } = validation.data;

    // Find user by email or phone
    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
        deletedAt: null,
      },
      select: { id: true, email: true, phone: true, name: true },
    });

    // Always return success to prevent user enumeration
    if (!user) {
      return successResponse(
        { message: 'If an account exists, a reset code has been sent' },
        'Password reset initiated'
      );
    }

    // Generate reset token and OTP
    const { token, otp } = await createToken({
      userId: user.id,
      type: 'password_reset',
      expiryMinutes: 10,
    });

    // Send reset code via email or SMS
    if (email && user.email) {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        otp,
        token,
      });
    } else if (phone && user.phone) {
      await sendPasswordResetSms({
        to: user.phone,
        otp,
      });
    }

    return successResponse(
      { 
        message: 'If an account exists, a reset code has been sent',
        // In development, include token for testing
        ...(process.env.NODE_ENV === 'development' && { token, otp }),
      },
      'Password reset initiated'
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse('Failed to process request', 500);
  }
}

async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  otp: string;
  token: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .code { font-size: 32px; font-weight: bold; color: #dc2626; text-align: center; letter-spacing: 8px; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>Hi ${params.userName},</p>
          <p>We received a request to reset your password. Use the code below to reset it:</p>
          
          <div class="code">${params.otp}</div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          
          <div class="warning">
            <p><strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
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
    subject: 'Reset Your Bucr Password',
    html,
  });
}
