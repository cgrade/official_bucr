import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const purchaseSpotSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  experienceId: z.string().uuid().optional().nullable(),
  offerId: z.string().uuid().optional().nullable(),
});

// GET /api/vendor/featured - Get vendor's featured spots and available packages
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse('Vendor access required');
    }

    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      select: { id: true },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Get vendor's active and past featured spots
    const [activeSpots, pastSpots, availablePackages, wallet] = await Promise.all([
      db.featuredSpot.findMany({
        where: {
          vendorId: vendor.id,
          isActive: true,
          endDate: { gte: new Date() },
        },
        include: {
          package: {
            select: { id: true, name: true, type: true, creditsCost: true, durationDays: true },
          },
        },
        orderBy: { endDate: 'asc' },
      }),
      db.featuredSpot.findMany({
        where: {
          vendorId: vendor.id,
          OR: [
            { isActive: false },
            { endDate: { lt: new Date() } },
          ],
        },
        include: {
          package: {
            select: { id: true, name: true, type: true, creditsCost: true, durationDays: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.featuredPackage.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      }),
      db.vendorWallet.findUnique({
        where: { vendorId: vendor.id },
        select: { balance: true },
      }),
    ]);

    return successResponse({
      activeSpots,
      pastSpots,
      availablePackages,
      walletBalance: wallet?.balance || 0,
    });
  } catch (error) {
    console.error('Get vendor featured error:', error);
    return errorResponse('Failed to get featured data', 500);
  }
}

// POST /api/vendor/featured - Purchase a featured spot with credits
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse('Vendor access required');
    }

    const body = await request.json();
    const validation = purchaseSpotSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { packageId, experienceId, offerId } = validation.data;

    // Get vendor with relations
    const vendor = await (db.vendor as any).findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      include: {
        wallet: true,
        experiences: { where: { isActive: true, deletedAt: null } },
        specialOffers: { where: { isActive: true, deletedAt: null } },
      },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Get the package
    const featuredPackage = await db.featuredPackage.findUnique({
      where: { id: packageId, isActive: true },
    });

    if (!featuredPackage) {
      return errorResponse('Featured package not found or not available', 404);
    }

    // Check wallet balance
    const walletBalance = (vendor as any).wallet?.balance || 0;
    if (walletBalance < featuredPackage.creditsCost) {
      return errorResponse(
        `Insufficient credits. You have ${walletBalance} credits but need ${featuredPackage.creditsCost} credits.`,
        400
      );
    }

    // For experience type, validate the experience
    if (featuredPackage.type === 'experience') {
      if (!experienceId) {
        return errorResponse('Experience ID is required for experience featured spots', 400);
      }
      const experience = (vendor.experiences || []).find((e: any) => e.id === experienceId);
      if (!experience) {
        return errorResponse('Experience not found or not active', 404);
      }
    }

    // For offer type, validate the offer
    if (featuredPackage.type === 'offer') {
      if (!offerId) {
        return errorResponse('Offer ID is required for offer featured spots', 400);
      }
      const offer = (vendor.specialOffers || []).find((o: any) => o.id === offerId);
      if (!offer) {
        return errorResponse('Special offer not found or not active', 404);
      }
    }

    // Check if there's an existing active spot of the same type
    const existingSpot = await db.featuredSpot.findFirst({
      where: {
        vendorId: vendor.id,
        type: featuredPackage.type,
        isActive: true,
        endDate: { gte: new Date() },
        ...(featuredPackage.type === 'experience' && experienceId ? { experienceId } : {}),
        ...(featuredPackage.type === 'offer' && offerId ? { offerId } : {}),
      },
    });

    if (existingSpot) {
      return errorResponse(
        'You already have an active featured spot of this type. Wait for it to expire or contact support.',
        400
      );
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + featuredPackage.durationDays);

    // Create featured spot and deduct credits in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the featured spot
      const featuredSpot = await tx.featuredSpot.create({
        data: {
          vendorId: vendor.id,
          packageId: featuredPackage.id,
          type: featuredPackage.type,
          experienceId: featuredPackage.type === 'experience' ? experienceId : null,
          offerId: featuredPackage.type === 'offer' ? offerId : null,
          creditsPaid: featuredPackage.creditsCost,
          startDate,
          endDate,
          isActive: true,
          addedByAdmin: false,
        },
        include: {
          package: {
            select: { id: true, name: true, type: true, durationDays: true },
          },
        },
      });

      // Deduct credits from vendor wallet
      await tx.vendorWallet.update({
        where: { vendorId: vendor.id },
        data: {
          balance: { decrement: featuredPackage.creditsCost },
        },
      });

      // Create credit transaction record
      await tx.vendorCreditTransaction.create({
        data: {
          walletId: (vendor.wallet as any)!.id,
          type: 'featured_spend',
          amount: -featuredPackage.creditsCost,
          description: `Featured spot purchase: ${featuredPackage.name}`,
          referenceType: 'featured_spot',
          referenceId: featuredSpot.id,
          balanceAfter: (vendor.wallet as any)!.balance - featuredPackage.creditsCost,
        },
      });

      return featuredSpot;
    });

    return successResponse(
      result,
      `Successfully purchased ${featuredPackage.name}! Your ${featuredPackage.type} will be featured for ${featuredPackage.durationDays} days.`
    );
  } catch (error) {
    console.error('Purchase featured spot error:', error);
    return errorResponse('Failed to purchase featured spot', 500);
  }
}
