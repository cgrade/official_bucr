import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

// GET /api/featured - Get all active featured items (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // restaurant, experience, offer
    const limit = parseInt(searchParams.get('limit') || '10');

    const now = new Date();

    const where: any = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    if (type && ['restaurant', 'experience', 'offer'].includes(type)) {
      where.type = type;
    }

    const featuredSpots = await db.featuredSpot.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
            cuisineTypes: true,
            averageRating: true,
            totalReviews: true,
            galleryImages: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
              select: { url: true },
            },
            branches: {
              where: { isMainBranch: true, isActive: true },
              take: 1,
              select: { city: true, address: true },
            },
            experiences: {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                title: true,
                description: true,
                creditsRequired: true,
                images: true,
                duration: true,
                capacity: true,
                type: true,
              },
            },
            specialOffers: {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                discountType: true,
                discountValue: true,
                validFrom: true,
                validUntil: true,
              },
            },
          },
        },
        package: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });

    // Transform data for easier frontend consumption
    const featuredRestaurants = featuredSpots
      .filter((spot) => spot.type === 'restaurant')
      .map((spot) => ({
        id: spot.id,
        vendor: {
          id: spot.vendor.id,
          businessName: spot.vendor.businessName,
          slug: spot.vendor.slug,
          logo: spot.vendor.logo,
          coverImage: spot.vendor.galleryImages[0]?.url || spot.vendor.logo,
          cuisineTypes: spot.vendor.cuisineTypes,
          averageRating: spot.vendor.averageRating,
          totalReviews: spot.vendor.totalReviews,
          mainBranch: spot.vendor.branches[0] || null,
        },
        startDate: spot.startDate,
        endDate: spot.endDate,
      }));

    const featuredExperiences = featuredSpots
      .filter((spot) => spot.type === 'experience')
      .map((spot) => {
        const experience = spot.experienceId
          ? spot.vendor.experiences.find((e) => e.id === spot.experienceId)
          : spot.vendor.experiences[0];
        return {
          id: spot.id,
          vendor: {
            id: spot.vendor.id,
            businessName: spot.vendor.businessName,
            slug: spot.vendor.slug,
            logo: spot.vendor.logo,
          },
          experience: experience || null,
          startDate: spot.startDate,
          endDate: spot.endDate,
        };
      })
      .filter((item) => item.experience);

    const featuredOffers = featuredSpots
      .filter((spot) => spot.type === 'offer')
      .map((spot) => {
        const offer = spot.offerId
          ? spot.vendor.specialOffers.find((o) => o.id === spot.offerId)
          : spot.vendor.specialOffers[0];
        return {
          id: spot.id,
          vendor: {
            id: spot.vendor.id,
            businessName: spot.vendor.businessName,
            slug: spot.vendor.slug,
            logo: spot.vendor.logo,
          },
          offer: offer || null,
          startDate: spot.startDate,
          endDate: spot.endDate,
        };
      })
      .filter((item) => item.offer);

    return successResponse({
      featuredRestaurants,
      featuredExperiences,
      featuredOffers,
    });
  } catch (error) {
    console.error('Get featured items error:', error);
    return errorResponse('Failed to get featured items', 500);
  }
}
