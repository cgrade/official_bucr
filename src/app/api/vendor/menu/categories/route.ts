import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/menu/categories - Get all menu categories
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

    const categories = await db.menuCategory.findMany({
      where: { vendorId: vendor.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true,
        _count: {
          select: { items: true },
        },
      },
    });

    return successResponse(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        itemCount: cat._count.items,
      }))
    );
  } catch (error) {
    console.error('Get menu categories error:', error);
    return errorResponse('Failed to get menu categories', 500);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

// POST /api/vendor/menu/categories - Create a new menu category
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
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const category = await db.menuCategory.create({
      data: {
        vendorId: vendor.id,
        name: validation.data.name,
        description: validation.data.description,
        sortOrder: validation.data.sortOrder,
      },
    });

    return successResponse(category, 'Category created successfully', undefined, 201);
  } catch (error) {
    console.error('Create menu category error:', error);
    return errorResponse('Failed to create category', 500);
  }
}
