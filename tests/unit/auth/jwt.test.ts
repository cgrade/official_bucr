import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
} from '@/lib/auth/jwt';

describe('JWT Authentication', () => {
  const testPayload = {
    sub: 'test-user-id-123',
    email: 'test@example.com',
    role: 'user' as const,
  };

  describe('signAccessToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await signAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', async () => {
      const token = await signAccessToken(testPayload);
      const verified = await verifyAccessToken(token);
      
      expect(verified?.sub).toBe(testPayload.sub);
      expect(verified?.email).toBe(testPayload.email);
      expect(verified?.role).toBe(testPayload.role);
    });
  });

  describe('signRefreshToken', () => {
    it('should generate a valid refresh token', async () => {
      const token = await signRefreshToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should be different from access token', async () => {
      const accessToken = await signAccessToken(testPayload);
      const refreshToken = await signRefreshToken(testPayload);
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token and return payload', async () => {
      const token = await signAccessToken(testPayload);
      const verified = await verifyAccessToken(token);
      
      expect(verified).toBeDefined();
      expect(verified?.sub).toBe(testPayload.sub);
    });

    it('should return null for invalid token', async () => {
      const verified = await verifyAccessToken('invalid.token.here');
      expect(verified).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const verified = await verifyAccessToken('not-a-jwt');
      expect(verified).toBeNull();
    });

    it('should return null for empty token', async () => {
      const verified = await verifyAccessToken('');
      expect(verified).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const token = await signRefreshToken(testPayload);
      const verified = await verifyRefreshToken(token);
      
      expect(verified).toBeDefined();
      expect(verified?.sub).toBe(testPayload.sub);
    });

    it('should not verify access token as refresh token', async () => {
      const accessToken = await signAccessToken(testPayload);
      const verified = await verifyRefreshToken(accessToken);
      expect(verified).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'my-jwt-token';
      const header = `Bearer ${token}`;
      expect(extractTokenFromHeader(header)).toBe(token);
    });

    it('should return null for missing Bearer prefix', () => {
      expect(extractTokenFromHeader('my-jwt-token')).toBeNull();
    });

    it('should return null for empty header', () => {
      expect(extractTokenFromHeader('')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should handle Bearer with no token', () => {
      expect(extractTokenFromHeader('Bearer ')).toBe('');
    });
  });

  describe('Token Expiration', () => {
    it('access token should have exp claim', async () => {
      const token = await signAccessToken(testPayload);
      const verified = await verifyAccessToken(token);
      expect(verified?.exp).toBeDefined();
    });

    it('refresh token should have exp claim', async () => {
      const token = await signRefreshToken(testPayload);
      const verified = await verifyRefreshToken(token);
      expect(verified?.exp).toBeDefined();
    });
  });
});
