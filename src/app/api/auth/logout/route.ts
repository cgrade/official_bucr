import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { blacklistToken } from '@/services/token.service';
import { extractTokenFromHeader } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    // Get the token from the request
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      // Blacklist the token so it can't be used again
      await blacklistToken(token);
    }

    return successResponse(
      { message: 'Logged out successfully' },
      'You have been logged out'
    );
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, return success for logout
    return successResponse(
      { message: 'Logged out' },
      'Logged out'
    );
  }
}
