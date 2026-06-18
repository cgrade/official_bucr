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

const createPackageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['restaurant', 'experience', 'offer']),
  description: z.string().optional(),
  creditsCost: z.number().int().positive('Credits cost must be positive'),
  durationDays: z.number().int().positive('Duration must be positive'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

// GET /api/admin/featured/packages - List all featured packages
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};
    if (type) where.type = type;
    if (activeOnly) where.isActive = true;

    const packages = await db.featuredPackage.findMany({
      where,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      include: {
        _count: {
          select: { featuredSpots: true },
        },
      },
    });

    return successResponse(packages);
  } catch (error) {
    console.error('List featured packages error:', error);
    return errorResponse('Failed to list featured packages', 500);
  }
}

// POST /api/admin/featured/packages - Create a featured package
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const body = await request.json();
    const validation = createPackageSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { name, type, description, creditsCost, durationDays, isActive, sortOrder } = validation.data;

    const featuredPackage = await db.featuredPackage.create({
      data: {
        name,
        type,
        description,
        creditsCost,
        durationDays,
        isActive,
        sortOrder,
      },
    });

    return successResponse(featuredPackage, 'Featured package created successfully');
  } catch (error) {
    console.error('Create featured package error:', error);
    return errorResponse('Failed to create featured package', 500);
  }
}
