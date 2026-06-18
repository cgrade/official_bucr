import Redis from 'ioredis';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  return redisClient;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Cache key prefixes
export const CACHE_KEYS = {
  SESSION: 'session:',
  TOKEN_BLACKLIST: 'token:blacklist:',
  VENDOR: 'vendor:',
  VENDOR_LIST: 'vendors:list:',
  MENU: 'menu:',
  USER: 'user:',
  RATE_LIMIT: 'ratelimit:',
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SESSION: 60 * 60 * 24, // 24 hours
  TOKEN_BLACKLIST: 60 * 60 * 24 * 7, // 7 days
  VENDOR: 60 * 5, // 5 minutes
  VENDOR_LIST: 60 * 2, // 2 minutes
  MENU: 60 * 10, // 10 minutes
  USER: 60 * 5, // 5 minutes
  RATE_LIMIT: 60 * 15, // 15 minutes
  FEATURED: 60 * 5, // 5 minutes
  VENDOR_DETAIL: 60 * 10, // 10 minutes
} as const;

/**
 * Generic cache get with JSON parsing
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Generic cache set with JSON serialization
 */
export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cache key
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete cache keys by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Cache delete pattern error:', error);
  }
}

/**
 * Cache wrapper - get from cache or execute function and cache result
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  await cacheSet(key, result, ttl);
  return result;
}
