import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';
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
        select: { id: true, name: true, email: true, avatar: true, createdAt: true },
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
    // Revenue = credits × purchase price per credit (₦10 × 1.06 spread = ₦10.60/credit)
    const purchasePriceNgn = ECONOMICS.CREDIT_VALUE_NGN * (1 + ECONOMICS.CREDIT_SPREAD);
    const totalRevenue = Math.round(creditsPurchasedTotal * purchasePriceNgn);

    return successResponse({
      totalUsers,
      activeUsers: totalUsers,
      totalVendors,
      verifiedVendors: activeVendors,
      totalCredits: totalCreditsInCirculation._sum.creditsBalance || 0,
      creditsPurchased: Math.round(creditsPurchasedTotal * purchasePriceNgn),
      todayReservations,
      pendingVerifications,
      totalRevenue,
      monthlyGrowth: 0,
      today: { reservations: todayReservations },
      thisMonth: { reservations: monthlyReservations },
      credits: {
        totalInCirculation: totalCreditsInCirculation._sum.creditsBalance || 0,
        valueNgn: (totalCreditsInCirculation._sum.creditsBalance || 0) * ECONOMICS.CREDIT_VALUE_NGN,
      },
      recent: { users: recentUsers, vendors: recentVendors },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return errorResponse('Failed to get dashboard data', 500);
  }
}
