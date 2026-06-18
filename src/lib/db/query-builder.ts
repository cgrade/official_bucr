/**
 * Query Builder Utilities
 * Optimized Prisma select/where builders to reduce over-fetching
 */

/**
 * Create select object from array of field names
 */
export function createSelectFields(fields: string[]): Record<string, boolean> {
  return fields.reduce((acc, field) => {
    acc[field] = true;
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Optimized select for vendor list (minimal fields for cards)
 */
export function createVendorListSelect() {
  return {
    id: true,
    businessName: true,
    slug: true,
    description: true,
    businessType: true,
    cuisineTypes: true,
    averageRating: true,
    totalReviews: true,
    isFeatured: true,
    verificationStatus: true,
    branches: {
      where: { isMainBranch: true },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
      },
      take: 1,
    },
    gallery: {
      where: { isPrimary: true },
      select: {
        id: true,
        url: true,
        alt: true,
      },
      take: 1,
    },
  };
}

/**
 * Full select for vendor detail page
 */
export function createVendorDetailSelect() {
  return {
    id: true,
    businessName: true,
    slug: true,
    description: true,
    businessType: true,
    cuisineTypes: true,
    averageRating: true,
    totalReviews: true,
    totalBookings: true,
    isFeatured: true,
    verificationStatus: true,
    deliveryEnabled: true,
    deliveryFeeType: true,
    deliveryFlatFee: true,
    deliveryZones: true,
    minDeliveryOrder: true,
    branches: {
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        operatingHours: true,
        isMainBranch: true,
        latitude: true,
        longitude: true,
      },
    },
    gallery: {
      select: {
        id: true,
        url: true,
        alt: true,
        isPrimary: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' as const },
    },
    menu: {
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        isAvailable: true,
        availableForDineIn: true,
        availableForTakeout: true,
        category: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
    reviews: {
      where: { isVisible: true },
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        vendorResponse: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' as const },
      take: 10,
    },
    experiences: {
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        creditsRequired: true,
        capacity: true,
        duration: true,
        availableDays: true,
        startTime: true,
        endTime: true,
        image: true,
      },
    },
  };
}

/**
 * Select for reservation list/detail
 */
export function createReservationSelect() {
  return {
    id: true,
    reference: true,
    date: true,
    time: true,
    partySize: true,
    status: true,
    specialRequests: true,
    creditsDeposited: true,
    qrCode: true,
    checkedInAt: true,
    createdAt: true,
    vendor: {
      select: {
        id: true,
        businessName: true,
        slug: true,
        gallery: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
      },
    },
    branch: {
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
      },
    },
    experience: {
      select: {
        id: true,
        title: true,
        type: true,
      },
    },
  };
}

/**
 * Select for order list/detail
 */
export function createOrderSelect() {
  return {
    id: true,
    orderNumber: true,
    orderType: true,
    status: true,
    subtotal: true,
    deliveryFee: true,
    total: true,
    deliveryAddress: true,
    deliveryCity: true,
    deliveryNotes: true,
    scheduledTime: true,
    paymentConfirmed: true,
    completedAt: true,
    createdAt: true,
    vendor: {
      select: {
        id: true,
        businessName: true,
        slug: true,
      },
    },
    branch: {
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
      },
    },
    items: {
      select: {
        id: true,
        quantity: true,
        price: true,
        notes: true,
        menuItem: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    },
  };
}

/**
 * Select for user profile (excludes sensitive fields)
 */
export function createUserProfileSelect() {
  return {
    id: true,
    email: true,
    name: true,
    phone: true,
    avatar: true,
    creditsBalance: true,
    dietaryRestrictions: true,
    seatingPreferences: true,
    specialOccasions: true,
    referralCode: true,
    emailVerifiedAt: true,
    phoneVerifiedAt: true,
    createdAt: true,
    passwordHash: false,
  };
}

/**
 * Select for admin user list
 */
export function createAdminUserListSelect() {
  return {
    id: true,
    email: true,
    name: true,
    phone: true,
    status: true,
    creditsBalance: true,
    createdAt: true,
    _count: {
      select: {
        reservations: true,
        orders: true,
        reviews: true,
      },
    },
  };
}

interface WhereOptions {
  softDelete?: boolean;
  search?: string;
  searchFields?: string[];
}

/**
 * Build where clause with common filters
 */
export function buildWhereClause(
  filters: Record<string, any>,
  options: WhereOptions = {}
): Record<string, any> {
  const where: Record<string, any> = { ...filters };

  // Add soft delete filter
  if (options.softDelete) {
    where.deletedAt = null;
  }

  // Add search filter
  if (options.search && options.searchFields?.length) {
    where.OR = options.searchFields.map(field => ({
      [field]: { contains: options.search, mode: 'insensitive' },
    }));
  }

  return where;
}

/**
 * Build orderBy from sort params
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Record<string, any> {
  if (!sortBy) {
    return { createdAt: 'desc' };
  }

  // Handle nested field sorting (e.g., 'vendor.name')
  if (sortBy.includes('.')) {
    const [relation, field] = sortBy.split('.');
    return { [relation]: { [field]: sortOrder || 'asc' } };
  }

  return { [sortBy]: sortOrder || 'desc' };
}
