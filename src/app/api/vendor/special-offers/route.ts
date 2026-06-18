import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const createOfferSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  image: z.string().optional(),
  videoUrl: z.string().url().optional().nullable(),
  discountType: z.enum(['percentage', 'fixed', 'bogo']).optional(),
  discountValue: z.number().int().positive().optional(),
  terms: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/special-offers
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const offers = await db.specialOffer.findMany({
      where: { vendorId: vendor.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(offers);
  } catch (error) {
    console.error('Get special offers error:', error);
    return errorResponse('Failed to get special offers', 500);
  }
}

// POST /api/vendor/special-offers
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const body = await request.json();
    const validation = createOfferSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors.map(e => e.message));
    }

    const data = validation.data;

    const offer = await db.specialOffer.create({
      data: {
        vendorId: vendor.id,
        title: data.title,
        description: data.description,
        image: data.image,
        videoUrl: data.videoUrl,
        discountType: data.discountType,
        discountValue: data.discountValue,
        terms: data.terms,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: data.isActive,
      },
    });

    return successResponse(offer, 'Special offer created', undefined, 201);
  } catch (error) {
    console.error('Create special offer error:', error);
    return errorResponse('Failed to create special offer', 500);
  }
}
