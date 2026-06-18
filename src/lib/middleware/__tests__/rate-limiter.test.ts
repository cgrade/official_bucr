import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { RateLimiter, withRateLimit } from '../rate-limiter';

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    // Clear the store before each test
    vi.clearAllMocks();
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 3,
      });

      const identifier = 'test-user-1';
      
      expect(await limiter.check(identifier)).toBe(true);
      expect(await limiter.check(identifier)).toBe(true);
      expect(await limiter.check(identifier)).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 2,
      });

      const identifier = 'test-user-2';
      
      expect(await limiter.check(identifier)).toBe(true);
      expect(await limiter.check(identifier)).toBe(true);
      expect(await limiter.check(identifier)).toBe(false);
    });

    it('should reset after window expires', async () => {
      const limiter = new RateLimiter({
        windowMs: 100, // 100ms window for testing
        max: 1,
      });

      const identifier = 'test-user-3';
      
      expect(await limiter.check(identifier)).toBe(true);
      expect(await limiter.check(identifier)).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await limiter.check(identifier)).toBe(true);
    });

    it('should track different identifiers separately', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        max: 1,
      });

      expect(await limiter.check('user-a')).toBe(true);
      expect(await limiter.check('user-b')).toBe(true);
      expect(await limiter.check('user-a')).toBe(false);
      expect(await limiter.check('user-b')).toBe(false);
    });
  });

  describe('withRateLimit', () => {
    it('should allow request when under limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        max: 5,
      });

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const wrapped = withRateLimit(handler, limiter);

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await wrapped(request);

      expect(handler).toHaveBeenCalledWith(request);
      expect(response).toBeDefined();
    });

    it('should return 429 when rate limit exceeded', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        max: 0, // No requests allowed
        message: 'Rate limit test',
      });

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const wrapped = withRateLimit(handler, limiter);

      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await wrapped(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit test');
    });

    it('should skip rate limiting for specified paths', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        max: 0, // No requests allowed
        skipPaths: ['/api/health', '/api/status'],
      });

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const middleware = limiter.middleware();

      const request1 = new NextRequest('http://localhost:3000/api/health');
      const result1 = await middleware(request1);
      expect(result1).toBeNull(); // Should skip rate limiting

      const request2 = new NextRequest('http://localhost:3000/api/users');
      const result2 = await middleware(request2);
      expect(result2?.status).toBe(429); // Should be rate limited
    });
  });
});
