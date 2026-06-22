import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { getSubscriptionTiers } from '@/services/subscription.service';
import { ECONOMICS } from '@/lib/config/economics';

// GET /api/vendor/subscription/plans - Get available subscription plans
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const tiers = getSubscriptionTiers();

    return successResponse(tiers);
  } catch (error) {
    console.error('Get subscription plans error:', error);
    return successResponse([
      {
        id: 'basic',
        name: 'Basic',
        price: ECONOMICS.SUBSCRIPTION.basic, // free
        features: [
          'Restaurant listing',
          'Reservation management',
          'Credit integration',
          'Basic analytics',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: ECONOMICS.SUBSCRIPTION.pro, // ₦30,000/mo
        features: [
          'Everything in Basic',
          'Advanced analytics',
          'Custom profile',
          'Priority support',
          'Guest CRM',
          '50% off per-cover fees',
        ],
      },
      {
        id: 'elite',
        name: 'Elite',
        price: ECONOMICS.SUBSCRIPTION.elite, // ₦85,000/mo
        features: [
          'Everything in Pro',
          'Marketing tools',
          'Featured spots',
          'Advanced CRM',
          'Dedicated account manager',
          'Per-cover fees waived',
        ],
      },
    ]);
  }
}
