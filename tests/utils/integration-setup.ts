import { vi } from 'vitest';
import { getTestDb } from './testcontainers';
import { setPrisma } from './test-helpers';

// Override @/lib/db to use the testcontainer PrismaClient
vi.mock('@/lib/db', async () => {
  try {
    const { prisma } = getTestDb();
    setPrisma(prisma);
    return { db: prisma };
  } catch {
    const { PrismaClient } = await import('@prisma/client');
    const connectionString = process.env.DATABASE_URL;
    const prisma = new PrismaClient({
      datasources: { db: { url: connectionString } },
      log: ['error'],
    });
    setPrisma(prisma);
    return { db: prisma };
  }
});

// Mock Redis — rate limiting and caching need it but we don't need real Redis for tests
vi.mock('@/lib/cache/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG'),
  },
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock rate limiter — bypass rate limiting in tests to avoid 429 errors
vi.mock('@/lib/middleware/rate-limiter', () => {
  class RateLimiter {
    async check() { return true; }
    middleware() { return async () => null; }
  }
  return {
    RateLimiter,
    apiLimiter: new RateLimiter(),
    authLimiter: new RateLimiter(),
    uploadLimiter: new RateLimiter(),
    creditPurchaseLimiter: new RateLimiter(),
    withRateLimit: (handler: any) => handler,
  };
});

// Set test environment variables
(process.env as any).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
