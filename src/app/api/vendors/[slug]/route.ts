import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    // context=dineIn|takeout — filters menu to the relevant channel
    const context = searchParams.get('context') as 'dineIn' | 'takeout' | null;

    const now = new Date();

    // Base menu availability filter: permanently available AND not temporarily 86'd
    const menuAvailableWhere = {
      deletedAt: null,
      isAvailable: true,
      OR: [
        { unavailableUntil: null },
        { unavailableUntil: { lt: now } }, // 86 window has passed
      ],
      // Channel filter when context is provided
      ...(context === 'dineIn'  && { availableForDineIn: true }),
      ...(context === 'takeout' && { availableForTakeout: true }),
    };

    const [vendor, reviewStats] = await Promise.all([
      (db.vendor as any).findFirst({
        where: { slug, deletedAt: null, verificationStatus: 'approved' },
        include: {
          branches: {
            where: { deletedAt: null, isActive: true },
            orderBy: { isMainBranch: 'desc' },
          },
          galleryImages: {
            orderBy: { sortOrder: 'asc' },
          },
          menuCategories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              items: {
                where: menuAvailableWhere,
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          menus: {
            where: { ...menuAvailableWhere, categoryId: null },
            orderBy: { sortOrder: 'asc' },
          },
          experiences: {
            where: { deletedAt: null, isActive: true },
          },
          specialOffers: {
            where: { deletedAt: null, isActive: true },
            orderBy: { createdAt: 'desc' },
          },
          achievements: {
            orderBy: { earnedAt: 'desc' },
          },
          reviews: {
            where: { isVisible: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
      }),
      // Compute rating and review count live from the reviews table — never trust stored seed values
      db.review.aggregate({
        where: {
          vendor: { slug },
          isVisible: true,
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    // Overwrite stored values with live-computed figures
    if (vendor) {
      const liveAvg   = reviewStats._avg.rating;
      const liveCount = reviewStats._count.id;
      vendor.averageRating = liveAvg !== null ? Math.round(liveAvg * 10) / 10 : null;
      vendor.totalReviews  = liveCount;
      // Persist back so list queries stay consistent (fire-and-forget)
      db.vendor.update({
        where: { id: vendor.id },
        data: {
          averageRating: vendor.averageRating,
          totalReviews:  vendor.totalReviews,
        },
      }).catch(() => {});
    }

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    // Format menu items - hide prices for dine-in view
    const menuCategories = vendor.menuCategories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      items: cat.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        availableForDineIn: item.availableForDineIn,
        availableForTakeout: item.availableForTakeout,
        // Price only shown for takeout-available items
        price: item.availableForTakeout ? item.price : null,
      })),
    }));

    // Add uncategorized items as a separate category if they exist
    const uncategorizedItems = vendor.menus || [];
    if (uncategorizedItems.length > 0) {
      menuCategories.push({
        id: 'uncategorized',
        name: 'Other Items',
        description: null,
        items: uncategorizedItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          image: item.image,
          availableForDineIn: item.availableForDineIn,
          availableForTakeout: item.availableForTakeout,
          price: item.availableForTakeout ? item.price : null,
        })),
      });
    }

    // Respect vendor display settings
    const showMenu = (vendor as any).showMenu ?? true;
    const showGallery = (vendor as any).showGallery ?? true;
    const showExperiences = (vendor as any).showExperiences ?? true;
    const showAchievements = (vendor as any).showAchievements ?? true;
    const showReviews = (vendor as any).showReviews ?? true;
    const showSpecialOffers = (vendor as any).showSpecialOffers ?? true;
    const promoEnabled = (vendor as any).promoEnabled ?? false;
    const promoMessage = (vendor as any).promoMessage ?? null;

    // Get cover image - first gallery image or logo as fallback
    const coverImage = vendor.galleryImages?.[0]?.url || vendor.logo || null;

    return successResponse({
      id: vendor.id,
      businessName: vendor.businessName,
      slug: vendor.slug,
      description: vendor.description,
      logo: vendor.logo,
      coverImage,
      cuisineTypes: vendor.cuisineTypes,
      averageRating: vendor.averageRating,
      totalReviews: vendor.totalReviews,
      verificationStatus: vendor.verificationStatus,
      subscriptionTier: vendor.subscriptionTier,
      venueType: vendor.venueType,
      priceLevel: (vendor as any).priceLevel ?? null,
      customDepositCredits: (vendor as any).customDepositCredits ?? null,
      reliabilityScore: vendor.reliabilityScore,
      bookWithConfidence: vendor.bookWithConfidence,
      deliveryEnabled: vendor.deliveryEnabled,
      deliveryFeeType: vendor.deliveryFeeType,
      deliveryFlatFee: vendor.deliveryFlatFee,
      deliveryZones: vendor.deliveryZones,
      minDeliveryOrder: vendor.minDeliveryOrder,
      // Display settings
      displaySettings: {
        showMenu,
        showGallery,
        showExperiences,
        showAchievements,
        showReviews,
        showSpecialOffers,
        promoEnabled,
        promoMessage,
      },
      branches: vendor.branches.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        city: b.city,
        state: b.state,
        phone: b.phone,
        latitude: b.latitude,
        longitude: b.longitude,
        operatingHours: b.operatingHours,
        isMainBranch: b.isMainBranch,
      })),
      gallery: showGallery ? vendor.galleryImages.map((img: any) => ({
        id: img.id,
        url: img.url,
        caption: img.caption,
        category: img.category,
      })) : [],
      menu: showMenu ? menuCategories : [],
      experiences: showExperiences ? vendor.experiences.map((exp: any) => ({
        id: exp.id,
        title: exp.title,
        description: exp.description,
        type: exp.type,
        creditsRequired: exp.creditsRequired,
        capacity: exp.capacity,
        duration: exp.duration,
        images: exp.images,
      })) : [],
      achievements: showAchievements ? vendor.achievements.map((ach: any) => ({
        id: ach.id,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        badgeType: ach.badgeType,
        earnedAt: ach.earnedAt,
      })) : [],
      specialOffers: showSpecialOffers ? (vendor.specialOffers || []).map((offer: any) => ({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        image: offer.image,
        videoUrl: offer.videoUrl,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        terms: offer.terms,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil,
      })) : [],
      reviews: showReviews ? vendor.reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        vendorResponse: r.vendorResponse,
        createdAt: r.createdAt,
        user: r.user,
      })) : [],
      // Payment details for takeout checkout
      paymentDetails: vendor.deliveryEnabled || vendor.menuCategories.some(
        (c: any) => c.items.some((i: any) => i.availableForTakeout)
      )
        ? {
            bankName: vendor.bankName,
            bankAccountNumber: vendor.bankAccountNumber,
            bankAccountName: vendor.bankAccountName,
            paystackLink: vendor.paystackLink,
          }
        : null,
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    return errorResponse('Failed to get vendor', 500);
  }
}
