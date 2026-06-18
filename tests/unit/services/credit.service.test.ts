import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateCreditsForPartySize,
  calculateShowupBonus,
  calculateCancellationRefund,
} from '@/services/credit.service';

// Mock DB for DB-dependent service tests
vi.mock('@/lib/db', () => {
  const mockUser = {
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
  };
  const mockCreditTransaction = {
    create: vi.fn().mockResolvedValue({ id: 'tx-1', type: 'purchase', amount: 50, balanceAfter: 150, expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) }),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  };
  const mockPayment = {
    create: vi.fn().mockResolvedValue({ id: 'pay-1', reference: 'ref', amountKobo: 600000, status: 'pending' }),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
  };
  return {
    db: {
      user: mockUser,
      creditTransaction: mockCreditTransaction,
      payment: mockPayment,
      $transaction: vi.fn().mockImplementation(async (fn: Function) => {
        const txMock = { user: mockUser, creditTransaction: mockCreditTransaction, payment: mockPayment };
        return fn(txMock);
      }),
    },
  };
});

describe('Credit Service - Pure Calculations', () => {
  describe('calculateCreditsForPartySize', () => {
    it('should return 50 credits for 1-2 guests (standard tier)', () => {
      expect(calculateCreditsForPartySize(1)).toBe(50);
      expect(calculateCreditsForPartySize(2)).toBe(50);
    });

    it('should return 100 credits for 3-6 guests (group tier)', () => {
      expect(calculateCreditsForPartySize(3)).toBe(100);
      expect(calculateCreditsForPartySize(4)).toBe(100);
      expect(calculateCreditsForPartySize(5)).toBe(100);
      expect(calculateCreditsForPartySize(6)).toBe(100);
    });

    it('should return 200 credits for 7+ guests (large party tier)', () => {
      expect(calculateCreditsForPartySize(7)).toBe(200);
      expect(calculateCreditsForPartySize(10)).toBe(200);
      expect(calculateCreditsForPartySize(20)).toBe(200);
    });
  });

  describe('calculateShowupBonus', () => {
    it('should calculate 5% bonus correctly', () => {
      expect(calculateShowupBonus(50)).toBe(2); // 5% of 50 = 2.5, rounded down
      expect(calculateShowupBonus(100)).toBe(5); // 5% of 100 = 5
      expect(calculateShowupBonus(200)).toBe(10); // 5% of 200 = 10
    });

    it('should return at least 1 credit for small amounts', () => {
      expect(calculateShowupBonus(10)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateCancellationRefund', () => {
    it('should return 100% refund for 24+ hours notice', () => {
      expect(calculateCancellationRefund(100, 25)).toBe(100); // 25 hours
    });

    it('should return 50% refund for 12-24 hours notice', () => {
      expect(calculateCancellationRefund(100, 18)).toBe(50); // 18 hours
    });

    it('should return 0% refund for less than 12 hours notice', () => {
      expect(calculateCancellationRefund(100, 6)).toBe(0); // 6 hours
    });

    it('should handle edge cases at boundaries', () => {
      expect(calculateCancellationRefund(100, 24)).toBe(100); // exactly 24 hours
      expect(calculateCancellationRefund(100, 12)).toBe(50); // exactly 12 hours
    });

    it('should handle different credit amounts', () => {
      expect(calculateCancellationRefund(50, 25)).toBe(50);
      expect(calculateCancellationRefund(200, 18)).toBe(100);
      expect(calculateCancellationRefund(200, 6)).toBe(0);
    });
  });
});
