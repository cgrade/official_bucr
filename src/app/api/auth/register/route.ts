import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { emailSchema, passwordSchema, nameSchema, phoneSchema } from '@/lib/utils/validation';
import { generateBookingReference } from '@/lib/utils/helpers';
import { getOperationalSettings } from '@/lib/config/system-settings';

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema.optional(),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'auth');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, password, name, phone, referralCode } = validation.data;

    // Enforce the admin-configured minimum password length (Settings → General),
    // on top of the base schema's hard floor of 8.
    const { minPasswordLength } = await getOperationalSettings();
    if (password.length < minPasswordLength) {
      return validationErrorResponse([`password: must be at least ${minPasswordLength} characters`]);
    }

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

    // Award referral bonuses — both parties benefit (fire-and-forget, non-blocking)
    if (referredById) {
      import('@/services/credit.service').then(async ({ awardBonus }) => {
        const { config } = await import('@/lib/config');
        // Referrer gets their bonus
        await awardBonus({
          userId: referredById!,
          credits: config.credits.referralBonus,
          referenceType: 'referral',
          referenceId: user.id,
          description: `Referral bonus — ${user.name} joined using your code`,
        });
        // Invitee (new user) also gets a welcome bonus for using a referral code
        await awardBonus({
          userId: user.id,
          credits: config.credits.referralInviteeBonus,
          referenceType: 'referral',
          referenceId: referredById!,
          description: `Welcome bonus for joining via referral`,
        });
      }).catch((err) => console.error('Referral bonus error:', err));
    }

    // Auto-claim any pending gifts addressed to this user's email/phone (fire-and-forget)
    import('@/services/gift.service')
      .then(({ autoClaimGiftsForNewUser }) => autoClaimGiftsForNewUser(user.id))
      .catch(() => {});

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
