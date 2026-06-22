import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/admin/platform-revenue
 * Returns monthly totals by revenue type for admin dashboards and CSV export.
 * Query params: month=YYYY-MM, type=<PlatformRevenueType>
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const type = searchParams.get('type') as string | undefined;
    const format = searchParams.get('format'); // 'csv'

    const where = {
      ...(month && { billingMonth: month }),
      ...(type && { type: type as any }),
    };

    // Monthly aggregates by type
    const aggregates = await db.platformRevenue.groupBy({
      by: ['billingMonth', 'type'],
      where,
      _sum: { amountNgn: true, amountCredits: true },
      _count: { id: true },
      orderBy: [{ billingMonth: 'desc' }, { type: 'asc' }],
    });

    // Running total for the requested period
    const totals = await db.platformRevenue.aggregate({
      where,
      _sum: { amountNgn: true },
    });

    if (format === 'csv') {
      const header = 'billingMonth,type,count,amountNgn,amountCredits\n';
      const rows = aggregates.map((r) =>
        [r.billingMonth, r.type, r._count.id, r._sum.amountNgn ?? 0, r._sum.amountCredits ?? ''].join(',')
      );
      const csv = header + rows.join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="platform-revenue-${month ?? 'all'}.csv"`,
        },
      });
    }

    return successResponse({
      aggregates,
      totalNgn: totals._sum.amountNgn ?? 0,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to fetch revenue', 500);
  }
}, ['admin']);
