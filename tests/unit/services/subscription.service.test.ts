import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSubscriptionTiers,
} from '@/services/subscription.service';
import { config } from '@/lib/config';

// Mock DB for DB-dependent tests
vi.mock('@/lib/db', () => ({
  db: {
    vendor: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    vendorSubscription: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'sub-1', tier: 'pro', status: 'active', vendorId: 'vendor-1' }),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn().mockImplementation(async (fn: Function) => {
      const txMock = {
        vendor: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) },
        vendorSubscription: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    }),
  },
}));

describe('Subscription Service - Pure Calculations', () => {
  describe('getSubscriptionTiers', () => {
    it('should return all subscription tiers', () => {
      const tiers = getSubscriptionTiers();

      expect(tiers.basic).toBeDefined();
      expect(tiers.pro).toBeDefined();
      expect(tiers.premium).toBeDefined();
    });

    it('should have correct prices', () => {
      const tiers = getSubscriptionTiers();

      expect(tiers.basic.priceNgn).toBe(config.subscriptions.basic.priceNgn);
      expect(tiers.pro.priceNgn).toBe(config.subscriptions.pro.priceNgn);
      expect(tiers.premium.priceNgn).toBe(config.subscriptions.premium.priceNgn);
    });

    it('should have correct kobo prices', () => {
      const tiers = getSubscriptionTiers();

      expect(tiers.basic.priceKobo).toBe(config.subscriptions.basic.priceNgn * 100);
      expect(tiers.pro.priceKobo).toBe(config.subscriptions.pro.priceNgn * 100);
      expect(tiers.premium.priceKobo).toBe(config.subscriptions.premium.priceNgn * 100);
    });

    it('should mark pro as recommended', () => {
      const tiers = getSubscriptionTiers();

      expect(tiers.basic.recommended).toBe(false);
      expect(tiers.pro.recommended).toBe(true);
      expect(tiers.premium.recommended).toBe(false);
    });

    it('should accumulate features for higher tiers', () => {
      const tiers = getSubscriptionTiers();

      expect(tiers.pro.features.length).toBeGreaterThan(tiers.basic.features.length);
      expect(tiers.premium.features.length).toBeGreaterThan(tiers.pro.features.length);
    });

    it('should have valid feature arrays', () => {
      const tiers = getSubscriptionTiers();

      expect(Array.isArray(tiers.basic.features)).toBe(true);
      expect(Array.isArray(tiers.pro.features)).toBe(true);
      expect(Array.isArray(tiers.premium.features)).toBe(true);
      expect(tiers.basic.features.length).toBeGreaterThan(0);
    });
  });
});
