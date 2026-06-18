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
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get reservation stats by status
    const statusStats = await db.reservation.groupBy({
      by: ['status'],
      where: {
        vendorId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get daily reservation counts
    const dailyReservations = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(date) as date, COUNT(*) as count
      FROM reservations
      WHERE vendor_id = ${vendorId}
        AND created_at >= ${startDate}
      GROUP BY DATE(date)
      ORDER BY date ASC
    `;

    // Get party size distribution
    const partySizeDistribution = await db.reservation.groupBy({
      by: ['partySize'],
      where: {
        vendorId,
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: { partySize: 'asc' },
    });

    // Get peak hours (by time slot)
    const reservations = await db.reservation.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate },
      },
      select: { time: true },
    });

    const hourCounts: Record<string, number> = {};
    reservations.forEach((r) => {
      const hour = r.time.split(':')[0];
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate totals
    const total = statusStats.reduce((sum, s) => sum + s._count, 0);
    const completed = statusStats.find((s) => s.status === 'completed')?._count || 0;
    const noShow = statusStats.find((s) => s.status === 'no_show')?._count || 0;
    const cancelled = statusStats.find((s) => s.status === 'cancelled')?._count || 0;

    return successResponse({
      period: periodDays,
      summary: {
        total,
        completed,
        noShow,
        cancelled,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
        noShowRate: total > 0 ? ((noShow / total) * 100).toFixed(1) : '0',
        cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0',
      },
      byStatus: statusStats.map((s) => ({
        status: s.status,
        count: s._count,
        percentage: total > 0 ? ((s._count / total) * 100).toFixed(1) : '0',
      })),
      daily: dailyReservations.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      partySizeDistribution: partySizeDistribution.map((p) => ({
        partySize: p.partySize,
        count: p._count,
      })),
      peakHours,
    });
  } catch (error) {
    console.error('Vendor reservation analytics error:', error);
    return errorResponse('Failed to get reservation analytics', 500);
  }
}
