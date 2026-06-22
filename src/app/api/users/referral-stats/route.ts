import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    const [friendsCount, creditsFromReferrals] = await Promise.all([
      // How many users signed up using this user's referral code
      db.user.count({ where: { referredBy: payload.sub, deletedAt: null } }),
      // Total credits earned from referral bonuses
      db.creditTransaction.aggregate({
        where: { userId: payload.sub, referenceType: 'referral', amount: { gt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    return successResponse({
      friendsReferred:   friendsCount,
      creditsEarned:     creditsFromReferrals._sum.amount ?? 0,
      bonusPerReferral:  config.credits.referralBonus,
      inviteeBonus:      config.credits.referralInviteeBonus,
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return errorResponse('Failed to get referral stats', 500);
  }
}
