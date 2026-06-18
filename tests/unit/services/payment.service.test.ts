import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCreditsFromAmount,
  calculateAmountForCredits,
  getSubscriptionPrice,
  getPaymentByReference,
  cancelPayment,
} from '@/services/payment.service';
import { config } from '@/lib/config';

// Mock DB for DB-dependent tests
vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'pay-1', reference: 'ref-1', status: 'pending', amountKobo: 12000 }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(async (fn: Function) => fn({ payment: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) } })),
  },
}));

import { db } from '@/lib/db';

describe('Payment Service - Pure Calculations', () => {
  describe('calculateCreditsFromAmount', () => {
    it('should calculate correct credits from kobo amount', () => {
      const credits = calculateCreditsFromAmount(12000);
      expect(credits).toBe(1);
    });

    it('should floor partial credits', () => {
      const credits = calculateCreditsFromAmount(18000);
      expect(credits).toBe(1);
    });

    it('should handle zero amount', () => {
      const credits = calculateCreditsFromAmount(0);
      expect(credits).toBe(0);
    });

    it('should calculate correct credits for larger amounts', () => {
      const credits = calculateCreditsFromAmount(1200000);
      expect(credits).toBe(100);
    });
  });

  describe('calculateAmountForCredits', () => {
    it('should calculate correct kobo amount for credits', () => {
      const amount = calculateAmountForCredits(1);
      expect(amount).toBe(config.credits.purchasePriceNgn * 100);
    });

    it('should handle zero credits', () => {
      const amount = calculateAmountForCredits(0);
      expect(amount).toBe(0);
    });

    it('should calculate correct amount for multiple credits', () => {
      const amount = calculateAmountForCredits(50);
      expect(amount).toBe(50 * config.credits.purchasePriceNgn * 100);
    });
  });

  describe('getSubscriptionPrice', () => {
    it('should return correct price for basic tier', () => {
      const price = getSubscriptionPrice('basic');
      expect(price).toBe(config.subscriptions.basic.priceNgn * 100);
    });

    it('should return correct price for pro tier', () => {
      const price = getSubscriptionPrice('pro');
      expect(price).toBe(config.subscriptions.pro.priceNgn * 100);
    });

    it('should return correct price for premium tier', () => {
      const price = getSubscriptionPrice('premium');
      expect(price).toBe(config.subscriptions.premium.priceNgn * 100);
    });
  });
});

describe('Payment Service - DB Operations (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPaymentByReference', () => {
    it('should return null for non-existent reference', async () => {
      (db.payment.findUnique as any).mockResolvedValue(null);
      const payment = await getPaymentByReference('non_existent_ref');
      expect(payment).toBeNull();
    });

    it('should find payment by reference', async () => {
      const mockPayment = { id: 'pay-1', reference: 'ref-1', status: 'pending', amountKobo: 12000 };
      (db.payment.findUnique as any).mockResolvedValue(mockPayment);
      const payment = await getPaymentByReference('ref-1');
      expect(payment).not.toBeNull();
      expect(payment?.id).toBe('pay-1');
    });
  });

  describe('cancelPayment', () => {
    it('should throw error for non-existent payment', async () => {
      (db.payment.findUnique as any).mockResolvedValue(null);
      await expect(cancelPayment('non_existent_ref')).rejects.toThrow('Payment not found');
    });

    it('should throw error for non-pending payment', async () => {
      (db.payment.findUnique as any).mockResolvedValue({ id: 'pay-1', reference: 'ref-1', status: 'completed' });
      await expect(cancelPayment('ref-1')).rejects.toThrow('Only pending payments can be cancelled');
    });
  });
});
