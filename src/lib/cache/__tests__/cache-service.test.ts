import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cache, vendorCache, menuCache, sessionCache, tokenBlacklist } from '../cache-service';

describe('Cache Service', () => {
  beforeEach(() => {
    cache.clearMemoryCache();
  });

  describe('basic operations', () => {
    it('should set and get a value', async () => {
      await cache.set('test:key', { foo: 'bar' }, 60);
      const result = await cache.get('test:key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non:existent');
      expect(result).toBeNull();
    });

    it('should delete a value', async () => {
      await cache.set('test:delete', 'value', 60);
      await cache.del('test:delete');
      const result = await cache.get('test:delete');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      await cache.set('test:exists', true, 60);
      expect(await cache.exists('test:exists')).toBe(true);
      expect(await cache.exists('test:not-exists')).toBe(false);
    });

    it('should use getOrSet for cache-aside pattern', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fetched' });
      const uniqueKey = `test:fetch:${Date.now()}`;
      
      // First call should fetch
      const result1 = await cache.getOrSet(uniqueKey, fetchFn, 60);
      expect(result1).toEqual({ data: 'fetched' });
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cache.getOrSet(uniqueKey, fetchFn, 60);
      expect(result2).toEqual({ data: 'fetched' });
      expect(fetchFn).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('vendorCache', () => {
    it('should cache vendor data', async () => {
      const vendor = { id: '1', name: 'Test Vendor' };
      await vendorCache.setVendor('test-slug', vendor);
      const cached = await vendorCache.getVendor('test-slug');
      expect(cached).toEqual(vendor);
    });

    it('should cache vendor list', async () => {
      const list = { items: [{ id: '1' }, { id: '2' }], total: 2 };
      await vendorCache.setList('query-hash', list);
      const cached = await vendorCache.getList('query-hash');
      expect(cached).toEqual(list);
    });

    it('should invalidate vendor cache', async () => {
      await vendorCache.setVendor('to-delete', { id: '1' });
      await vendorCache.invalidateVendor('to-delete');
      const cached = await vendorCache.getVendor('to-delete');
      expect(cached).toBeNull();
    });
  });

  describe('menuCache', () => {
    it('should cache menu data', async () => {
      const menu = [{ id: '1', name: 'Item 1' }];
      await menuCache.setMenu('vendor-1', menu);
      const cached = await menuCache.getMenu('vendor-1');
      expect(cached).toEqual(menu);
    });
  });

  describe('sessionCache', () => {
    it('should cache session data', async () => {
      const session = { userId: '123', role: 'user' };
      await sessionCache.setSession('session-id', session);
      const cached = await sessionCache.getSession('session-id');
      expect(cached).toEqual(session);
    });

    it('should delete session', async () => {
      await sessionCache.setSession('to-delete', { userId: '123' });
      await sessionCache.deleteSession('to-delete');
      const cached = await sessionCache.getSession('to-delete');
      expect(cached).toBeNull();
    });
  });

  describe('tokenBlacklist', () => {
    it('should blacklist token', async () => {
      await tokenBlacklist.blacklist('token-id');
      const isBlacklisted = await tokenBlacklist.isBlacklisted('token-id');
      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const isBlacklisted = await tokenBlacklist.isBlacklisted('clean-token');
      expect(isBlacklisted).toBe(false);
    });
  });
});
