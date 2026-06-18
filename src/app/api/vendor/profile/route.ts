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

const updateVendorSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().optional(),
  businessType: z.enum(['restaurant', 'bar', 'cafe', 'lounge', 'hotel', 'club', 'bakery', 'food_truck', 'catering', 'other']).optional(),
  cuisineTypes: z.array(z.string()).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional().nullable(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().regex(/^\d{10}$/).optional(),
  bankAccountName: z.string().optional(),
  paystackLink: z.string().url().optional().nullable(),
  deliveryEnabled: z.boolean().optional(),
  deliveryFeeType: z.enum(['flat', 'zone_based']).optional(),
  deliveryFlatFee: z.number().int().positive().optional(),
  deliveryZones: z.array(z.object({
    name: z.string(),
    minDistanceKm: z.number(),
    maxDistanceKm: z.number(),
    fee: z.number().int().positive(),
  })).optional(),
  minDeliveryOrder: z.number().int().positive().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
    include: {
      branches: { where: { deletedAt: null } },
      documents: true,
    },
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

    return successResponse({
      id: vendor.id,
      businessName: vendor.businessName,
      slug: vendor.slug,
      description: vendor.description,
      logo: vendor.logo,
      businessType: vendor.businessType,
      cuisineTypes: vendor.cuisineTypes,
      email: vendor.email,
      phone: vendor.phone,
      website: vendor.website,
      subscriptionTier: vendor.subscriptionTier,
      subscriptionExpiresAt: vendor.subscriptionExpiresAt,
      verificationStatus: vendor.verificationStatus,
      bankName: vendor.bankName,
      bankAccountNumber: vendor.bankAccountNumber,
      bankAccountName: vendor.bankAccountName,
      paystackLink: vendor.paystackLink,
      deliveryEnabled: vendor.deliveryEnabled,
      deliveryFeeType: vendor.deliveryFeeType,
      deliveryFlatFee: vendor.deliveryFlatFee,
      deliveryZones: vendor.deliveryZones,
      minDeliveryOrder: vendor.minDeliveryOrder,
      totalBookings: vendor.totalBookings,
      noShowCount: vendor.noShowCount,
      averageRating: vendor.averageRating,
      totalReviews: vendor.totalReviews,
      branches: vendor.branches,
      documents: vendor.documents.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        isRequired: d.isRequired,
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt,
      })),
      createdAt: vendor.createdAt,
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    return errorResponse('Failed to get vendor profile', 500);
  }
}

export async function PATCH(request: NextRequest) {
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
    const validation = updateVendorSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const updatedVendor = await db.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(data.businessName && { businessName: data.businessName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.businessType && { businessType: data.businessType }),
        ...(data.cuisineTypes && { cuisineTypes: data.cuisineTypes }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.bankName && { bankName: data.bankName }),
        ...(data.bankAccountNumber && { bankAccountNumber: data.bankAccountNumber }),
        ...(data.bankAccountName && { bankAccountName: data.bankAccountName }),
        ...(data.paystackLink !== undefined && { paystackLink: data.paystackLink }),
        ...(data.deliveryEnabled !== undefined && { deliveryEnabled: data.deliveryEnabled }),
        ...(data.deliveryFeeType && { deliveryFeeType: data.deliveryFeeType }),
        ...(data.deliveryFlatFee && { deliveryFlatFee: data.deliveryFlatFee }),
        ...(data.deliveryZones && { deliveryZones: data.deliveryZones }),
        ...(data.minDeliveryOrder && { minDeliveryOrder: data.minDeliveryOrder }),
      },
    });

    // Broadcast real-time event
    broadcastEvent('profile:updated', vendor.id, vendor.id, updatedVendor);

    return successResponse(updatedVendor, 'Profile updated successfully');
  } catch (error) {
    console.error('Update vendor profile error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}
