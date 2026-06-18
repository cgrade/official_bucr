import { SignJWT, jwtVerify } from 'jose';
import { config } from '@/lib/config';
import type { JWTPayload, UserRole } from '@/types';

const secret = new TextEncoder().encode(config.jwt.secret);
const refreshSecret = new TextEncoder().encode(config.jwt.refreshSecret);

export async function signAccessToken(payload: {
  sub: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.accessTokenExpiry)
    .sign(secret);
}

export async function signRefreshToken(payload: {
  sub: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.refreshTokenExpiry)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
