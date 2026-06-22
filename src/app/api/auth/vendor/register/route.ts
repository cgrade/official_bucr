import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { emailSchema, passwordSchema, nameSchema, phoneSchema } from '@/lib/utils/validation';
import { slugify } from '@/lib/utils/helpers';
import { getOperationalSettings } from '@/lib/config/system-settings';
import { getLatLng } from '@/services/geocoding.service';

const vendorRegisterSchema = z.object({
  // Owner details
  ownerName: nameSchema,
  ownerEmail: emailSchema,
  ownerPhone: phoneSchema,
  password: passwordSchema,

  // Business details
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  description: z.string().optional(),
  businessType: z.enum(['restaurant', 'bar', 'cafe', 'lounge', 'hotel', 'club', 'bakery', 'food_truck', 'catering', 'other']).optional(),
  cuisineTypes: z.array(z.string()).optional(),

  // Diner-facing price level (1=₦ … 4=₦₦₦₦). Defaults to 2 (₦₦) if omitted.
  priceLevel: z.number().int().min(1).max(4).optional(),

  // Main branch details
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2).optional(),
  branchPhone: phoneSchema.optional(),
  branchEmail: emailSchema.optional(),
  // Optional precise coordinates from the map picker; auto-geocoded if omitted.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = vendorRegisterSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      password,
      businessName,
      description,
      businessType,
      cuisineTypes,
      priceLevel,
      address,
      city,
      state,
      country,
      branchPhone,
      branchEmail,
      latitude,
      longitude,
    } = validation.data;

    const branchCountry = country || 'Nigeria';

    // Check if email already exists (as user or vendor)
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email: ownerEmail }, { phone: ownerPhone }],
        deletedAt: null,
      },
    });

    if (existingUser) {
      return errorResponse('Email or phone already registered', 409);
    }

    // Check if business name already exists
    const baseSlug = slugify(businessName);
    let slug = baseSlug;
    let slugCounter = 1;

    while (await db.vendor.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user account for vendor owner
    const user = await db.user.create({
      data: {
        email: ownerEmail,
        phone: ownerPhone,
        passwordHash,
        name: ownerName,
        role: 'vendor',
      },
    });

    // Create vendor with main branch
    // Respect the admin "vendor verification required" setting: when disabled,
    // new vendors are auto-approved instead of starting in 'pending'.
    const { vendorVerificationRequired } = await getOperationalSettings();

    // Geocode the branch so it's on the map + directable from day one. Use the
    // map-picker coordinates if the vendor pinned them, else geocode the address.
    let branchLat = latitude;
    let branchLng = longitude;
    if (branchLat == null || branchLng == null) {
      const coords = await getLatLng(address, city, state, branchCountry).catch(() => null);
      if (coords) { branchLat = coords.lat; branchLng = coords.lng; }
    }

    const vendor = await db.vendor.create({
      data: {
        ownerId: user.id,
        businessName,
        slug,
        description,
        businessType: businessType || 'restaurant',
        cuisineTypes: cuisineTypes || [],
        ...(priceLevel !== undefined && { priceLevel }),
        email: ownerEmail,
        phone: ownerPhone,
        verificationStatus: vendorVerificationRequired ? 'pending' : 'approved',
        branches: {
          create: {
            name: 'Main Branch',
            address,
            city,
            state,
            country: branchCountry,
            latitude: branchLat,
            longitude: branchLng,
            phone: branchPhone || ownerPhone,
            email: branchEmail || ownerEmail,
            isMainBranch: true,
            isActive: true,
          },
        },
      },
      include: {
        branches: true,
      },
    });

    // Generate tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: 'vendor',
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: 'vendor',
    });

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName,
          slug: vendor.slug,
          verificationStatus: vendor.verificationStatus,
          subscriptionTier: vendor.subscriptionTier,
          branches: vendor.branches,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      'Vendor registration successful. Please complete verification.',
      undefined,
      201
    );
  } catch (error) {
    console.error('Vendor registration error:', error);
    return errorResponse('Vendor registration failed', 500);
  }
}
