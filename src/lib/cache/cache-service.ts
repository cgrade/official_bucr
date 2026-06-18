import { getRedisClient, isRedisAvailable, CACHE_KEYS, CACHE_TTL } from './redis';

/**
 * Generic cache service with fallback to in-memory cache
 */
class CacheService {
  private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private useRedis: boolean | null = null;

  /**
   * Check if Redis is available, cache the result
   */
  private async checkRedis(): Promise<boolean> {
    if (this.useRedis === null) {
      this.useRedis = await isRedisAvailable();
    }
    return this.useRedis;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      }

      // Fallback to memory cache
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return JSON.parse(cached.value);
      }
      this.memoryCache.delete(key);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (await this.checkRedis()) {
        const redis = getRedisClient();
        await redis.setex(key, ttlSeconds, serialized);
        return;
      }

      // Fallback to memory cache
      this.memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        await redis.del(key);
        return;
      }

      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        return;
      }

      // Fallback: delete matching keys from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (await this.checkRedis()) {
        const redis = getRedisClient();
        return (await redis.exists(key)) === 1;
      }

      const cached = this.memoryCache.get(key);
      return cached !== undefined && cached.expiresAt > Date.now();
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set with callback (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clear memory cache (for testing/cleanup)
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}

// Export singleton instance
export const cache = new CacheService();

// Convenience functions for specific cache types
export const vendorCache = {
  getVendor: (slug: string) => cache.get(`${CACHE_KEYS.VENDOR}${slug}`),
  setVendor: (slug: string, data: any) => 
    cache.set(`${CACHE_KEYS.VENDOR}${slug}`, data, CACHE_TTL.VENDOR),
  invalidateVendor: (slug: string) => cache.del(`${CACHE_KEYS.VENDOR}${slug}`),
  
  getList: (queryHash: string) => cache.get(`${CACHE_KEYS.VENDOR_LIST}${queryHash}`),
  setList: (queryHash: string, data: any) => 
    cache.set(`${CACHE_KEYS.VENDOR_LIST}${queryHash}`, data, CACHE_TTL.VENDOR_LIST),
  invalidateAllLists: () => cache.delPattern(`${CACHE_KEYS.VENDOR_LIST}*`),
};

export const menuCache = {
  getMenu: (vendorId: string) => cache.get(`${CACHE_KEYS.MENU}${vendorId}`),
  setMenu: (vendorId: string, data: any) => 
    cache.set(`${CACHE_KEYS.MENU}${vendorId}`, data, CACHE_TTL.MENU),
  invalidateMenu: (vendorId: string) => cache.del(`${CACHE_KEYS.MENU}${vendorId}`),
};

export const sessionCache = {
  getSession: (sessionId: string) => cache.get(`${CACHE_KEYS.SESSION}${sessionId}`),
  setSession: (sessionId: string, data: any) => 
    cache.set(`${CACHE_KEYS.SESSION}${sessionId}`, data, CACHE_TTL.SESSION),
  deleteSession: (sessionId: string) => cache.del(`${CACHE_KEYS.SESSION}${sessionId}`),
};

export const tokenBlacklist = {
  isBlacklisted: (tokenId: string) => cache.exists(`${CACHE_KEYS.TOKEN_BLACKLIST}${tokenId}`),
  blacklist: (tokenId: string) => 
    cache.set(`${CACHE_KEYS.TOKEN_BLACKLIST}${tokenId}`, true, CACHE_TTL.TOKEN_BLACKLIST),
};
