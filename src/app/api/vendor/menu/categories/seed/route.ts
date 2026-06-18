import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

const DEFAULT_CATEGORIES = [
  { name: 'Appetizers', description: 'Small dishes to start your meal', sortOrder: 1 },
  { name: 'Starters', description: 'Light dishes to begin with', sortOrder: 2 },
  { name: 'Soups', description: 'Warm and comforting soups', sortOrder: 3 },
  { name: 'Salads', description: 'Fresh and healthy salads', sortOrder: 4 },
  { name: 'Main Courses', description: 'Hearty main dishes', sortOrder: 5 },
  { name: 'Sides', description: 'Complement your main dish', sortOrder: 6 },
  { name: 'Pasta', description: 'Italian-style pasta dishes', sortOrder: 7 },
  { name: 'Rice Dishes', description: 'Rice-based meals', sortOrder: 8 },
  { name: 'Grills', description: 'Grilled meats and seafood', sortOrder: 9 },
  { name: 'Seafood', description: 'Fresh from the ocean', sortOrder: 10 },
  { name: 'Nigerian Specials', description: 'Traditional Nigerian dishes', sortOrder: 11 },
  { name: 'Desserts', description: 'Sweet treats to end your meal', sortOrder: 12 },
  { name: 'Soft Drinks', description: 'Non-alcoholic beverages', sortOrder: 13 },
  { name: 'Cocktails', description: 'Signature mixed drinks', sortOrder: 14 },
  { name: 'Mocktails', description: 'Non-alcoholic cocktails', sortOrder: 15 },
  { name: 'Wines', description: 'Red, white, and rosé wines', sortOrder: 16 },
  { name: 'Spirits', description: 'Premium spirits and liquors', sortOrder: 17 },
  { name: 'Beers', description: 'Local and imported beers', sortOrder: 18 },
  { name: 'Hot Beverages', description: 'Coffee, tea, and more', sortOrder: 19 },
  { name: 'Fresh Juices', description: 'Freshly squeezed juices', sortOrder: 20 },
];

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// POST /api/vendor/menu/categories/seed - Seed default categories for vendor
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    // Check if vendor already has categories
    const existingCategories = await db.menuCategory.findMany({
      where: { vendorId: vendor.id, isActive: true },
    });

    if (existingCategories.length > 0) {
      return successResponse({
        message: 'Categories already exist',
        categories: existingCategories,
        seeded: false,
      });
    }

    // Create default categories for vendor
    const createdCategories = await db.menuCategory.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        vendorId: vendor.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
      })),
    });

    // Fetch and return the created categories
    const categories = await db.menuCategory.findMany({
      where: { vendorId: vendor.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse({
      message: `Created ${createdCategories.count} default categories`,
      categories,
      seeded: true,
    });
  } catch (error) {
    console.error('Seed categories error:', error);
    return errorResponse('Failed to seed categories', 500);
  }
}

// GET /api/vendor/menu/categories/seed - Get default category list (for reference)
export async function GET() {
  return successResponse({
    defaultCategories: DEFAULT_CATEGORIES,
  });
}
