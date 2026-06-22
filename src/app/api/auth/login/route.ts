import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { emailSchema } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, authLimiter } from '@/lib/middleware/rate-limiter';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const POST = withRateLimit(
  withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        passwordHash: true,
        role: true,
        creditsBalance: true,
        referralCode: true,
        avatar: true,
        dietaryRestrictions: true,
        seatingPreferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'user' | 'vendor' | 'admin',
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'user' | 'vendor' | 'admin',
    });

    // Remove password hash from response
    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        creditsBalance: user.creditsBalance,
        referralCode: user.referralCode,
        avatar: user.avatar,
        dietaryRestrictions: user.dietaryRestrictions,
        seatingPreferences: user.seatingPreferences,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    }, 'Login successful');
  }),
  authLimiter
);
