import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    if (payload.role === 'admin') {
      const admin = await db.admin.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          permissions: true,
          createdAt: true,
        },
      });

      if (!admin) {
        return notFoundResponse('Admin');
      }

      return successResponse({ type: 'admin', data: admin });
    }

    // For both user and vendor roles
    const user = await db.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        country: true,
        avatar: true,
        creditsBalance: true,
        dietaryRestrictions: true,
        seatingPreferences: true,
        specialOccasions: true,
        referralCode: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return notFoundResponse('User');
    }

    // Derived verification flag — a diner is "verified" with either a verified email or phone.
    const isVerified = !!(user.emailVerifiedAt || user.phoneVerifiedAt);
    (user as any).isVerified = isVerified;

    if (payload.role === 'vendor') {
      const vendor = await db.vendor.findFirst({
        where: { ownerId: user.id, deletedAt: null },
        include: {
          branches: {
            where: { deletedAt: null },
            orderBy: { isMainBranch: 'desc' },
          },
        },
      });

      return successResponse({
        type: 'vendor',
        data: {
          user,
          vendor: vendor
            ? {
                id: vendor.id,
                businessName: vendor.businessName,
                slug: vendor.slug,
                verificationStatus: vendor.verificationStatus,
                subscriptionTier: vendor.subscriptionTier,
                subscriptionExpiresAt: vendor.subscriptionExpiresAt,
                totalBookings: vendor.totalBookings,
                averageRating: vendor.averageRating,
                totalReviews: vendor.totalReviews,
                branches: vendor.branches,
              }
            : null,
        },
      });
    }

    return successResponse({ type: 'user', data: user });
  } catch (error) {
    console.error('Get current user error:', error);
    return unauthorizedResponse();
  }
}
