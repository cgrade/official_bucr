import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { emailSchema, passwordSchema, nameSchema, phoneSchema } from '@/lib/utils/validation';
import { generateBookingReference } from '@/lib/utils/helpers';

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema.optional(),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, password, name, phone, referralCode } = validation.data;

    // Check if email already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
        deletedAt: null,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return errorResponse('Email already registered', 409);
      }
      if (phone && existingUser.phone === phone) {
        return errorResponse('Phone number already registered', 409);
      }
    }

    // Validate referral code if provided
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await db.user.findUnique({
        where: { referralCode, deletedAt: null },
      });
      if (!referrer) {
        return errorResponse('Invalid referral code', 400);
      }
      referredById = referrer.id;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique referral code for new user
    const userReferralCode = generateBookingReference().replace('BKR-', 'REF-');

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        referralCode: userReferralCode,
        referredBy: referredById,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        creditsBalance: true,
        referralCode: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: 'user',
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: 'user',
    });

    // Award referral bonus if applicable
    if (referredById) {
      try {
        const { awardBonus } = await import('@/services/credit.service');
        const { config } = await import('@/lib/config');
        
        // Award bonus to referrer
        await awardBonus({
          userId: referredById,
          credits: config.credits.referralBonus,
          referenceType: 'referral',
          referenceId: user.id,
          description: `Referral bonus for inviting ${user.name}`,
        });
      } catch (bonusError) {
        // Log but don't fail registration if bonus fails
        console.error('Failed to award referral bonus:', bonusError);
      }
    }

    return successResponse(
      {
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      'Registration successful',
      undefined,
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}
