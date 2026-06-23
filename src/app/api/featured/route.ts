import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { ECONOMICS } from '@/lib/config/economics';

// GET /api/featured - Get all active featured items (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // restaurant, experience, offer
    const requested = parseInt(searchParams.get('limit') || '10');
    // Scarcity: never show more than the carousel cap per type, and rotate
    // exposure fairly (least-shown first).
    const cap = Math.max(1, Math.min(requested, ECONOMICS.FEATURED_CAROUSEL_MAX));

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
      // Fair rotation: least-shown spots surface first, so exposure is shared
      // when more spots are sold than there are slots.
      orderBy: [{ impressions: 'asc' }, { createdAt: 'desc' }],
      take: ECONOMICS.FEATURED_CAROUSEL_MAX * 4,
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
      }))
      .slice(0, cap);

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
      .filter((item) => item.experience)
      .slice(0, cap);

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
      .filter((item) => item.offer)
      .slice(0, cap);

    // NB: impressions are NOT counted here. Serving an ad ≠ a viewable
    // impression. The client reports genuinely-viewable cards (≥50% on-screen
    // for ≥1s) to POST /api/featured/impressions, which dedups per viewer —
    // matching the MRC/IAB viewable-impression standard.

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
