import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword, getDummyHash } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/utils/api-response';
import { emailSchema } from '@/lib/utils/validation';
import { applyRateLimit } from '@/lib/middleware/rate-limit';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Throttle brute-force attempts on the vendor login.
    const rateLimited = applyRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, password } = validation.data;

    // ── Staff login path ────────────────────────────────────────────────────
    // Invited staff authenticate against their own VendorStaff password and are
    // scoped to one vendor with a limited role. Checked before the owner path.
    const staff = await db.vendorStaff.findFirst({
      where: { email, status: 'active', deletedAt: null },
      include: {
        vendor: {
          select: {
            id: true, businessName: true, slug: true, verificationStatus: true,
            subscriptionTier: true, subscriptionExpiresAt: true, deletedAt: true,
            branches: { where: { deletedAt: null }, orderBy: { isMainBranch: 'desc' } },
          },
        },
      },
    });
    const staffValid = await verifyPassword(password, staff?.passwordHash ?? (await getDummyHash()));
    if (staff?.passwordHash && staffValid && staff.vendor && !staff.vendor.deletedAt) {
      const accessToken = await signAccessToken({
        sub: staff.id, email: staff.email, role: 'vendor',
        vendorId: staff.vendorId, staffId: staff.id, staffRole: staff.role,
      });
      const refreshToken = await signRefreshToken({
        sub: staff.id, email: staff.email, role: 'vendor',
        vendorId: staff.vendorId, staffId: staff.id, staffRole: staff.role,
      });
      db.vendorStaff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
      return successResponse({
        user: { id: staff.id, email: staff.email, name: staff.name, isStaff: true, staffRole: staff.role },
        vendor: {
          id: staff.vendor.id, businessName: staff.vendor.businessName, slug: staff.vendor.slug,
          verificationStatus: staff.vendor.verificationStatus, subscriptionTier: staff.vendor.subscriptionTier,
          subscriptionExpiresAt: staff.vendor.subscriptionExpiresAt, branches: staff.vendor.branches,
        },
        tokens: { accessToken, refreshToken },
      }, 'Login successful');
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        passwordHash: true,
        status: true,
      },
    });

    // Constant-time: always run a compare, even for a missing account.
    const isValidPassword = await verifyPassword(
      password,
      user?.passwordHash ?? (await getDummyHash()),
    );

    if (!user || !isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

    // Block suspended/banned accounts (checked after auth so it can't be probed).
    if (user.status && user.status !== 'active') {
      return errorResponse('Your account is not active. Please contact support.', 403);
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
