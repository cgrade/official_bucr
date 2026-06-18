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
import { broadcastEvent } from '@/lib/realtime';

const createMenuItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().int().min(0).default(0),
  image: z.string().optional(), // Can be a path like /uploads/menu/... or a full URL
  isAvailable: z.boolean().default(true),
  availableForDineIn: z.boolean().default(true),
  availableForTakeout: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

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

    const [categories, uncategorizedItems] = await Promise.all([
      db.menuCategory.findMany({
        where: { vendorId: vendor.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      db.menu.findMany({
        where: { vendorId: vendor.id, categoryId: null, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return successResponse({
      categories,
      uncategorizedItems,
    });
  } catch (error) {
    console.error('Get menu error:', error);
    return errorResponse('Failed to get menu', 500);
  }
}

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

    // Check if creating a category or menu item
    if (body.type === 'category') {
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
    }

    // Create menu item
    const validation = createMenuItemSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // Verify category belongs to vendor if provided
    if (data.categoryId) {
      const category = await db.menuCategory.findFirst({
        where: { id: data.categoryId, vendorId: vendor.id },
      });

      if (!category) {
        return errorResponse('Category not found', 404);
      }
    }

    const menuItem = await db.menu.create({
      data: {
        vendorId: vendor.id,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        image: data.image,
        isAvailable: data.isAvailable,
        availableForDineIn: data.availableForDineIn,
        availableForTakeout: data.availableForTakeout,
        sortOrder: data.sortOrder,
      },
    });

    // Broadcast real-time event
    broadcastEvent('menu:created', menuItem.id, vendor.id, menuItem);

    return successResponse(menuItem, 'Menu item created successfully', undefined, 201);
  } catch (error) {
    console.error('Create menu item error:', error);
    return errorResponse('Failed to create menu item', 500);
  }
}
