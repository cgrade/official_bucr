import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? '+100%' : null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();

    const vendorRecord = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      select: { id: true },
    });
    if (!vendorRecord) return errorResponse('Vendor not found', 404);

    const vendorId = vendorRecord.id;
    const now = new Date();

    // ── Date boundaries ────────────────────────────────────────────────
    const startOfToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday  = new Date(startOfToday);

    const startOfWeek     = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfLastWeek = new Date(startOfToday); startOfLastWeek.setDate(startOfLastWeek.getDate() - 14);

    const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth  = new Date(startOfMonth);

    // ── Parallel DB queries ────────────────────────────────────────────
    const [
      vendor,
      todayRes, yesterdayRes,
      weekRes, lastWeekRes,
      monthRes, lastMonthRes,
      todayOrders, weekOrders, monthOrders,
      totalGuests,
      reviewStats,
      reservationStatus,
      recentReservations,
      recentOrders,
      noShowCount, checkedInCount,
    ] = await Promise.all([
      db.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true, businessName: true, totalBookings: true,
          averageRating: true, totalReviews: true,
          subscriptionTier: true, subscriptionExpiresAt: true,
          verificationStatus: true, reliabilityScore: true, bookWithConfidence: true,
        },
      }),
      // Today vs yesterday
      db.reservation.count({ where: { vendorId, date: { gte: startOfToday } } }),
      db.reservation.count({ where: { vendorId, date: { gte: startOfYesterday, lt: endOfYesterday } } }),
      // This week vs last week
      db.reservation.count({ where: { vendorId, date: { gte: startOfWeek } } }),
      db.reservation.count({ where: { vendorId, date: { gte: startOfLastWeek, lt: startOfWeek } } }),
      // This month vs last month
      db.reservation.count({ where: { vendorId, date: { gte: startOfMonth } } }),
      db.reservation.count({ where: { vendorId, date: { gte: startOfLastMonth, lt: endOfLastMonth } } }),
      // Orders
      db.takeoutOrder.count({ where: { vendorId, createdAt: { gte: startOfToday } } }),
      db.takeoutOrder.count({ where: { vendorId, createdAt: { gte: startOfWeek } } }),
      db.takeoutOrder.count({ where: { vendorId, createdAt: { gte: startOfMonth } } }),
      db.guestProfile.count({ where: { vendorId } }),
      db.review.aggregate({ where: { vendorId }, _avg: { rating: true }, _count: true }),
      // Status breakdown for today
      db.reservation.groupBy({
        by: ['status'],
        where: { vendorId, date: { gte: startOfToday } },
        _count: true,
      }),
      // Recent activity
      db.reservation.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { id: true, name: true } } },
      }),
      db.takeoutOrder.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { id: true, name: true } } },
      }),
      // All-time no-show and check-in counts
      db.reservation.count({ where: { vendorId, status: 'no_show' } }),
      db.reservation.count({ where: { vendorId, status: { in: ['checked_in', 'completed'] } } }),
    ]);

    if (!vendor) return errorResponse('Vendor not found', 404);

    // Status map
    const statusMap = reservationStatus.reduce((acc, r) => {
      acc[r.status] = r._count;
      return acc;
    }, {} as Record<string, number>);

    const totalConfirmed = vendor.totalBookings || 0;
    const checkInRate = totalConfirmed > 0 ? ((checkedInCount / totalConfirmed) * 100).toFixed(1) + '%' : '0%';
    const noShowRate  = totalConfirmed > 0 ? ((noShowCount  / totalConfirmed) * 100).toFixed(1) + '%' : '0%';

    return successResponse({
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        subscriptionTier: vendor.subscriptionTier,
        subscriptionExpiresAt: vendor.subscriptionExpiresAt,
        verificationStatus: vendor.verificationStatus,
        reliabilityScore: vendor.reliabilityScore,
        bookWithConfidence: vendor.bookWithConfidence,
      },
      stats: {
        totalBookings: vendor.totalBookings,
        averageRating: vendor.averageRating,
        totalReviews: vendor.totalReviews || reviewStats._count,
        totalGuests,
        checkInRate,
        noShowRate,
      },
      today: {
        reservations: todayRes,
        orders: todayOrders,
        confirmed:  statusMap['confirmed']  || 0,
        pending:    statusMap['pending']    || 0,
        checkedIn:  statusMap['checked_in'] || 0,
        completed:  statusMap['completed']  || 0,
        cancelled:  statusMap['cancelled']  || 0,
        noShow:     statusMap['no_show']    || 0,
      },
      thisWeek:  { reservations: weekRes,  orders: weekOrders  },
      thisMonth: { reservations: monthRes, orders: monthOrders },
      // Real period-over-period changes (no hardcoded %)
      changes: {
        todayVsYesterday: pctChange(todayRes, yesterdayRes),
        weekVsLastWeek:   pctChange(weekRes,  lastWeekRes),
        monthVsLastMonth: pctChange(monthRes, lastMonthRes),
      },
      recent: {
        reservations: recentReservations.map((r) => ({
          id: r.id, reference: r.reference,
          guestName: r.user?.name || 'Guest',
          date: r.date, time: r.time, partySize: r.partySize,
          status: r.status, createdAt: r.createdAt,
        })),
        orders: recentOrders.map((o) => ({
          id: o.id, reference: o.reference,
          customerName: o.user?.name || 'Guest',
          total: o.total, status: o.status, orderType: o.orderType, createdAt: o.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    return errorResponse('Failed to get dashboard data', 500);
  }
}
