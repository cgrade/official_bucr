import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCreditsForPartySize,
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
    findUnique: vi.fn().mockResolvedValue({ id: 'user-1', creditsBalance: 500 }),
    update: vi.fn().mockResolvedValue({}),
  };
  const mockVendor = {
    findUnique: vi.fn().mockResolvedValue({ id: 'vendor-1', totalBookings: 10, noShowCount: 0, businessName: 'Test Restaurant' }),
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
  return {
    db: {
      reservation: mockReservation,
      user: mockUser,
      vendor: mockVendor,
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
    (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', creditsBalance: 500, email: 'test@test.com' });
    (db.vendor.findUnique as any).mockResolvedValue({ id: 'vendor-1', totalBookings: 10, noShowCount: 0, businessName: 'Test Restaurant' });
    (db.reservation.findUnique as any).mockResolvedValue(null);
    (db.reservation.create as any).mockResolvedValue({
      id: 'res-1', userId: 'user-1', vendorId: 'vendor-1', branchId: 'branch-1',
      partySize: 2, status: 'confirmed', pin: '1234', qrCode: 'data:image/png;base64,test',
      creditsDeposited: 50, date: new Date(), time: '19:00',
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

describe('Reservation Service - Credit Calculations', () => {
  describe('calculateCreditsForPartySize (via credit service)', () => {
    it('should calculate standard tier for 1-2 guests', () => {
      expect(calculateCreditsForPartySize(1)).toBe(50);
      expect(calculateCreditsForPartySize(2)).toBe(50);
    });

    it('should calculate group tier for 3-6 guests', () => {
      expect(calculateCreditsForPartySize(3)).toBe(100);
      expect(calculateCreditsForPartySize(6)).toBe(100);
    });

    it('should calculate large party tier for 7+ guests', () => {
      expect(calculateCreditsForPartySize(7)).toBe(200);
      expect(calculateCreditsForPartySize(10)).toBe(200);
    });
  });

  describe('Cancellation refund calculations', () => {
    it('should give 100% refund for 24+ hours', () => {
      expect(calculateCancellationRefund(50, 25)).toBe(50);
      expect(calculateCancellationRefund(100, 48)).toBe(100);
    });

    it('should give 50% refund for 12-24 hours', () => {
      expect(calculateCancellationRefund(100, 18)).toBe(50);
    });

    it('should give 0% refund for <12 hours', () => {
      expect(calculateCancellationRefund(100, 6)).toBe(0);
    });
  });

  describe('Show-up bonus calculations', () => {
    it('should calculate 5% bonus on deposited credits', () => {
      expect(calculateShowupBonus(50)).toBe(2);
      expect(calculateShowupBonus(100)).toBe(5);
      expect(calculateShowupBonus(200)).toBe(10);
    });
  });
});
