import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getLatLng } from '@/services/geocoding.service';
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

    // If the address changed but no explicit lat/lng provided, re-geocode
    let newLat = data.latitude;
    let newLng = data.longitude;
    const addressChanged = data.address || data.city || data.state;
    if (addressChanged && newLat == null && newLng == null) {
      const resolvedAddress  = data.address ?? branch.address;
      const resolvedCity     = data.city    ?? branch.city;
      const resolvedState    = data.state   ?? branch.state;
      const coords = await getLatLng(resolvedAddress, resolvedCity, resolvedState).catch(() => null);
      if (coords) { newLat = coords.lat; newLng = coords.lng; }
    }

    const updatedBranch = await db.vendorBranch.update({
      where: { id: branch.id },
      data: {
        ...(data.name     && { name:     data.name }),
        ...(data.address  && { address:  data.address }),
        ...(data.city     && { city:     data.city }),
        ...(data.state    && { state:    data.state }),
        ...(data.phone    && { phone:    data.phone }),
        ...(data.email    && { email:    data.email }),
        ...(newLat  != null && { latitude:  newLat }),
        ...(newLng  != null && { longitude: newLng }),
        ...(data.operatingHours          && { operatingHours: data.operatingHours }),
        ...(data.isActive !== undefined  && { isActive: data.isActive }),
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

    // Block deletion while upcoming reservations are tied to this branch, so they're
    // never orphaned. The vendor must reassign/clear them first.
    const upcoming = await db.reservation.count({
      where: { branchId: branch.id, status: { in: ['pending', 'confirmed'] } },
    });
    if (upcoming > 0) {
      return errorResponse(`This branch has ${upcoming} upcoming reservation${upcoming === 1 ? '' : 's'}. Resolve them before deleting.`, 409);
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
