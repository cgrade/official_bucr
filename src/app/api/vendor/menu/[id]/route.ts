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

const updateMenuItemSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  image: z.string().optional().nullable(), // Can be a path or URL
  availableForDineIn: z.boolean().optional(),
  availableForTakeout: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    const menuItem = await db.menu.findFirst({
      where: { id, vendorId: vendor.id, deletedAt: null },
      include: { category: true },
    });

    if (!menuItem) {
      return errorResponse('Menu item not found', 404);
    }

    return successResponse(menuItem);
  } catch (error) {
    console.error('Get menu item error:', error);
    return errorResponse('Failed to get menu item', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    const existingItem = await db.menu.findFirst({
      where: { id, vendorId: vendor.id, deletedAt: null },
    });

    if (!existingItem) {
      return errorResponse('Menu item not found', 404);
    }

    const body = await request.json();
    const validation = updateMenuItemSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const updatedItem = await db.menu.update({
      where: { id },
      data,
    });

    // Broadcast real-time event
    broadcastEvent('menu:updated', id, vendor.id, updatedItem);

    return successResponse(updatedItem, 'Menu item updated successfully');
  } catch (error) {
    console.error('Update menu item error:', error);
    return errorResponse('Failed to update menu item', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    const existingItem = await db.menu.findFirst({
      where: { id, vendorId: vendor.id, deletedAt: null },
    });

    if (!existingItem) {
      return errorResponse('Menu item not found', 404);
    }

    // Soft delete
    await db.menu.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Broadcast real-time event
    broadcastEvent('menu:deleted', id, vendor.id, { id });

    return successResponse(null, 'Menu item deleted successfully');
  } catch (error) {
    console.error('Delete menu item error:', error);
    return errorResponse('Failed to delete menu item', 500);
  }
}
