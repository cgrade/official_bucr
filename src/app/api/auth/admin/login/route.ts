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

    // Find admin by email
    const admin = await db.admin.findUnique({
      where: { email, deletedAt: null },
    });

    if (!admin) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.passwordHash);

    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: admin.id,
      email: admin.email,
      role: 'admin',
    });

    const refreshToken = await signRefreshToken({
      sub: admin.id,
      email: admin.email,
      role: 'admin',
    });

    // Parse name into firstName/lastName for frontend compatibility
    const nameParts = (admin.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return successResponse(
      {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName,
          lastName,
          role: admin.role,
          permissions: admin.permissions || [],
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      'Admin login successful'
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return errorResponse('Login failed', 500);
  }
}
