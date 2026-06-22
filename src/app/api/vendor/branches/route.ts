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
} from '@/lib/utils/api-response';

const createBranchSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
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

    const branches = await db.vendorBranch.findMany({
      where: { vendorId: vendor.id, deletedAt: null },
      orderBy: [{ isMainBranch: 'desc' }, { createdAt: 'asc' }],
    });

    return successResponse(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    return errorResponse('Failed to get branches', 500);
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
    const validation = createBranchSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // Check if this is the first branch (make it main)
    const existingBranches = await db.vendorBranch.count({
      where: { vendorId: vendor.id, deletedAt: null },
    });

    // Auto-geocode when lat/lng not supplied — fire-and-forget friendly
    let latitude  = data.latitude;
    let longitude = data.longitude;
    if (latitude == null || longitude == null) {
      const coords = await getLatLng(data.address, data.city, data.state).catch(() => null);
      if (coords) { latitude = coords.lat; longitude = coords.lng; }
    }

    const branch = await db.vendorBranch.create({
      data: {
        vendorId: vendor.id,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        email: data.email,
        latitude,
        longitude,
        operatingHours: data.operatingHours,
        isMainBranch: existingBranches === 0,
        isActive: true,
      },
    });

    return successResponse(branch, 'Branch created successfully', undefined, 201);
  } catch (error) {
    console.error('Create branch error:', error);
    return errorResponse('Failed to create branch', 500);
  }
}
