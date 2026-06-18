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

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const userId = payload.sub;
    
    // Get the vendor for this user (owner)
    const vendorRecord = await db.vendor.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });

    if (!vendorRecord) {
      return errorResponse('Vendor not found', 404);
    }

    const vendorId = vendorRecord.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      vendor,
      todayReservations,
      weekReservations,
      monthReservations,
      todayOrders,
      weekOrders,
      monthOrders,
      totalGuests,
      reviewStats,
      recentReservations,
      recentOrders,
    ] = await Promise.all([
      db.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          businessName: true,
          totalBookings: true,
          averageRating: true,
          totalReviews: true,
          subscriptionTier: true,
          subscriptionExpiresAt: true,
          verificationStatus: true,
        },
      }),
      db.reservation.count({
        where: { vendorId, date: { gte: startOfToday } },
      }),
      db.reservation.count({
        where: { vendorId, date: { gte: startOfWeek } },
      }),
      db.reservation.count({
        where: { vendorId, date: { gte: startOfMonth } },
      }),
      db.takeoutOrder.count({
        where: { vendorId, createdAt: { gte: startOfToday } },
      }),
      db.takeoutOrder.count({
        where: { vendorId, createdAt: { gte: startOfWeek } },
      }),
      db.takeoutOrder.count({
        where: { vendorId, createdAt: { gte: startOfMonth } },
      }),
      db.guestProfile.count({
        where: { vendorId },
      }),
      db.review.aggregate({
        where: { vendorId },
        _avg: { rating: true },
        _count: true,
      }),
      db.reservation.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      db.takeoutOrder.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Calculate reservation status breakdown for today
    const reservationStatusBreakdown = await db.reservation.groupBy({
      by: ['status'],
      where: { vendorId, date: { gte: startOfToday } },
      _count: true,
    });

    const statusMap = reservationStatusBreakdown.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return successResponse({
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        subscriptionTier: vendor.subscriptionTier,
        subscriptionExpiresAt: vendor.subscriptionExpiresAt,
        verificationStatus: vendor.verificationStatus,
      },
      stats: {
        totalBookings: vendor.totalBookings,
        averageRating: vendor.averageRating,
        totalReviews: vendor.totalReviews || reviewStats._count,
        totalGuests,
      },
      today: {
        reservations: todayReservations,
        orders: todayOrders,
        confirmed: statusMap['confirmed'] || 0,
        pending: statusMap['pending'] || 0,
        checkedIn: statusMap['checked_in'] || 0,
        completed: statusMap['completed'] || 0,
        cancelled: statusMap['cancelled'] || 0,
        noShow: statusMap['no_show'] || 0,
      },
      thisWeek: {
        reservations: weekReservations,
        orders: weekOrders,
      },
      thisMonth: {
        reservations: monthReservations,
        orders: monthOrders,
      },
      recent: {
        reservations: recentReservations.map((r) => ({
          id: r.id,
          reference: r.reference,
          guestName: r.user?.name || 'Guest',
          date: r.date,
          time: r.time,
          partySize: r.partySize,
          status: r.status,
          createdAt: r.createdAt,
        })),
        orders: recentOrders.map((o) => ({
          id: o.id,
          reference: o.reference,
          customerName: o.user?.name || 'Guest',
          total: o.total,
          status: o.status,
          orderType: o.orderType,
          createdAt: o.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    return errorResponse('Failed to get dashboard data', 500);
  }
}
