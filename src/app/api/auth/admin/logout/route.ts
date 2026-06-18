import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { blacklistToken } from '@/services/token.service';
import {
  successResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    // Extract token from header and add to blacklist
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await blacklistToken(token);
    }

    return successResponse(null, 'Logged out successfully');
  } catch (error) {
    console.error('Admin logout error:', error);
    return unauthorizedResponse();
  }
}
