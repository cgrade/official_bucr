import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateReservationDeposit,
  calculateShowupBonus,
  calculateCancellationRefund,
} from '@/services/credit.service';
import { ECONOMICS } from '@/lib/config/economics';

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
  describe('calculateReservationDeposit (flat, by venue type)', () => {
    it('returns the configured flat deposit for each venue type', () => {
      for (const [venue, credits] of Object.entries(ECONOMICS.DEPOSIT_BY_VENUE_TYPE)) {
        expect(calculateReservationDeposit(venue)).toBe(credits);
      }
    });

    it('vendor custom override wins over venue default', () => {
      expect(calculateReservationDeposit('casual', 3000)).toBe(3000);
    });

    it('unknown / missing venue falls back to DEPOSIT_DEFAULT', () => {
      expect(calculateReservationDeposit(undefined)).toBe(ECONOMICS.DEPOSIT_DEFAULT);
      expect(calculateReservationDeposit('mystery')).toBe(ECONOMICS.DEPOSIT_DEFAULT);
    });
  });

  describe('calculateShowupBonus (3%)', () => {
    it('should calculate 3% bonus correctly', () => {
      expect(calculateShowupBonus(1000)).toBe(30); // 3% of 1000
      expect(calculateShowupBonus(1500)).toBe(45); // 3% of 1500
      expect(calculateShowupBonus(2000)).toBe(60); // 3% of 2000
    });

    it('floors fractional bonus (3% of 50 = 1.5 → 1)', () => {
      expect(calculateShowupBonus(50)).toBe(1);
    });

    it('should never be negative', () => {
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
