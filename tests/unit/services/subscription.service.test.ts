import { describe, it, expect, vi } from 'vitest';
import { getSubscriptionTiers } from '@/services/subscription.service';
import { ECONOMICS } from '@/lib/config/economics';

vi.mock('@/lib/db', () => ({
  db: {
    vendor: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) },
    vendorSubscription: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'sub-1', tier: 'pro', status: 'active', vendorId: 'vendor-1' }),
      update: vi.fn().mockResolvedValue({}),
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
    it('should return basic, pro, and elite tiers (premium renamed to elite)', () => {
      const tiers = getSubscriptionTiers();
      expect(tiers.basic).toBeDefined();
      expect(tiers.pro).toBeDefined();
      expect(tiers.elite).toBeDefined();
    });

    it('should have correct prices from ECONOMICS', () => {
      const tiers = getSubscriptionTiers();
      expect(tiers.basic.priceNgn).toBe(ECONOMICS.SUBSCRIPTION.basic);   // 0
      expect(tiers.pro.priceNgn).toBe(ECONOMICS.SUBSCRIPTION.pro);       // 30000
      expect(tiers.elite.priceNgn).toBe(ECONOMICS.SUBSCRIPTION.elite);   // 85000
    });

    it('Basic is free (0 kobo)', () => {
      const tiers = getSubscriptionTiers();
      expect(tiers.basic.priceKobo).toBe(0);
      expect(tiers.basic.free).toBe(true);
    });

    it('should have correct kobo prices', () => {
      const tiers = getSubscriptionTiers();
      expect(tiers.pro.priceKobo).toBe(3000000);
      expect(tiers.elite.priceKobo).toBe(8500000);
    });

    it('should mark pro as recommended', () => {
      const tiers = getSubscriptionTiers();
      expect(tiers.basic.recommended).toBe(false);
      expect(tiers.pro.recommended).toBe(true);
      expect(tiers.elite.recommended).toBe(false);
    });

    it('higher tiers include more features', () => {
      const tiers = getSubscriptionTiers();
      expect(tiers.pro.features.length).toBeGreaterThan(tiers.basic.features.length);
      expect(tiers.elite.features.length).toBeGreaterThan(tiers.pro.features.length);
    });

    it('all tiers have non-empty feature arrays', () => {
      const tiers = getSubscriptionTiers();
      expect(Array.isArray(tiers.basic.features)).toBe(true);
      expect(Array.isArray(tiers.pro.features)).toBe(true);
      expect(Array.isArray(tiers.elite.features)).toBe(true);
      expect(tiers.basic.features.length).toBeGreaterThan(0);
    });
  });
});
