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
  notFoundResponse,
} from '@/lib/utils/api-response';

const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/).optional(),
  email: z.string().email().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  operatingHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string(),
    closeTime: z.string(),
    isClosed: z.boolean().default(false),
  })).optional(),
  isActive: z.boolean().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { branchId: string } }
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

    const branch = await db.vendorBranch.findFirst({
      where: {
        id: params.branchId,
        vendorId: vendor.id,
        deletedAt: null,
      },
    });

    if (!branch) {
      return notFoundResponse('Branch');
    }

    return successResponse(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    return errorResponse('Failed to get branch', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { branchId: string } }
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

    const branch = await db.vendorBranch.findFirst({
      where: {
        id: params.branchId,
        vendorId: vendor.id,
        deletedAt: null,
      },
    });

    if (!branch) {
      return notFoundResponse('Branch');
    }

    const body = await request.json();
    const validation = updateBranchSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const updatedBranch = await db.vendorBranch.update({
      where: { id: branch.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.phone && { phone: data.phone }),
        ...(data.email && { email: data.email }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.operatingHours && { operatingHours: data.operatingHours }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return successResponse(updatedBranch, 'Branch updated successfully');
  } catch (error) {
    console.error('Update branch error:', error);
    return errorResponse('Failed to update branch', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { branchId: string } }
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

    const branch = await db.vendorBranch.findFirst({
      where: {
        id: params.branchId,
        vendorId: vendor.id,
        deletedAt: null,
      },
    });

    if (!branch) {
      return notFoundResponse('Branch');
    }

    if (branch.isMainBranch) {
      return errorResponse('Cannot delete main branch', 400);
    }

    // Soft delete
    await db.vendorBranch.update({
      where: { id: branch.id },
      data: { deletedAt: new Date() },
    });

    return successResponse(null, 'Branch deleted successfully');
  } catch (error) {
    console.error('Delete branch error:', error);
    return errorResponse('Failed to delete branch', 500);
  }
}
