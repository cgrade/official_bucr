import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/utils/api-response';
import { emailSchema } from '@/lib/utils/validation';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
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

    // Check if user is a vendor owner
    const vendor = await db.vendor.findFirst({
      where: { ownerId: user.id, deletedAt: null },
      include: {
        branches: {
          where: { deletedAt: null },
          orderBy: { isMainBranch: 'desc' },
        },
      },
    });

    if (!vendor) {
      return errorResponse('No vendor account found for this user', 403);
    }

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: 'vendor',
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: 'vendor',
    });

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName,
          slug: vendor.slug,
          verificationStatus: vendor.verificationStatus,
          subscriptionTier: vendor.subscriptionTier,
          subscriptionExpiresAt: vendor.subscriptionExpiresAt,
          branches: vendor.branches,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Vendor login error:', error);
    return errorResponse('Login failed', 500);
  }
}
