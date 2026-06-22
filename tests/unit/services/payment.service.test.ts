import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCreditsFromAmount,
  calculateAmountForCredits,
  getSubscriptionPrice,
  getPaymentByReference,
  cancelPayment,
} from '@/services/payment.service';
import { ECONOMICS } from '@/lib/config/economics';

// Mock DB for DB-dependent tests
vi.mock('@/lib/db', () => ({
  db: {
    payment: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'pay-1', reference: 'ref-1', status: 'pending', amountKobo: 106000 }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(async (fn: Function) => fn({ payment: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) } })),
  },
}));

import { db } from '@/lib/db';

// price per credit in kobo: Math.round(10 * 1.06 * 100) = 1060
const PRICE_KOBO = Math.round(ECONOMICS.CREDIT_VALUE_NGN * (1 + ECONOMICS.CREDIT_SPREAD) * 100);

describe('Payment Service - Pure Calculations', () => {
  describe('calculateCreditsFromAmount', () => {
    it('should calculate correct credits from kobo amount', () => {
      expect(calculateCreditsFromAmount(PRICE_KOBO)).toBe(1);
    });

    it('should floor partial credits (1.5 credits worth of kobo → 1)', () => {
      expect(calculateCreditsFromAmount(Math.floor(PRICE_KOBO * 1.5))).toBe(1);
    });

    it('should handle zero amount', () => {
      expect(calculateCreditsFromAmount(0)).toBe(0);
    });

    it('should calculate correct credits for 100-credit purchase', () => {
      expect(calculateCreditsFromAmount(PRICE_KOBO * 100)).toBe(100);
    });
  });

  describe('calculateAmountForCredits', () => {
    it('should calculate correct kobo amount for 1 credit', () => {
      expect(calculateAmountForCredits(1)).toBe(PRICE_KOBO);
    });

    it('should handle zero credits', () => {
      expect(calculateAmountForCredits(0)).toBe(0);
    });

    it('should calculate correct amount for 50 credits', () => {
      expect(calculateAmountForCredits(50)).toBe(PRICE_KOBO * 50);
    });
  });

  describe('getSubscriptionPrice', () => {
    it('should return 0 kobo for free Basic tier', () => {
      expect(getSubscriptionPrice('basic')).toBe(0);
    });

    it('should return 3,000,000 kobo for Pro tier (₦30,000)', () => {
      expect(getSubscriptionPrice('pro')).toBe(3000000);
    });

    it('should return 8,500,000 kobo for Elite tier (₦85,000)', () => {
      expect(getSubscriptionPrice('elite')).toBe(8500000);
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
      const mockPayment = { id: 'pay-1', reference: 'ref-1', status: 'pending', amountKobo: 106000 };
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
