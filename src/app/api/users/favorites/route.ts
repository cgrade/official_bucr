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

const addFavoriteSchema = z.object({
  vendorId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      db.favorite.findMany({
        where: { userId: payload.sub },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              description: true,
              cuisineTypes: true,
              averageRating: true,
              totalReviews: true,
              verificationStatus: true,
              branches: {
                where: { isMainBranch: true, deletedAt: null },
                select: {
                  address: true,
                  city: true,
                  state: true,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.favorite.count({ where: { userId: payload.sub } }),
    ]);

    return successResponse(
      favorites.map((f: typeof favorites[number]) => ({
        id: f.id,
        vendor: f.vendor,
        addedAt: f.createdAt,
      })),
      undefined,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get favorites error:', error);
    return errorResponse('Failed to get favorites', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = addFavoriteSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { vendorId } = validation.data;

    // Check if vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId, deletedAt: null },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Check if already favorited
    const existing = await db.favorite.findUnique({
      where: {
        userId_vendorId: {
          userId: payload.sub,
          vendorId,
        },
      },
    });

    if (existing) {
      return errorResponse('Vendor already in favorites', 409);
    }

    const favorite = await db.favorite.create({
      data: {
        userId: payload.sub,
        vendorId,
      },
    });

    return successResponse(favorite, 'Added to favorites', undefined, 201);
  } catch (error) {
    console.error('Add favorite error:', error);
    return errorResponse('Failed to add favorite', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return validationErrorResponse(['vendorId is required']);
    }

    const favorite = await db.favorite.findUnique({
      where: {
        userId_vendorId: {
          userId: payload.sub,
          vendorId,
        },
      },
    });

    if (!favorite) {
      return errorResponse('Favorite not found', 404);
    }

    await db.favorite.delete({
      where: { id: favorite.id },
    });

    return successResponse(null, 'Removed from favorites');
  } catch (error) {
    console.error('Remove favorite error:', error);
    return errorResponse('Failed to remove favorite', 500);
  }
}
