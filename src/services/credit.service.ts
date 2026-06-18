import { db } from '@/lib/db';
import { config } from '@/lib/config';
import { addMonths } from '@/lib/utils/helpers';
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

  // Get current balance
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

  // Calculate expiry date for purchased credits
  let expiresAt: Date | undefined;
  if (type === 'purchase' && amount > 0) {
    expiresAt = addMonths(new Date(), config.credits.expiryMonths);
  }

  // Create transaction and update balance in a transaction
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

  // Get or create wallet
  let wallet = await db.vendorWallet.findUnique({
    where: { vendorId },
  });

  if (!wallet) {
    wallet = await db.vendorWallet.create({
      data: { vendorId },
    });
  }

  const newBalance = wallet.balance + amount;

  if (newBalance < 0) {
    throw new Error('Insufficient credits');
  }

  // Update totals based on transaction type
  const updateData: any = { balance: newBalance };
  if (amount > 0) {
    updateData.totalEarned = { increment: amount };
  } else if (amount < 0) {
    updateData.totalSpent = { increment: Math.abs(amount) };
  }

  // Create transaction and update wallet in a transaction
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

  const expiringTransactions = await db.creditTransaction.findMany({
    where: {
      userId,
      type: 'purchase',
      expiresAt: {
        gte: now,
        lte: futureDate,
      },
      expiredAt: null,
    },
    orderBy: { expiresAt: 'asc' },
  });

  return expiringTransactions;
}

export function calculateCreditsForPartySize(partySize: number): number {
  const { tiers } = config.reservations;
  
  if (partySize >= tiers.standard.minGuests && partySize <= tiers.standard.maxGuests) {
    return tiers.standard.credits;
  }
  if (partySize >= tiers.group.minGuests && partySize <= tiers.group.maxGuests) {
    return tiers.group.credits;
  }
  if (partySize >= tiers.largeParty.minGuests) {
    return tiers.largeParty.credits;
  }
  
  return tiers.standard.credits;
}

export function calculateShowupBonus(depositedCredits: number): number {
  return Math.floor(depositedCredits * (config.credits.showupBonusPercent / 100));
}

export function calculateCancellationRefund(
  depositedCredits: number,
  hoursUntilReservation: number
): number {
  const { cancellation } = config.reservations;
  
  if (hoursUntilReservation >= cancellation.fullRefundHours) {
    return depositedCredits; // 100% refund
  }
  if (hoursUntilReservation >= cancellation.partialRefundHours) {
    return Math.floor(depositedCredits * (cancellation.partialRefundPercent / 100)); // 50% refund
  }
  return 0; // No refund
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
  
  // Find all purchase transactions that have expired but not yet processed
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

  // Process each expired transaction
  for (const transaction of expiredTransactions) {
    const remainingCredits = transaction.remainingAmount ?? transaction.amount;
    
    // Mark transaction as expired and deduct remaining credits from user balance
    await db.$transaction(async (tx) => {
      // Update the transaction as expired
      await tx.creditTransaction.update({
        where: { id: transaction.id },
        data: { 
          expiredAt: now,
          status: 'expired',
        },
      });

      // Deduct remaining credits from user balance (breakage revenue)
      if (remainingCredits > 0) {
        await tx.user.update({
          where: { id: transaction.userId },
          data: { creditsBalance: { decrement: remainingCredits } },
        });

        // Create an expire transaction for audit trail
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
  reminderDate.setDate(reminderDate.getDate() + config.credits.expiryReminderDays);

  // Find users with credits expiring within the reminder window
  const expiringTransactions = await db.creditTransaction.findMany({
    where: {
      type: 'purchase',
      expiresAt: {
        gte: now,
        lte: reminderDate,
      },
      expiredAt: null,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  // Group by user
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

  for (const [userId, data] of userCredits) {
    usersToNotify.push({
      userId,
      email: data.user.email,
      expiringCredits: data.total,
    });
    
    // TODO: Send email notification
    // await sendCreditExpiryReminderEmail(data.user.email, data.user.name, data.total);
  }

  return {
    sent: usersToNotify.length,
    users: usersToNotify,
  };
}
