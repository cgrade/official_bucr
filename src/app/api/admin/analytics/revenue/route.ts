import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { config } from '@/lib/config';
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

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - period * 2);

    // Get revenue statistics
    const [
      creditsPurchased,
      previousCreditsPurchased,
      subscriptionPayments,
      previousSubscriptionPayments,
      creditsForfeited,
      creditsRefunded,
      paymentsByPurpose,
      dailyRevenue,
    ] = await Promise.all([
      // Credits purchased this period
      db.payment.aggregate({
        where: {
          status: 'completed',
          purpose: 'credit_purchase',
          createdAt: { gte: startDate },
        },
        _sum: { amountKobo: true },
        _count: true,
      }),
      // Credits purchased previous period
      db.payment.aggregate({
        where: {
          status: 'completed',
          purpose: 'credit_purchase',
          createdAt: { gte: previousStartDate, lt: startDate },
        },
        _sum: { amountKobo: true },
      }),
      // Subscription payments this period
      db.payment.aggregate({
        where: {
          status: 'completed',
          purpose: 'subscription',
          createdAt: { gte: startDate },
        },
        _sum: { amountKobo: true },
        _count: true,
      }),
      // Subscription payments previous period
      db.payment.aggregate({
        where: {
          status: 'completed',
          purpose: 'subscription',
          createdAt: { gte: previousStartDate, lt: startDate },
        },
        _sum: { amountKobo: true },
      }),
      // Credits forfeited (breakage revenue)
      db.creditTransaction.aggregate({
        where: {
          type: 'forfeit',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      // Credits refunded
      db.creditTransaction.aggregate({
        where: {
          type: 'refund',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      // Payments by purpose
      db.payment.groupBy({
        by: ['purpose'],
        where: {
          status: 'completed',
          createdAt: { gte: startDate },
        },
        _sum: { amountKobo: true },
        _count: true,
      }),
      // Daily revenue for chart
      db.payment.groupBy({
        by: ['createdAt'],
        where: {
          status: 'completed',
          createdAt: { gte: startDate },
        },
        _sum: { amountKobo: true },
      }),
    ]);

    const creditRevenueKobo = creditsPurchased._sum.amountKobo || 0;
    const subscriptionRevenueKobo = subscriptionPayments._sum.amountKobo || 0;
    const totalRevenueKobo = creditRevenueKobo + subscriptionRevenueKobo;

    const previousCreditRevenueKobo = previousCreditsPurchased._sum.amountKobo || 0;
    const previousSubscriptionRevenueKobo = previousSubscriptionPayments._sum.amountKobo || 0;
    const previousTotalRevenueKobo = previousCreditRevenueKobo + previousSubscriptionRevenueKobo;

    // Calculate growth
    const revenueGrowth = previousTotalRevenueKobo > 0
      ? Math.round(((totalRevenueKobo - previousTotalRevenueKobo) / previousTotalRevenueKobo) * 100)
      : totalRevenueKobo > 0 ? 100 : 0;

    // Calculate breakage revenue (forfeited credits * credit value)
    const forfeitedCredits = Math.abs(creditsForfeited._sum.amount || 0);
    const breakageRevenueKobo = forfeitedCredits * config.credits.valueNgn * 100;
    const refundedCredits = Math.abs(creditsRefunded._sum.amount || 0);

    // Process daily data for chart
    const dailyData: Record<string, number> = {};
    for (let i = 0; i < period; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = 0;
    }

    dailyRevenue.forEach((item) => {
      const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += (item._sum.amountKobo || 0) / 100;
      }
    });

    return successResponse({
      summary: {
        totalRevenueNgn: totalRevenueKobo / 100,
        creditRevenueNgn: creditRevenueKobo / 100,
        subscriptionRevenueNgn: subscriptionRevenueKobo / 100,
        breakageRevenueNgn: breakageRevenueKobo / 100,
        revenueGrowth,
        creditTransactions: creditsPurchased._count,
        subscriptionTransactions: subscriptionPayments._count,
      },
      breakage: {
        forfeitedCredits,
        forfeitedValueNgn: forfeitedCredits * config.credits.valueNgn,
        refundedCredits,
        refundedValueNgn: refundedCredits * config.credits.valueNgn,
        breakageRate: (forfeitedCredits + refundedCredits) > 0
          ? Math.round((forfeitedCredits / (forfeitedCredits + refundedCredits)) * 100)
          : 0,
      },
      byPurpose: paymentsByPurpose.map((item) => ({
        purpose: item.purpose,
        totalNgn: (item._sum.amountKobo || 0) / 100,
        count: item._count,
      })),
      dailyRevenue: Object.entries(dailyData).map(([date, amount]) => ({
        date,
        amountNgn: amount,
      })),
      period: `Last ${period} days`,
    });
  } catch (error) {
    console.error('Admin revenue analytics error:', error);
    return errorResponse('Failed to get revenue analytics', 500);
  }
}
