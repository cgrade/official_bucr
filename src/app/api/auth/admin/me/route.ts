import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const admin = await db.admin.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return notFoundResponse('Admin');
    }

    // Parse name into first and last name for frontend compatibility
    const nameParts = (admin.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return successResponse({
      id: admin.id,
      email: admin.email,
      firstName,
      lastName,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
      createdAt: admin.createdAt,
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    return unauthorizedResponse();
  }
}
