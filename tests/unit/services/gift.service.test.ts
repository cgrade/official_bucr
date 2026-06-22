import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ECONOMICS } from '@/lib/config/economics';

// ── Shared test data (defined as factory functions to avoid hoisting issues)
const makeMockGift = () => ({
  id: 'gift-1',
  senderId: 'sender-1',
  recipientUserId: null as string | null,
  recipientEmail: 'recipient@test.com',
  recipientPhone: null as string | null,
  creditAmount: 100,
  feeCredits: 8,
  message: 'Happy birthday!',
  status: 'pending' as 'pending' | 'claimed' | 'expired',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  claimedAt: null as Date | null,
  createdAt: new Date(),
  sender: { id: 'sender-1', creditsBalance: 500 },
});

const mockRecipient = { id: 'recipient-1', creditsBalance: 50, email: 'recipient@test.com', phone: null };

vi.mock('@/lib/db', () => {
  const makeTx = () => ({
    user: {
      findUnique: vi.fn().mockResolvedValue({ creditsBalance: 500 }),
      update: vi.fn().mockResolvedValue({}),
    },
    creditTransaction: { create: vi.fn().mockResolvedValue({}) },
    gift: {
      create: vi.fn().mockResolvedValue({ id: 'gift-1', status: 'pending', creditAmount: 100, feeCredits: 8, expiresAt: new Date(Date.now() + 86400000 * 30) }),
      update: vi.fn().mockResolvedValue({ id: 'gift-1', status: 'claimed', creditAmount: 100, feeCredits: 8 }),
    },
    platformRevenue: { create: vi.fn().mockResolvedValue({}) },
  });

  return {
    db: {
      user: { findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue({ creditsBalance: 500 }) },
      gift: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'gift-1', status: 'pending', creditAmount: 100, feeCredits: 8, expiresAt: new Date(Date.now() + 86400000 * 30) }),
        update: vi.fn().mockResolvedValue({ id: 'gift-1', status: 'claimed', creditAmount: 100 }),
        count: vi.fn().mockResolvedValue(0),
      },
      creditTransaction: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn().mockImplementation(async (fn: Function) => fn(makeTx())),
    },
  };
});

vi.mock('@/lib/config', () => ({
  config: { app: { url: 'http://localhost:3000' } },
}));

vi.mock('@/services/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/services/sms.service', () => ({
  sendSms: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/services/notification.service', () => ({
  sendNotification: vi.fn().mockResolvedValue({}),
}));

import { db } from '@/lib/db';
import {
  createGift,
  claimGift,
  processExpiredGifts,
  getUserGifts,
} from '@/services/gift.service';

describe('Gift Service — pure economic calculations', () => {
  describe('fee calculation', () => {
    it('8% fee on 100 credits = 8 feeCredits, 108 total deducted', () => {
      const amount = 100;
      const fee = Math.round(amount * ECONOMICS.GIFT_FEE_PCT);
      expect(fee).toBe(8);
      expect(amount + fee).toBe(108);
    });

    it('fee is rounded (not truncated)', () => {
      expect(Math.round(15 * ECONOMICS.GIFT_FEE_PCT)).toBe(1);
      expect(Math.round(50 * ECONOMICS.GIFT_FEE_PCT)).toBe(4);
      expect(Math.round(200 * ECONOMICS.GIFT_FEE_PCT)).toBe(16);
    });

    it('claim window defaults to 30 days', () => {
      expect(ECONOMICS.GIFT_CLAIM_WINDOW_DAYS).toBe(30);
    });
  });
});

describe('Gift Service — createGift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects gifts with amount ≤ 0', async () => {
    await expect(
      createGift({ senderId: 'u1', creditAmount: 0, recipientEmail: 'a@b.com' })
    ).rejects.toThrow('Gift amount must be positive');
  });

  it('rejects if no recipient contact provided', async () => {
    await expect(
      createGift({ senderId: 'u1', creditAmount: 100 })
    ).rejects.toThrow('Provide a recipient email or phone');
  });

  it('rejects if sender has insufficient credits (100 gift + 8 fee = 108 needed, only 50 balance)', async () => {
    (db.user.findFirst as any).mockResolvedValue(null); // no existing recipient
    // Make the tx.user.findUnique return low balance
    const lowBalance = { creditsBalance: 50 };
    (db.$transaction as any).mockImplementationOnce(async (fn: Function) => {
      const tx = {
        user: { findUnique: vi.fn().mockResolvedValue(lowBalance), update: vi.fn() },
        creditTransaction: { create: vi.fn() },
        gift: { create: vi.fn() },
        platformRevenue: { create: vi.fn() },
      };
      return fn(tx);
    });

    await expect(
      createGift({ senderId: 'u1', creditAmount: 100, recipientEmail: 'test@test.com' })
    ).rejects.toThrow('Insufficient credits');
  });

  it('auto-claims immediately when recipient already exists', async () => {
    (db.user.findFirst as any).mockResolvedValue(mockRecipient);

    const gift = await createGift({
      senderId: 'sender-1',
      creditAmount: 100,
      recipientEmail: 'recipient@test.com',
    });

    // Transaction should have been called
    expect(db.$transaction).toHaveBeenCalledOnce();
    // Gift should be returned (auto-claimed)
    expect(gift).toBeDefined();
  });

  it('creates pending gift when recipient is not yet registered', async () => {
    (db.user.findFirst as any).mockResolvedValue(null); // recipient not found
    (db.$transaction as any).mockImplementationOnce(async (fn: Function) => {
      const tx = {
        user: { findUnique: vi.fn().mockResolvedValue({ creditsBalance: 500 }), update: vi.fn() },
        creditTransaction: { create: vi.fn().mockResolvedValue({}) },
        gift: { create: vi.fn().mockResolvedValue({ ...makeMockGift(), status: 'pending' }) },
        platformRevenue: { create: vi.fn() },
      };
      return fn(tx);
    });

    const gift = await createGift({
      senderId: 'sender-1',
      creditAmount: 100,
      recipientEmail: 'newuser@test.com',
    });

    expect(gift.status).toBe('pending');
  });
});

describe('Gift Service — claimGift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects claim if gift status is not pending', async () => {
    (db.gift.findUnique as any).mockResolvedValue({ ...makeMockGift(), status: 'claimed' });

    await expect(claimGift('gift-1', 'user-1')).rejects.toThrow('Gift is claimed and cannot be claimed');
  });

  it('rejects claim if gift has expired', async () => {
    (db.gift.findUnique as any).mockResolvedValue({
      ...makeMockGift(),
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000), // past
    });
    (db.user.findUnique as any).mockResolvedValue(mockRecipient);

    await expect(claimGift('gift-1', 'user-1')).rejects.toThrow('Gift has expired');
  });

  it('rejects if contact does not match claimer', async () => {
    (db.gift.findUnique as any).mockResolvedValue({ ...makeMockGift(), status: 'pending' });
    (db.user.findUnique as any).mockResolvedValue({
      ...mockRecipient,
      email: 'different@test.com',
      phone: null,
    });

    await expect(claimGift('gift-1', 'user-1')).rejects.toThrow('not addressed to your account');
  });

  it('credits recipient with creditAmount (not creditAmount + fee) on valid claim', async () => {
    (db.gift.findUnique as any).mockResolvedValue({ ...makeMockGift(), status: 'pending' });
    (db.user.findUnique as any).mockResolvedValue(mockRecipient);

    let creditedAmount = 0;
    (db.$transaction as any).mockImplementationOnce(async (fn: Function) => {
      const tx = {
        creditTransaction: {
          create: vi.fn().mockImplementation(({ data }: any) => {
            creditedAmount = data.amount;
            return {};
          }),
        },
        user: { update: vi.fn().mockResolvedValue({}) },
        gift: { update: vi.fn().mockResolvedValue({ ...makeMockGift(), status: 'claimed' }) },
        platformRevenue: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await claimGift('gift-1', 'user-1');
    expect(result.claimed).toBe(true);
    expect(result.creditAmount).toBe(100); // only the gift amount, not the fee
    expect(creditedAmount).toBe(100);      // fee not passed to recipient
  });
});

describe('Gift Service — processExpiredGifts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refunds creditAmount + feeCredits to sender (no fee revenue on expiry)', async () => {
    const expiredGift = {
      ...makeMockGift(),
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000),
      sender: { id: 'sender-1', creditsBalance: 200 },
    };
    (db.gift.findMany as any).mockResolvedValue([expiredGift]);

    let refundAmount = 0;
    (db.$transaction as any).mockImplementationOnce(async (fn: Function) => {
      const tx = {
        creditTransaction: {
          create: vi.fn().mockImplementation(({ data }: any) => {
            refundAmount = data.amount;
            return {};
          }),
        },
        user: { update: vi.fn().mockResolvedValue({}) },
        gift: { update: vi.fn().mockResolvedValue({ ...expiredGift, status: 'expired' }) },
      };
      return fn(tx);
    });

    const result = await processExpiredGifts();
    expect(result.expired).toBe(1);
    expect(result.refundedCredits).toBe(108); // 100 gift + 8 fee
    expect(refundAmount).toBe(108);            // full refund to sender
  });

  it('returns zero when no expired gifts', async () => {
    (db.gift.findMany as any).mockResolvedValue([]);
    const result = await processExpiredGifts();
    expect(result.expired).toBe(0);
    expect(result.refundedCredits).toBe(0);
  });
});

describe('Gift Service — getUserGifts', () => {
  it('returns paginated sent and received gifts', async () => {
    (db.gift.findMany as any).mockResolvedValue([]);
    (db.gift.count as any).mockResolvedValue(0);

    const result = await getUserGifts('user-1');
    expect(result).toHaveProperty('sent');
    expect(result).toHaveProperty('received');
    expect(result.sent).toHaveProperty('data');
    expect(result.received).toHaveProperty('data');
  });
});
