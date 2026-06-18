import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const createSpotSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
  packageId: z.string().uuid('Invalid package ID'),
  type: z.enum(['restaurant', 'experience', 'offer']),
  experienceId: z.string().uuid().optional().nullable(),
  offerId: z.string().uuid().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// GET /api/admin/featured/spots - List all featured spots
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const vendorId = searchParams.get('vendorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (type) where.type = type;
    if (activeOnly) {
      where.isActive = true;
      where.endDate = { gte: new Date() };
    }
    if (vendorId) where.vendorId = vendorId;

    const [spots, total] = await Promise.all([
      db.featuredSpot.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              logo: true,
              galleryImages: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
          package: {
            select: { id: true, name: true, type: true, creditsCost: true, durationDays: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.featuredSpot.count({ where }),
    ]);

    return successResponse({
      spots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List featured spots error:', error);
    return errorResponse('Failed to list featured spots', 500);
  }
}

// POST /api/admin/featured/spots - Admin creates a featured spot (free, manual)
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const body = await request.json();
    const validation = createSpotSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { vendorId, packageId, type, experienceId, offerId, startDate, endDate } = validation.data;

    // Validate vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, businessName: true },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Validate package exists and matches type
    const featuredPackage = await db.featuredPackage.findUnique({
      where: { id: packageId },
    });

    if (!featuredPackage) {
      return errorResponse('Featured package not found', 404);
    }

    if (featuredPackage.type !== type) {
      return errorResponse('Package type does not match spot type', 400);
    }

    // For experience/offer types, validate the referenced item exists
    if (type === 'experience' && experienceId) {
      const experience = await db.experience.findFirst({
        where: { id: experienceId, vendorId },
      });
      if (!experience) {
        return errorResponse('Experience not found or does not belong to vendor', 404);
      }
    }

    if (type === 'offer' && offerId) {
      const offer = await db.specialOffer.findFirst({
        where: { id: offerId, vendorId },
      });
      if (!offer) {
        return errorResponse('Special offer not found or does not belong to vendor', 404);
      }
    }

    // Create the featured spot (admin-created, no credits charged)
    const featuredSpot = await db.featuredSpot.create({
      data: {
        vendorId,
        packageId,
        type,
        experienceId: type === 'experience' ? experienceId : null,
        offerId: type === 'offer' ? offerId : null,
        creditsPaid: 0, // Admin-created spots are free
        startDate,
        endDate,
        isActive: true,
        addedByAdmin: true,
        adminId: payload.sub,
      },
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true },
        },
        package: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return successResponse(featuredSpot, 'Featured spot created successfully');
  } catch (error) {
    console.error('Create featured spot error:', error);
    return errorResponse('Failed to create featured spot', 500);
  }
}
