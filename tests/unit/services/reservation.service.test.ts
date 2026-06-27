import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateReservationDeposit,
  calculateShowupBonus,
  calculateCancellationRefund,
} from '@/services/credit.service';

// Mock all external dependencies
vi.mock('@/lib/db', () => {
  const mockReservation = {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      vendorId: 'vendor-1',
      branchId: 'branch-1',
      partySize: 2,
      status: 'confirmed',
      pin: '1234',
      qrCode: 'data:image/png;base64,test',
      creditsDeposited: 50,
      date: new Date(),
      time: '19:00',
    }),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  };
  const mockUser = {
    // Balance must exceed the flat per-reservation deposit (≥ ₦10,000 = 1000 credits)
    findUnique: vi.fn().mockResolvedValue({ id: 'user-1', creditsBalance: 5000 }),
    update: vi.fn().mockResolvedValue({}),
  };
  const mockVendor = {
    findUnique: vi.fn().mockResolvedValue({ id: 'vendor-1', totalBookings: 10, noShowCount: 0, businessName: 'Test Restaurant', venueType: 'upscale_casual', customDepositCredits: null }),
    update: vi.fn().mockResolvedValue({}),
  };
  const mockCreditTransaction = {
    create: vi.fn().mockResolvedValue({ id: 'tx-1' }),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  };
  const mockGuestProfile = {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({ id: 'gp-1', visitCount: 1 }),
  };
  const mockVendorCreditTransaction = {
    create: vi.fn().mockResolvedValue({ id: 'vtx-1' }),
  };
  // null branch → operating-hours check is skipped (treated as "hours not configured")
  const mockVendorBranch = {
    findFirst: vi.fn().mockResolvedValue(null),
  };
  return {
    db: {
      reservation: mockReservation,
      user: mockUser,
      vendor: mockVendor,
      vendorBranch: mockVendorBranch,
      creditTransaction: mockCreditTransaction,
      guestProfile: mockGuestProfile,
      vendorCreditTransaction: mockVendorCreditTransaction,
      $transaction: vi.fn().mockImplementation(async (fn: Function) => {
        const txMock = {
          reservation: mockReservation,
          user: mockUser,
          vendor: mockVendor,
          creditTransaction: mockCreditTransaction,
          guestProfile: mockGuestProfile,
          vendorCreditTransaction: mockVendorCreditTransaction,
        };
        return fn(txMock);
      }),
    },
  };
});

vi.mock('@/services/notification.service', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
  notifyReservationConfirmed: vi.fn().mockResolvedValue(undefined),
  notifyReservationReminder: vi.fn().mockResolvedValue(undefined),
  notifyOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
  notifyCreditExpiring: vi.fn().mockResolvedValue(undefined),
  notifyNoShow: vi.fn().mockResolvedValue(undefined),
  notifyCheckInBonus: vi.fn().mockResolvedValue(undefined),
  notifyReservationConfirmation: vi.fn().mockResolvedValue(undefined),
  notifyReservationCancellation: vi.fn().mockResolvedValue(undefined),
  notifyVendorNewReservation: vi.fn().mockResolvedValue(undefined),
  notifyVendorCancellation: vi.fn().mockResolvedValue(undefined),
  notifyVendorNewOrder: vi.fn().mockResolvedValue(undefined),
  notifyVendorNewReview: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/email.service', () => ({
  sendReservationConfirmation: vi.fn().mockResolvedValue(undefined),
  sendReservationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/sms.service', () => ({
  sendReservationConfirmationSms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/qrcode.service', () => ({
  generateQRCode: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}));

import { db } from '@/lib/db';
import {
  createReservation,
  checkInReservation,
  cancelReservation,
  markNoShow,
} from '@/services/reservation.service';

describe('Reservation Service - Unit Tests with Mocked DB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock returns
    // Balance must exceed the flat per-reservation deposit (₦10,000+ = 1000+ credits)
    (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', creditsBalance: 5000, email: 'test@test.com' });
    (db.vendor.findUnique as any).mockResolvedValue({ id: 'vendor-1', totalBookings: 10, noShowCount: 0, businessName: 'Test Restaurant', venueType: 'upscale_casual', customDepositCredits: null });
    (db.reservation.findUnique as any).mockResolvedValue(null);
    (db.reservation.create as any).mockResolvedValue({
      id: 'res-1', userId: 'user-1', vendorId: 'vendor-1', branchId: 'branch-1',
      partySize: 2, status: 'confirmed', pin: '1234', qrCode: 'data:image/png;base64,test',
      creditsDeposited: 1500, date: new Date(), time: '19:00',
    });
  });

  describe('createReservation', () => {
    it('should call db.$transaction for atomicity', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await createReservation({
        userId: 'user-1',
        vendorId: 'vendor-1',
        branchId: 'branch-1',
        date: futureDate,
        time: '19:00',
        partySize: 2,
      });

      expect(db.$transaction).toHaveBeenCalled();
    });

    it('should throw error for insufficient credits', async () => {
      (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', creditsBalance: 10 });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await expect(
        createReservation({
          userId: 'user-1',
          vendorId: 'vendor-1',
          branchId: 'branch-1',
          date: futureDate,
          time: '19:00',
          partySize: 2,
        })
      ).rejects.toThrow();
    });

    it('should throw error for non-existent vendor', async () => {
      (db.vendor.findUnique as any).mockResolvedValue(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await expect(
        createReservation({
          userId: 'user-1',
          vendorId: 'nonexistent',
          branchId: 'branch-1',
          date: futureDate,
          time: '19:00',
          partySize: 2,
        })
      ).rejects.toThrow();
    });
  });

  describe('checkInReservation', () => {
    it('should throw error for non-existent reservation', async () => {
      (db.reservation.findUnique as any).mockResolvedValue(null);

      await expect(
        checkInReservation('nonexistent', '1234', 'vendor-1')
      ).rejects.toThrow();
    });

    it('should throw error for invalid PIN', async () => {
      (db.reservation.findUnique as any).mockResolvedValue({
        id: 'res-1', pin: '5678', status: 'confirmed', vendorId: 'vendor-1',
        userId: 'user-1', creditsDeposited: 50, partySize: 2,
      });

      await expect(
        checkInReservation('res-1', '1234', 'vendor-1')
      ).rejects.toThrow();
    });
  });

  describe('cancelReservation', () => {
    it('should throw error for non-existent reservation', async () => {
      (db.reservation.findUnique as any).mockResolvedValue(null);

      await expect(
        cancelReservation('nonexistent', 'user-1', 'user')
      ).rejects.toThrow();
    });

    it('should throw error for already cancelled reservation', async () => {
      (db.reservation.findUnique as any).mockResolvedValue({
        id: 'res-1', status: 'cancelled', vendorId: 'vendor-1', userId: 'user-1',
      });

      await expect(
        cancelReservation('res-1', 'user-1', 'user')
      ).rejects.toThrow();
    });
  });

  describe('markNoShow', () => {
    it('should throw error for non-existent reservation', async () => {
      (db.reservation.findUnique as any).mockResolvedValue(null);

      await expect(
        markNoShow('nonexistent', 'vendor-1')
      ).rejects.toThrow();
    });

    it('should throw error for already checked-in reservation', async () => {
      (db.reservation.findUnique as any).mockResolvedValue({
        id: 'res-1', status: 'checked_in', vendorId: 'vendor-1',
      });

      await expect(
        markNoShow('res-1', 'vendor-1')
      ).rejects.toThrow();
    });
  });
});

// Import ECONOMICS so tier assertions are always in sync with config
import { ECONOMICS } from '@/lib/config/economics';

describe('Reservation Service - Credit Calculations', () => {
  describe('calculateReservationDeposit (flat per reservation, by venue type)', () => {
    it('each venue type returns its configured flat deposit', () => {
      for (const [venue, credits] of Object.entries(ECONOMICS.DEPOSIT_BY_VENUE_TYPE)) {
        expect(calculateReservationDeposit(venue)).toBe(credits);
      }
    });

    it('party size is irrelevant — same deposit regardless of guests', () => {
      // Deposit no longer takes party size; it is flat per venue type.
      expect(calculateReservationDeposit('casual')).toBe(ECONOMICS.DEPOSIT_BY_VENUE_TYPE.casual);
      expect(calculateReservationDeposit('fine_dining')).toBe(ECONOMICS.DEPOSIT_BY_VENUE_TYPE.fine_dining);
    });

    it('vendor custom override takes precedence over venue default', () => {
      expect(calculateReservationDeposit('casual', 5000)).toBe(5000);
    });

    it('unknown venue falls back to DEPOSIT_DEFAULT', () => {
      expect(calculateReservationDeposit(undefined)).toBe(ECONOMICS.DEPOSIT_DEFAULT);
    });
  });

  describe('Cancellation refund calculations', () => {
    it('should give 100% refund for 24+ hours', () => {
      expect(calculateCancellationRefund(100, ECONOMICS.CANCEL_FULL_REFUND_HOURS + 1)).toBe(100);
      expect(calculateCancellationRefund(100, 48)).toBe(100);
    });

    it('should give partial refund in the partial window', () => {
      const midpoint = (ECONOMICS.CANCEL_FULL_REFUND_HOURS + ECONOMICS.CANCEL_PARTIAL_REFUND_HOURS) / 2;
      const expected = Math.floor(100 * ECONOMICS.CANCEL_PARTIAL_REFUND_PCT);
      expect(calculateCancellationRefund(100, midpoint)).toBe(expected);
    });

    it('should give 0% refund for <12 hours', () => {
      expect(calculateCancellationRefund(100, ECONOMICS.CANCEL_PARTIAL_REFUND_HOURS - 1)).toBe(0);
    });
  });

  describe('Show-up bonus calculations', () => {
    it('should calculate SHOWUP_BONUS_PCT on deposited credits', () => {
      for (const credits of [40, 80, 120, 200]) {
        const expected = Math.floor(credits * ECONOMICS.SHOWUP_BONUS_PCT);
        expect(calculateShowupBonus(credits)).toBe(expected);
      }
    });
  });
});
