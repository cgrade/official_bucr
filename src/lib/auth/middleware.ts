import { NextRequest } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from './jwt';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';
import { isTokenBlacklisted } from '@/services/token.service';
import type { JWTPayload, UserRole } from '@/types';

export async function authenticateRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  // Check if token is blacklisted (logged out)
  if (await isTokenBlacklisted(token)) {
    return null;
  }

  return verifyAccessToken(token);
}

export function withAuth(
  handler: (request: NextRequest, user: JWTPayload) => Promise<Response>,
  allowedRoles?: UserRole[]
) {
  return async (request: NextRequest) => {
    const user = await authenticateRequest(request);

    if (!user) {
      return unauthorizedResponse('Authentication required');
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return forbiddenResponse('Insufficient permissions');
    }

    return handler(request, user);
  };
}

export function withOptionalAuth(
  handler: (request: NextRequest, user: JWTPayload | null) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const user = await authenticateRequest(request);
    return handler(request, user);
  };
}
