import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { type, start, end } = body;

    const dateFilter: any = {};
    if (start) {
      dateFilter.gte = new Date(start);
    }
    if (end) {
      dateFilter.lte = new Date(end);
    }

    const report: any = { summary: {}, headers: [], rows: [] };

    switch (type) {
      case 'users':
        const [totalUsers, newUsers, activeUsers, usersByDate] = await Promise.all([
          db.user.count({ where: { deletedAt: null } }),
          db.user.count({ 
            where: { 
              deletedAt: null,
              createdAt: Object.keys(dateFilter).length ? dateFilter : undefined,
            } 
          }),
          db.user.count({ 
            where: { 
              deletedAt: null,
              reservations: { some: { createdAt: dateFilter } },
            } 
          }),
          db.user.groupBy({
            by: ['createdAt'],
            where: { 
              deletedAt: null,
              createdAt: Object.keys(dateFilter).length ? dateFilter : undefined,
            },
            _count: true,
          }),
        ]);

        report.summary = { totalUsers, newUsers, activeUsers };
        report.headers = ['Date', 'New Users'];
        report.rows = usersByDate.slice(0, 100).map((row: any) => ({
          date: row.createdAt?.toISOString().split('T')[0],
          count: row._count,
        }));
        break;

      case 'vendors':
        const [totalVendors, verifiedVendors, activeVendors] = await Promise.all([
          db.vendor.count({ where: { deletedAt: null } }),
          db.vendor.count({ where: { deletedAt: null, verificationStatus: 'approved' } }),
          db.vendor.count({ 
            where: { 
              deletedAt: null,
              branches: { some: { reservations: { some: { createdAt: dateFilter } } } },
            } 
          }),
        ]);

        const topVendors = await db.vendor.findMany({
          where: { deletedAt: null },
          select: {
            businessName: true,
            totalBookings: true,
            averageRating: true,
            subscriptionTier: true,
          },
          orderBy: { totalBookings: 'desc' },
          take: 20,
        });

        report.summary = { totalVendors, verifiedVendors, activeVendors };
        report.headers = ['Vendor', 'Bookings', 'Rating', 'Plan'];
        report.rows = topVendors.map((v) => ({
          vendor: v.businessName,
          bookings: v.totalBookings,
          rating: v.averageRating?.toFixed(1) || 'N/A',
          plan: v.subscriptionTier,
        }));
        break;

      case 'reservations':
        const reservationStats = await db.reservation.groupBy({
          by: ['status'],
          _count: true,
          where: {
            createdAt: Object.keys(dateFilter).length ? dateFilter : undefined,
          },
        });

        const totalReservations = reservationStats.reduce((sum, s) => sum + s._count, 0);
        const completedRes = reservationStats.find(s => s.status === 'completed')?._count || 0;
        const noShowRes = reservationStats.find(s => s.status === 'no_show')?._count || 0;

        report.summary = {
          totalReservations,
          completed: completedRes,
          noShow: noShowRes,
          completionRate: totalReservations > 0 ? ((completedRes / totalReservations) * 100).toFixed(1) + '%' : '0%',
        };
        report.headers = ['Status', 'Count', 'Percentage'];
        report.rows = reservationStats.map((s) => ({
          status: s.status,
          count: s._count,
          percentage: ((s._count / totalReservations) * 100).toFixed(1) + '%',
        }));
        break;

      case 'orders':
        const orderStats = await db.takeoutOrder.groupBy({
          by: ['status'],
          _count: true,
          _sum: { total: true },
          where: {
            createdAt: Object.keys(dateFilter).length ? dateFilter : undefined,
          },
        });

        const totalOrders = orderStats.reduce((sum, s) => sum + (typeof s._count === 'number' ? s._count : 0), 0);
        const totalRevenue = orderStats.reduce((sum, s) => sum + (s._sum?.total || 0), 0);

        report.summary = {
          totalOrders,
          totalRevenue,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        };
        report.headers = ['Status', 'Count', 'Revenue'];
        report.rows = orderStats.map((s) => ({
          status: s.status,
          count: s._count,
          revenue: s._sum?.total || 0,
        }));
        break;

      case 'credits':
        const creditStats = await db.creditTransaction.groupBy({
          by: ['type'],
          _count: true,
          _sum: { amount: true },
          where: {
            createdAt: Object.keys(dateFilter).length ? dateFilter : undefined,
          },
        });

        const totalInCirculation = await db.user.aggregate({
          _sum: { creditsBalance: true },
        });

        report.summary = {
          totalInCirculation: totalInCirculation._sum.creditsBalance || 0,
          transactions: creditStats.reduce((sum, s) => sum + s._count, 0),
        };
        report.headers = ['Type', 'Count', 'Total Amount'];
        report.rows = creditStats.map((s) => ({
          type: s.type,
          count: s._count,
          amount: s._sum.amount || 0,
        }));
        break;

      case 'revenue':
        const [creditPurchases, subscriptions] = await Promise.all([
          db.creditTransaction.aggregate({
            _sum: { amount: true },
            _count: true,
            where: {
              type: 'purchase',
              createdAt: Object.keys(dateFilter).length ? dateFilter : undefined,
            },
          }),
          db.vendor.count({
            where: {
              subscriptionTier: { not: 'basic' },
              subscriptionExpiresAt: { gte: new Date() },
            },
          }),
        ]);

        // Estimate subscription revenue (simplified)
        const subRevenue = subscriptions * 75000; // Basic plan average
        const creditRevenue = (creditPurchases._sum.amount || 0) * 100; // ₦100 per credit

        report.summary = {
          creditPurchases: creditPurchases._count,
          creditRevenue,
          activeSubscriptions: subscriptions,
          estimatedSubRevenue: subRevenue,
          totalRevenue: creditRevenue + subRevenue,
        };
        report.headers = ['Revenue Source', 'Amount'];
        report.rows = [
          { source: 'Credit Purchases', amount: creditRevenue },
          { source: 'Subscriptions (Est.)', amount: subRevenue },
        ];
        break;

      default:
        return errorResponse('Invalid report type', 400);
    }

    return successResponse(report);
  } catch (error) {
    console.error('Admin generate report error:', error);
    return errorResponse('Failed to generate report', 500);
  }
}
