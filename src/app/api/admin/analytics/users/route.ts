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

    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - period * 2);

    // Get user statistics
    const [
      totalUsers,
      newUsers,
      previousPeriodNewUsers,
      activeUsers,
      usersWithCredits,
      topCreditHolders,
      usersByDay,
    ] = await Promise.all([
      // Total users
      db.user.count({ where: { deletedAt: null } }),
      // New users this period
      db.user.count({
        where: { createdAt: { gte: startDate }, deletedAt: null },
      }),
      // New users previous period (for growth comparison)
      db.user.count({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
          deletedAt: null,
        },
      }),
      // Active users (made reservation or order this period)
      db.user.count({
        where: {
          deletedAt: null,
          OR: [
            { reservations: { some: { createdAt: { gte: startDate } } } },
            { orders: { some: { createdAt: { gte: startDate } } } },
          ],
        },
      }),
      // Users with credits > 0
      db.user.count({
        where: { creditsBalance: { gt: 0 }, deletedAt: null },
      }),
      // Top credit holders
      db.user.findMany({
        where: { creditsBalance: { gt: 0 }, deletedAt: null },
        orderBy: { creditsBalance: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          creditsBalance: true,
          createdAt: true,
        },
      }),
      // Users by day for chart
      db.user.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: startDate }, deletedAt: null },
        _count: true,
      }),
    ]);

    // Calculate growth rate
    const growthRate = previousPeriodNewUsers > 0
      ? Math.round(((newUsers - previousPeriodNewUsers) / previousPeriodNewUsers) * 100)
      : newUsers > 0 ? 100 : 0;

    // Get average credits per user
    const avgCredits = await db.user.aggregate({
      where: { deletedAt: null },
      _avg: { creditsBalance: true },
    });

    // Process daily data for chart
    const dailyData: Record<string, number> = {};
    for (let i = 0; i < period; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = 0;
    }

    usersByDay.forEach((item) => {
      const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += item._count;
      }
    });

    return successResponse({
      summary: {
        totalUsers,
        newUsers,
        growthRate,
        activeUsers,
        usersWithCredits,
        avgCreditsPerUser: Math.round(avgCredits._avg.creditsBalance || 0),
      },
      topCreditHolders,
      dailyRegistrations: Object.entries(dailyData).map(([date, count]) => ({
        date,
        count,
      })),
      period: `Last ${period} days`,
    });
  } catch (error) {
    console.error('Admin user analytics error:', error);
    return errorResponse('Failed to get user analytics', 500);
  }
}
