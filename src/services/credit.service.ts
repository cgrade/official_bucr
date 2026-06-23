import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';
import { addDays } from '@/lib/utils/helpers';
import { sendCreditExpiryReminder } from './email.service';
import { notifyCreditExpiring } from './notification.service';
import { isNotificationEnabled } from '@/lib/notifications/preferences';
import type { CreditTransactionType } from '@/types';
import type { VendorCreditType } from '@prisma/client';

export interface CreditTransactionParams {
  userId: string;
  type: CreditTransactionType;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  paystackReference?: string;
  amountPaidKobo?: number;
}

export async function createCreditTransaction(params: CreditTransactionParams) {
  const { userId, type, amount, referenceType, referenceId, description, paystackReference, amountPaidKobo } = params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditsBalance: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newBalance = user.creditsBalance + amount;

  if (newBalance < 0) {
    throw new Error('Insufficient credits');
  }

  let expiresAt: Date | undefined;
  if (type === 'purchase' && amount > 0) {
    expiresAt = addDays(new Date(), ECONOMICS.CREDIT_EXPIRY_DAYS);
  }

  const [transaction] = await db.$transaction([
    db.creditTransaction.create({
      data: {
        userId,
        type,
        amount,
        remainingAmount: type === 'purchase' && amount > 0 ? amount : null,
        status: type === 'purchase' && amount > 0 ? 'active' : 'redeemed',
        balanceAfter: newBalance,
        referenceType,
        referenceId,
        description,
        paystackReference,
        amountPaidKobo,
        expiresAt,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { creditsBalance: newBalance },
    }),
  ]);

  return transaction;
}

export async function purchaseCredits(params: {
  userId: string;
  credits: number;
  paystackReference: string;
  amountPaidKobo: number;
}) {
  return createCreditTransaction({
    userId: params.userId,
    type: 'purchase',
    amount: params.credits,
    description: `Purchased ${params.credits} credits`,
    paystackReference: params.paystackReference,
    amountPaidKobo: params.amountPaidKobo,
  });
}

// ============================================================================
// VENDOR CREDIT FUNCTIONS
// ============================================================================

export interface VendorCreditTransactionParams {
  vendorId: string;
  type: VendorCreditType;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}

export async function createVendorCreditTransaction(params: VendorCreditTransactionParams) {
  const { vendorId, type, amount, referenceType, referenceId, description } = params;

  // Guard: withdrawal is legally gated
  if (type === 'withdrawal' && !ECONOMICS.VENDOR_WITHDRAWAL_ENABLED) {
    // AuditLog the attempted withdrawal — we do this outside a transaction so it always persists
    await db.auditLog.create({
      data: {
        vendorId,
        action: 'update',
        resource: 'vendor_wallet',
        metadata: { attemptedType: 'withdrawal', amount, reason: 'VENDOR_WITHDRAWAL_ENABLED=false' },
      } as any,
    }).catch(() => {/* fire-and-forget */});
    throw Object.assign(new Error('Vendor cash withdrawals are currently disabled pending regulatory approval.'), { code: 'WITHDRAWAL_DISABLED' });
  }

  let wallet = await db.vendorWallet.findUnique({ where: { vendorId } });

  if (!wallet) {
    wallet = await db.vendorWallet.create({ data: { vendorId } });
  }

  const newBalance = wallet.balance + amount;

  if (newBalance < 0) {
    throw new Error('Insufficient credits');
  }

  const updateData: Record<string, unknown> = { balance: newBalance };
  if (amount > 0) {
    updateData.totalEarned = { increment: amount };
  } else if (amount < 0) {
    updateData.totalSpent = { increment: Math.abs(amount) };
  }

  const [transaction] = await db.$transaction([
    db.vendorCreditTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount,
        balanceAfter: newBalance,
        referenceType,
        referenceId,
        description,
      },
    }),
    db.vendorWallet.update({
      where: { id: wallet.id },
      data: updateData,
    }),
  ]);

  return transaction;
}

export async function purchaseVendorCredits(params: {
  vendorId: string;
  credits: number;
  description?: string;
}) {
  return createVendorCreditTransaction({
    vendorId: params.vendorId,
    type: 'bonus',
    amount: params.credits,
    description: params.description || `Purchased ${params.credits} credits`,
  });
}

export async function deductVendorCredits(params: {
  vendorId: string;
  credits: number;
  referenceType: string;
  referenceId: string;
  description?: string;
}) {
  return createVendorCreditTransaction({
    vendorId: params.vendorId,
    type: 'marketing_spend',
    amount: -params.credits,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description || `Spent ${params.credits} credits`,
  });
}

export async function awardVendorCredits(params: {
  vendorId: string;
  credits: number;
  type: VendorCreditType;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}) {
  return createVendorCreditTransaction({
    vendorId: params.vendorId,
    type: params.type,
    amount: params.credits,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description || `Earned ${params.credits} credits`,
  });
}

export async function getVendorCreditsBalance(vendorId: string): Promise<number> {
  const wallet = await db.vendorWallet.findUnique({
    where: { vendorId },
    select: { balance: true },
  });
  return wallet?.balance ?? 0;
}

export async function deductCredits(params: {
  userId: string;
  credits: number;
  referenceType: string;
  referenceId: string;
  description?: string;
}) {
  return createCreditTransaction({
    userId: params.userId,
    type: 'redeem',
    amount: -params.credits,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description || `Deducted ${params.credits} credits`,
  });
}

export async function refundCredits(params: {
  userId: string;
  credits: number;
  referenceType: string;
  referenceId: string;
  description?: string;
}) {
  return createCreditTransaction({
    userId: params.userId,
    type: 'refund',
    amount: params.credits,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description || `Refunded ${params.credits} credits`,
  });
}

export async function awardBonus(params: {
  userId: string;
  credits: number;
  referenceType: string;
  referenceId: string;
  description?: string;
}) {
  return createCreditTransaction({
    userId: params.userId,
    type: 'bonus',
    amount: params.credits,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description || `Bonus: ${params.credits} credits`,
  });
}

export async function forfeitCredits(params: {
  userId: string;
  credits: number;
  referenceType: string;
  referenceId: string;
  description?: string;
}) {
  return createCreditTransaction({
    userId: params.userId,
    type: 'forfeit',
    amount: -params.credits,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description || `Forfeited ${params.credits} credits`,
  });
}

export async function getUserCreditsBalance(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditsBalance: true },
  });
  return user?.creditsBalance ?? 0;
}

export async function getCreditHistory(
  userId: string,
  options: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    db.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.creditTransaction.count({ where: { userId } }),
  ]);

  return { transactions, total, page, limit };
}

export async function getExpiringCredits(userId: string, daysAhead: number = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return db.creditTransaction.findMany({
    where: {
      userId,
      type: 'purchase',
      expiresAt: { gte: now, lte: futureDate },
      expiredAt: null,
    },
    orderBy: { expiresAt: 'asc' },
  });
}

// ============================================================================
// DEPOSIT TIER CALCULATION
// ============================================================================

/**
 * Flat deposit per reservation — party size does NOT affect the amount.
 * Resolution order: vendor custom override → venue-type default → global default.
 */
export function calculateReservationDeposit(
  venueType?: string | null,
  customDepositCredits?: number | null
): number {
  if (customDepositCredits && customDepositCredits > 0) return customDepositCredits;
  if (venueType && ECONOMICS.DEPOSIT_BY_VENUE_TYPE[venueType] != null) {
    return ECONOMICS.DEPOSIT_BY_VENUE_TYPE[venueType];
  }
  return ECONOMICS.DEPOSIT_DEFAULT;
}

export function calculateShowupBonus(depositedCredits: number): number {
  return Math.floor(depositedCredits * ECONOMICS.SHOWUP_BONUS_PCT);
}

export function calculateCancellationRefund(
  depositedCredits: number,
  hoursUntilReservation: number
): number {
  if (hoursUntilReservation >= ECONOMICS.CANCEL_FULL_REFUND_HOURS) {
    return depositedCredits; // 100% refund
  }
  if (hoursUntilReservation >= ECONOMICS.CANCEL_PARTIAL_REFUND_HOURS) {
    return Math.floor(depositedCredits * ECONOMICS.CANCEL_PARTIAL_REFUND_PCT);
  }
  return 0; // no refund
}

// ============================================================================
// CREDIT EXPIRY PROCESSING
// ============================================================================

export async function processExpiredCredits(): Promise<{
  processed: number;
  totalExpired: number;
  users: string[];
}> {
  const now = new Date();

  const expiredTransactions = await db.creditTransaction.findMany({
    where: {
      type: 'purchase',
      status: 'active',
      expiresAt: { lte: now },
      expiredAt: null,
    },
    include: {
      user: { select: { id: true, email: true, creditsBalance: true } },
    },
  });

  if (expiredTransactions.length === 0) {
    return { processed: 0, totalExpired: 0, users: [] };
  }

  const processedUsers = new Set<string>();
  let totalExpiredCredits = 0;

  for (const transaction of expiredTransactions) {
    const remainingCredits = transaction.remainingAmount ?? transaction.amount;

    await db.$transaction(async (tx) => {
      await tx.creditTransaction.update({
        where: { id: transaction.id },
        data: { expiredAt: now, status: 'expired' },
      });

      if (remainingCredits > 0) {
        await tx.user.update({
          where: { id: transaction.userId },
          data: { creditsBalance: { decrement: remainingCredits } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: transaction.userId,
            type: 'expire',
            status: 'redeemed',
            amount: -remainingCredits,
            balanceAfter: transaction.user.creditsBalance - remainingCredits,
            referenceType: 'credit_expiry',
            referenceId: transaction.id,
            description: `${remainingCredits} credits expired`,
          },
        });

        // Record breakage revenue — inside the same transaction so it rolls back on failure
        await tx.platformRevenue.create({
          data: {
            type: 'breakage',
            amountNgn: remainingCredits * ECONOMICS.CREDIT_VALUE_NGN,
            amountCredits: remainingCredits,
            sourceType: 'credit_expiry',
            sourceId: transaction.id,
            userId: transaction.userId,
            billingMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          },
        });
      }
    });

    processedUsers.add(transaction.userId);
    totalExpiredCredits += remainingCredits;
  }

  return {
    processed: expiredTransactions.length,
    totalExpired: totalExpiredCredits,
    users: Array.from(processedUsers),
  };
}

export async function sendExpiryReminders(): Promise<{
  sent: number;
  users: Array<{ userId: string; email: string; expiringCredits: number }>;
}> {
  const now = new Date();
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + ECONOMICS.EXPIRY_REMINDER_DAYS);

  const expiringTransactions = await db.creditTransaction.findMany({
    where: {
      type: 'purchase',
      expiresAt: { gte: now, lte: reminderDate },
      expiredAt: null,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const userCredits = new Map<string, { user: typeof expiringTransactions[0]['user']; total: number }>();

  for (const tx of expiringTransactions) {
    const existing = userCredits.get(tx.userId);
    if (existing) {
      existing.total += tx.amount;
    } else {
      userCredits.set(tx.userId, { user: tx.user, total: tx.amount });
    }
  }

  const usersToNotify: Array<{ userId: string; email: string; expiringCredits: number }> = [];
  const expiryDateStr = reminderDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });

  for (const [userId, data] of userCredits) {
    usersToNotify.push({ userId, email: data.user.email, expiringCredits: data.total });

    // Push/in-app + email, both gated by the user's 'credits' preference.
    notifyCreditExpiring(userId, {
      amount: data.total,
      daysLeft: ECONOMICS.EXPIRY_REMINDER_DAYS,
    }).catch((e) => console.error('[expiry] push failed:', e));

    if (data.user.email && (await isNotificationEnabled(userId, 'credits'))) {
      sendCreditExpiryReminder({
        to: data.user.email,
        userName: data.user.name || 'there',
        creditsExpiring: data.total,
        expiryDate: expiryDateStr,
      }).catch((e) => console.error('[expiry] email failed:', e));
    }
  }

  return { sent: usersToNotify.length, users: usersToNotify };
}
