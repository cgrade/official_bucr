import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

// GET /api/experiences - Public endpoint for listing experiences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const featured = searchParams.get('featured') === 'true';
    const vendorId = searchParams.get('vendorId');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    // For featured, get experiences from premium/featured vendors
    if (featured) {
      where.vendor = {
        deletedAt: null,
        verificationStatus: 'approved',
        OR: [
          { isFeatured: true },
          { subscriptionTier: 'premium' },
        ],
      };
    }

    const [experiences, total] = await Promise.all([
      db.experience.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              logo: true,
              branches: {
                where: { isMainBranch: true, deletedAt: null },
                select: {
                  city: true,
                  address: true,
                },
                take: 1,
              },
            },
          },
        },
      }),
      db.experience.count({ where }),
    ]);

    const formattedExperiences = experiences.map((exp) => ({
      id: exp.id,
      title: exp.title,
      description: exp.description,
      type: exp.type,
      creditsRequired: exp.creditsRequired,
      capacity: exp.capacity,
      duration: exp.duration,
      availableDays: exp.availableDays,
      startTime: exp.startTime,
      endTime: exp.endTime,
      images: exp.images,
      vendor: {
        id: exp.vendor.id,
        businessName: exp.vendor.businessName,
        slug: exp.vendor.slug,
        logo: exp.vendor.logo,
        location: exp.vendor.branches[0]?.city || null,
      },
    }));

    return successResponse(formattedExperiences, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get experiences error:', error);
    return errorResponse('Failed to get experiences', 500);
  }
}
