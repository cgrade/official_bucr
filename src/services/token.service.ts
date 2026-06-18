import { db } from '@/lib/db';
import crypto from 'crypto';
import { tokenBlacklist as redisBlacklist } from '@/lib/cache';

// Token types
export type TokenType = 'password_reset' | 'email_verification' | 'phone_verification';

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric OTP
 */
export function generateOtp(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Create a verification token (DB-backed, survives restarts)
 */
export async function createToken(params: {
  userId: string;
  type: TokenType;
  expiryMinutes?: number;
}): Promise<{ token: string; otp: string }> {
  const { userId, type, expiryMinutes = 10 } = params;

  const token = generateSecureToken();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Invalidate any existing tokens of this type for this user
  await db.verificationToken.deleteMany({
    where: { userId, type },
  });

  // Store token + OTP in a single DB row
  await db.verificationToken.create({
    data: { token, userId, type, otp, expiresAt, attempts: 0 },
  });

  return { token, otp };
}

/**
 * Verify a token
 */
export async function verifyToken(params: {
  token: string;
  type: TokenType;
}): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const { token, type } = params;

  const stored = await db.verificationToken.findUnique({ where: { token } });

  if (!stored) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  if (stored.type !== type) {
    return { valid: false, error: 'Invalid token type' };
  }

  if (stored.expiresAt < new Date()) {
    await db.verificationToken.delete({ where: { id: stored.id } });
    return { valid: false, error: 'Token has expired' };
  }

  return { valid: true, userId: stored.userId };
}

/**
 * Verify OTP for a user
 */
export async function verifyOtp(params: {
  userId: string;
  otp: string;
  type: TokenType;
}): Promise<{ valid: boolean; error?: string }> {
  const { userId, otp, type } = params;

  const stored = await db.verificationToken.findFirst({
    where: { userId, type },
    orderBy: { createdAt: 'desc' },
  });

  if (!stored) {
    return { valid: false, error: 'Invalid or expired OTP' };
  }

  if (stored.expiresAt < new Date()) {
    await db.verificationToken.delete({ where: { id: stored.id } });
    return { valid: false, error: 'OTP has expired' };
  }

  if (stored.attempts >= 3) {
    await db.verificationToken.delete({ where: { id: stored.id } });
    return { valid: false, error: 'Too many attempts. Please request a new code.' };
  }

  if (stored.otp !== otp) {
    await db.verificationToken.update({
      where: { id: stored.id },
      data: { attempts: stored.attempts + 1 },
    });
    return { valid: false, error: 'Invalid OTP' };
  }

  // OTP is valid — clean up
  await db.verificationToken.delete({ where: { id: stored.id } });
  return { valid: true };
}

/**
 * Invalidate a token
 */
export async function invalidateToken(token: string): Promise<void> {
  await db.verificationToken.deleteMany({ where: { token } });
}

/**
 * Invalidate all tokens for a user of a specific type
 */
export async function invalidateUserTokens(userId: string, type: TokenType): Promise<void> {
  await db.verificationToken.deleteMany({ where: { userId, type } });
}

/**
 * Clean up expired tokens (call from cron)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db.verificationToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

// In-memory fallback for when Redis is unavailable
const memoryBlacklist = new Set<string>();

/**
 * Blacklist a JWT token (Redis-backed with memory fallback)
 */
export async function blacklistToken(token: string): Promise<void> {
  // Hash the token for storage (don't store full tokens)
  const tokenHash = await hashToken(token);
  
  try {
    await redisBlacklist.blacklist(tokenHash);
  } catch {
    // Fallback to memory
    memoryBlacklist.add(tokenHash);
  }
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  
  try {
    const isBlacklisted = await redisBlacklist.isBlacklisted(tokenHash);
    return isBlacklisted || memoryBlacklist.has(tokenHash);
  } catch {
    return memoryBlacklist.has(tokenHash);
  }
}

/**
 * Hash token for secure storage
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clean up memory blacklist (Redis handles TTL automatically)
 */
export function cleanupBlacklist(): void {
  if (memoryBlacklist.size > 10000) {
    memoryBlacklist.clear();
  }
}
