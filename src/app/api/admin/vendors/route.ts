import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const createVendorSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  ownerName: z.string().min(2, 'Owner name is required'),
  ownerEmail: z.string().email('Invalid owner email'),
  ownerPassword: z.string().min(8, 'Password must be at least 8 characters'),
  description: z.string().optional(),
  businessType: z.enum(['restaurant', 'bar', 'cafe', 'lounge', 'hotel', 'club', 'bakery', 'food_truck', 'catering', 'other']).optional(),
  cuisineTypes: z.array(z.string()).optional(),
  subscriptionTier: z.enum(['basic', 'pro', 'premium']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.verificationStatus = status;
    }

    if (tier) {
      where.subscriptionTier = tier;
    }

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          slug: true,
          email: true,
          phone: true,
          logo: true,
          verificationStatus: true,
          subscriptionTier: true,
          subscriptionExpiresAt: true,
          totalBookings: true,
          averageRating: true,
          createdAt: true,
          branches: {
            where: { isMainBranch: true, deletedAt: null },
            select: { city: true, state: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.vendor.count({ where }),
    ]);

    // Transform vendors for admin portal compatibility
    const transformedVendors = vendors.map(vendor => ({
      ...vendor,
      businessEmail: vendor.email,
      city: vendor.branches?.[0]?.city || null,
      state: vendor.branches?.[0]?.state || null,
      isVerified: vendor.verificationStatus === 'approved',
    }));

    return successResponse({
      vendors: transformedVendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get vendors error:', error);
    return errorResponse('Failed to get vendors', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = createVendorSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { businessName, email, phone, ownerName, ownerEmail, ownerPassword, description, businessType, cuisineTypes, subscriptionTier } = validation.data;

    // Check if vendor with this email already exists
    const existingVendor = await db.vendor.findFirst({
      where: { email },
    });

    if (existingVendor) {
      return errorResponse('Vendor with this email already exists', 409);
    }

    // Check if owner user already exists
    const existingOwner = await db.user.findFirst({
      where: { email: ownerEmail },
    });

    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Create owner and vendor in transaction
    const result = await db.$transaction(async (tx) => {
      // Create or use existing owner
      let owner: { id: string; name: string; email: string } | null = existingOwner;
      if (!owner) {
        owner = await tx.user.create({
          data: {
            email: ownerEmail,
            name: ownerName,
            passwordHash,
            referralCode: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          },
        });
      }

      // Create vendor
      const vendor = await tx.vendor.create({
        data: {
          ownerId: owner.id,
          businessName,
          slug: `${slug}-${Date.now().toString(36)}`,
          email,
          phone: phone || '',
          description,
          businessType: businessType || 'restaurant',
          cuisineTypes: cuisineTypes || [],
          subscriptionTier: subscriptionTier || 'basic',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          verificationStatus: 'pending',
        },
      });

      return vendor;
    });

    return successResponse(result, 'Vendor created successfully', undefined, 201);
  } catch (error) {
    console.error('Admin create vendor error:', error);
    return errorResponse('Failed to create vendor', 500);
  }
}
