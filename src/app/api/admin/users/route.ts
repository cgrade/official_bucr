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

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  creditsBalance: z.number().int().min(0).optional(),
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
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          creditsBalance: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              reservations: true,
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    // Transform to include firstName/lastName for frontend compatibility
    const transformedUsers = users.map(user => {
      const nameParts = (user.name || '').split(' ');
      return {
        ...user,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
      };
    });

    return successResponse({
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    return errorResponse('Failed to get users', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { email, name, phone, password, creditsBalance } = validation.data;

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      return errorResponse('User with this email or phone already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        name,
        phone,
        passwordHash,
        creditsBalance: creditsBalance || 0,
        referralCode: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        creditsBalance: true,
        status: true,
        createdAt: true,
      },
    });

    return successResponse(user, 'User created successfully', undefined, 201);
  } catch (error) {
    console.error('Admin create user error:', error);
    return errorResponse('Failed to create user', 500);
  }
}
