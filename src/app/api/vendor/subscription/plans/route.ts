import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { getSubscriptionTiers } from '@/services/subscription.service';

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
        price: 75000,
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
        price: 145000,
        features: [
          'Everything in Basic',
          'Advanced analytics',
          'Custom profile',
          'Priority support',
          'Guest CRM',
        ],
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 250000,
        features: [
          'Everything in Pro',
          'Marketing tools',
          'Featured spots',
          'Advanced CRM',
          'Dedicated account manager',
        ],
      },
    ]);
  }
}
