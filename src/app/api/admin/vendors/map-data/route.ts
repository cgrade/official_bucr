/**
 * GET /api/admin/vendors/map-data
 * Returns all approved vendor branches that have lat/lng coordinates.
 * Used by the admin-portal overview map (read-only, static markers).
 * Requires admin role.
 */
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const branches = await db.vendorBranch.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        latitude:  { not: null },
        longitude: { not: null },
        vendor: { deletedAt: null, verificationStatus: 'approved' },
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        isMainBranch: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            verificationStatus: true,
            subscriptionTier: true,
            averageRating: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const features = branches.map((b) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [b.longitude!, b.latitude!] },
      properties: {
        branchId:     b.id,
        branchName:   b.name,
        address:      `${b.address}, ${b.city}`,
        isMainBranch: b.isMainBranch,
        vendorId:     b.vendor.id,
        vendorName:   b.vendor.businessName,
        vendorSlug:   b.vendor.slug,
        tier:         b.vendor.subscriptionTier,
        rating:       b.vendor.averageRating,
        status:       b.vendor.verificationStatus,
      },
    }));

    return successResponse({
      type: 'FeatureCollection',
      features,
      total: features.length,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to fetch map data', 500);
  }
}, ['admin']);
