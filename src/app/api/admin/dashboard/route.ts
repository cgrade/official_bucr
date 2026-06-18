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

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalVendors,
      activeVendors,
      pendingVerifications,
      todayReservations,
      todayOrders,
      monthlyReservations,
      monthlyOrders,
      totalOrders,
      totalCreditsInCirculation,
      totalCreditsPurchased,
      recentUsers,
      recentVendors,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.vendor.count({ where: { deletedAt: null } }),
      db.vendor.count({ where: { deletedAt: null, verificationStatus: 'approved' } }),
      db.vendorDocument.count({ where: { status: 'pending' } }),
      db.reservation.count({ where: { createdAt: { gte: startOfToday } } }),
      db.takeoutOrder.count({ where: { createdAt: { gte: startOfToday } } }),
      db.reservation.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.takeoutOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.takeoutOrder.count({ where: {} }),
      db.user.aggregate({ _sum: { creditsBalance: true } }),
      db.creditTransaction.aggregate({
        where: { type: 'purchase' },
        _sum: { amount: true },
      }),
      db.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      db.vendor.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          businessName: true,
          verificationStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const creditsPurchasedTotal = totalCreditsPurchased._sum.amount || 0;
    const totalRevenue = creditsPurchasedTotal * 120; // ₦120 per credit in kobo

    return successResponse({
      // Flat format for admin portal compatibility
      totalUsers,
      activeUsers: totalUsers, // All non-deleted users are considered active
      totalVendors,
      verifiedVendors: activeVendors,
      totalCredits: totalCreditsInCirculation._sum.creditsBalance || 0,
      creditsPurchased: creditsPurchasedTotal * 120, // In kobo (₦120 per credit)
      todayReservations,
      pendingVerifications,
      totalOrders,
      totalRevenue,
      monthlyGrowth: 0, // TODO: Calculate actual growth percentage
      // Original nested format preserved
      overview: {
        totalUsers,
        totalVendors,
        activeVendors,
        pendingVerifications,
      },
      today: {
        reservations: todayReservations,
        orders: todayOrders,
      },
      thisMonth: {
        reservations: monthlyReservations,
        orders: monthlyOrders,
      },
      credits: {
        totalInCirculation: totalCreditsInCirculation._sum.creditsBalance || 0,
        valueNgn: (totalCreditsInCirculation._sum.creditsBalance || 0) * 100,
      },
      recent: {
        users: recentUsers,
        vendors: recentVendors,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return errorResponse('Failed to get dashboard data', 500);
  }
}
