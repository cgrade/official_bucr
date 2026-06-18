import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30'); // days

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get vendor statistics
    const [
      totalVendors,
      verifiedVendors,
      pendingVendors,
      newVendors,
      vendorsByTier,
      topVendorsByBookings,
      topVendorsByRating,
      pendingDocuments,
    ] = await Promise.all([
      // Total vendors
      db.vendor.count({ where: { deletedAt: null } }),
      // Verified vendors
      db.vendor.count({
        where: { verificationStatus: 'approved', deletedAt: null },
      }),
      // Pending verification
      db.vendor.count({
        where: { verificationStatus: 'pending', deletedAt: null },
      }),
      // New vendors this period
      db.vendor.count({
        where: { createdAt: { gte: startDate }, deletedAt: null },
      }),
      // Vendors by subscription tier
      db.vendor.groupBy({
        by: ['subscriptionTier'],
        where: { deletedAt: null },
        _count: true,
      }),
      // Top vendors by bookings
      db.vendor.findMany({
        where: { verificationStatus: 'approved', deletedAt: null },
        orderBy: { totalBookings: 'desc' },
        take: 10,
        select: {
          id: true,
          businessName: true,
          totalBookings: true,
          averageRating: true,
          subscriptionTier: true,
        },
      }),
      // Top vendors by rating
      db.vendor.findMany({
        where: {
          verificationStatus: 'approved',
          deletedAt: null,
          totalReviews: { gte: 5 }, // At least 5 reviews
        },
        orderBy: { averageRating: 'desc' },
        take: 10,
        select: {
          id: true,
          businessName: true,
          averageRating: true,
          totalReviews: true,
          subscriptionTier: true,
        },
      }),
      // Pending documents count
      db.vendorDocument.count({
        where: { status: 'pending' },
      }),
    ]);

    // Format tier breakdown
    const tierBreakdown: Record<string, number> = {
      basic: 0,
      pro: 0,
      premium: 0,
    };
    vendorsByTier.forEach((item) => {
      tierBreakdown[item.subscriptionTier] = item._count;
    });

    // Calculate tier revenue (estimated monthly)
    const tierPrices = { basic: 75000, pro: 145000, premium: 250000 };
    const estimatedMonthlyRevenue =
      tierBreakdown.basic * tierPrices.basic +
      tierBreakdown.pro * tierPrices.pro +
      tierBreakdown.premium * tierPrices.premium;

    return successResponse({
      summary: {
        totalVendors,
        verifiedVendors,
        pendingVendors,
        newVendors,
        pendingDocuments,
        verificationRate: totalVendors > 0
          ? Math.round((verifiedVendors / totalVendors) * 100)
          : 0,
      },
      tierBreakdown,
      estimatedMonthlyRevenue,
      topVendorsByBookings,
      topVendorsByRating,
      period: `Last ${period} days`,
    });
  } catch (error) {
    console.error('Admin vendor analytics error:', error);
    return errorResponse('Failed to get vendor analytics', 500);
  }
}
