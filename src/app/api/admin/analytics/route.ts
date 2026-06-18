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
    const period = searchParams.get('period') || '30'; // days
    const daysAgo = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Reservation analytics
    const [
      totalReservations,
      reservationsByStatus,
      noShowRate,
      creditsPurchased,
      creditsForfeited,
      creditsRefunded,
      topVendors,
      userGrowth,
    ] = await Promise.all([
      db.reservation.count({
        where: { createdAt: { gte: startDate } },
      }),
      db.reservation.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      db.reservation.count({
        where: {
          createdAt: { gte: startDate },
          status: 'no_show',
        },
      }),
      db.creditTransaction.aggregate({
        where: {
          createdAt: { gte: startDate },
          type: 'purchase',
        },
        _sum: { amount: true },
      }),
      db.creditTransaction.aggregate({
        where: {
          createdAt: { gte: startDate },
          type: 'forfeit',
        },
        _sum: { amount: true },
      }),
      db.creditTransaction.aggregate({
        where: {
          createdAt: { gte: startDate },
          type: 'refund',
        },
        _sum: { amount: true },
      }),
      db.vendor.findMany({
        where: { deletedAt: null, verificationStatus: 'approved' },
        orderBy: { totalBookings: 'desc' },
        take: 10,
        select: {
          id: true,
          businessName: true,
          totalBookings: true,
          averageRating: true,
          noShowCount: true,
        },
      }),
      db.user.count({
        where: { createdAt: { gte: startDate }, deletedAt: null },
      }),
    ]);

    const noShowRatePercent = totalReservations > 0
      ? Math.round((noShowRate / totalReservations) * 100 * 10) / 10
      : 0;

    // Format status breakdown
    const statusBreakdown: Record<string, number> = {};
    reservationsByStatus.forEach((s) => {
      statusBreakdown[s.status] = s._count;
    });

    // Calculate breakage (forfeited credits as revenue)
    const breakageAmount = Math.abs(creditsForfeited._sum.amount || 0);
    const purchasedAmount = creditsPurchased._sum.amount || 0;
    const breakageRate = purchasedAmount > 0
      ? Math.round((breakageAmount / purchasedAmount) * 100 * 10) / 10
      : 0;

    // Previous period for growth calculation
    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - daysAgo * 2);

    // Get additional stats for admin portal
    const [
      totalUsers, totalVendors, verifiedVendors, totalOrders, totalCredits,
      prevUsers, prevVendors, prevReservations, prevOrders,
      orderAvg, reviewStats, fiveStarCount, respondedReviews,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.vendor.count({ where: { deletedAt: null } }),
      db.vendor.count({ where: { deletedAt: null, verificationStatus: 'approved' } }),
      db.takeoutOrder.count({ where: { createdAt: { gte: startDate } } }),
      db.user.aggregate({ _sum: { creditsBalance: true } }),
      // Previous period counts for growth
      db.user.count({ where: { deletedAt: null, createdAt: { gte: prevStartDate, lt: startDate } } }),
      db.vendor.count({ where: { deletedAt: null, createdAt: { gte: prevStartDate, lt: startDate } } }),
      db.reservation.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      db.takeoutOrder.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
      // Average order value
      db.takeoutOrder.aggregate({ where: { createdAt: { gte: startDate } }, _avg: { total: true } }),
      // Review stats
      db.review.aggregate({ _count: true, _avg: { rating: true } }),
      db.review.count({ where: { rating: 5 } }),
      db.review.count({ where: { vendorResponse: { not: null } } }),
    ]);

    // Growth calculations (% change vs previous period)
    const calcGrowth = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100 * 10) / 10 : current > 0 ? 100 : 0;

    const completedReservations = statusBreakdown['completed'] || 0;
    const completionRate = totalReservations > 0 
      ? Math.round((completedReservations / totalReservations) * 100) 
      : 0;

    const totalReviewCount = reviewStats._count || 0;
    const reviewResponseRate = totalReviewCount > 0
      ? Math.round((respondedReviews / totalReviewCount) * 100)
      : 0;

    return successResponse({
      // Flat format for admin portal compatibility
      totalUsers,
      activeUsers: userGrowth,
      userGrowth: calcGrowth(userGrowth, prevUsers),
      totalVendors,
      verifiedVendors,
      vendorGrowth: calcGrowth(totalVendors, prevVendors > 0 ? prevVendors : totalVendors),
      totalReservations,
      monthlyReservations: totalReservations,
      reservationGrowth: calcGrowth(totalReservations, prevReservations),
      completionRate,
      noShowRate: noShowRatePercent,
      totalOrders,
      monthlyOrders: totalOrders,
      orderGrowth: calcGrowth(totalOrders, prevOrders),
      avgOrderValue: Math.round((orderAvg._avg.total || 0) / 100),
      totalRevenue: purchasedAmount * 100,
      creditsInCirculation: totalCredits._sum.creditsBalance || 0,
      monthlyCredits: purchasedAmount,
      creditRevenue: purchasedAmount * 100,
      avgUserCredits: totalUsers > 0 ? Math.round((totalCredits._sum.creditsBalance || 0) / totalUsers) : 0,
      totalReviews: totalReviewCount,
      avgRating: Math.round((reviewStats._avg.rating || 0) * 10) / 10,
      fiveStarReviews: fiveStarCount,
      responseRate: reviewResponseRate,
      // Nested format preserved
      period: `Last ${daysAgo} days`,
      reservations: {
        total: totalReservations,
        statusBreakdown,
        noShowRate: noShowRatePercent,
      },
      credits: {
        purchased: purchasedAmount,
        purchasedValueNgn: purchasedAmount * 120,
        forfeited: breakageAmount,
        forfeitedValueNgn: breakageAmount * 100,
        refunded: Math.abs(creditsRefunded._sum.amount || 0),
        breakageRate,
      },
      growth: {
        newUsers: userGrowth,
      },
      topVendors,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return errorResponse('Failed to get analytics', 500);
  }
}
