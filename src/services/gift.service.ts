import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateGiftParams {
  senderId: string;
  creditAmount: number;
  recipientEmail?: string;
  recipientPhone?: string;
  message?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function billingMonthNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ============================================================================
// CREATE GIFT
// ============================================================================

/**
 * Send credits to another user (or a future user via email/phone).
 * Fee = round(creditAmount × GIFT_FEE_PCT). Total debited = creditAmount + fee.
 * Fee is recognised as revenue only on a successful claim, not on creation.
 * If the recipient already exists, the gift is auto-claimed immediately.
 */
export async function createGift(params: CreateGiftParams) {
  const { senderId, creditAmount, recipientEmail, recipientPhone, message } = params;

  if (creditAmount <= 0) throw new Error('Gift amount must be positive');
  if (!recipientEmail && !recipientPhone) {
    throw new Error('Provide a recipient email or phone');
  }

  const feeCredits = Math.round(creditAmount * ECONOMICS.GIFT_FEE_PCT);
  const totalDebit = creditAmount + feeCredits;

  // Check if a registered user already has this contact
  const existingRecipient = recipientEmail
    ? await db.user.findFirst({ where: { email: recipientEmail, deletedAt: null } })
    : recipientPhone
    ? await db.user.findFirst({ where: { phone: recipientPhone, deletedAt: null } })
    : null;

  const expiresAt = addDays(new Date(), ECONOMICS.GIFT_CLAIM_WINDOW_DAYS);

  const gift = await db.$transaction(async (tx) => {
    const sender = await tx.user.findUnique({
      where: { id: senderId },
      select: { creditsBalance: true },
    });
    if (!sender) throw new Error('Sender not found');
    if (sender.creditsBalance < totalDebit) {
      throw new Error(`Insufficient credits. Need ${totalDebit} (${creditAmount} gift + ${feeCredits} fee), have ${sender.creditsBalance}`);
    }

    const newSenderBalance = sender.creditsBalance - totalDebit;

    // Debit sender
    await tx.creditTransaction.create({
      data: {
        userId: senderId,
        type: 'redeem',
        amount: -totalDebit,
        balanceAfter: newSenderBalance,
        referenceType: 'gift',
        description: `Sent gift of ${creditAmount} credits (fee: ${feeCredits})`,
      },
    });
    await tx.user.update({ where: { id: senderId }, data: { creditsBalance: newSenderBalance } });

    const now = new Date();

    // Auto-claim if recipient exists
    if (existingRecipient) {
      const recipientNewBalance = existingRecipient.creditsBalance + creditAmount;

      await tx.creditTransaction.create({
        data: {
          userId: existingRecipient.id,
          type: 'bonus',
          amount: creditAmount,
          balanceAfter: recipientNewBalance,
          referenceType: 'gift',
          description: `Received gift of ${creditAmount} credits`,
          expiresAt: addDays(now, ECONOMICS.CREDIT_EXPIRY_DAYS),
        },
      });
      await tx.user.update({
        where: { id: existingRecipient.id },
        data: { creditsBalance: recipientNewBalance },
      });

      const gift = await tx.gift.create({
        data: {
          senderId,
          recipientUserId: existingRecipient.id,
          recipientEmail: recipientEmail ?? null,
          recipientPhone: recipientPhone ?? null,
          creditAmount,
          feeCredits,
          message: message ?? null,
          status: 'claimed',
          expiresAt,
          claimedAt: now,
        },
      });

      // Recognise gift-fee revenue immediately on auto-claim
      await (tx as any).platformRevenue.create({
        data: {
          type: 'gift_fee',
          amountNgn: feeCredits * ECONOMICS.CREDIT_VALUE_NGN,
          amountCredits: feeCredits,
          sourceType: 'gift',
          sourceId: gift.id,
          userId: senderId,
          billingMonth: billingMonthNow(),
        },
      }).catch(() => {});

      return gift;
    }

    // Pending gift (recipient not yet registered)
    return tx.gift.create({
      data: {
        senderId,
        recipientEmail: recipientEmail ?? null,
        recipientPhone: recipientPhone ?? null,
        creditAmount,
        feeCredits,
        message: message ?? null,
        status: 'pending',
        expiresAt,
      },
    });
  });

  // Fire-and-forget: send invite notification if recipient isn't yet a user
  if (gift.status === 'pending') {
    sendGiftInvite({
      id: gift.id,
      recipientEmail: gift.recipientEmail,
      recipientPhone: gift.recipientPhone,
      creditAmount: gift.creditAmount,
      message: gift.message,
      expiresAt: gift.expiresAt,
    }).catch(() => {});
  }

  return gift;
}

// ============================================================================
// CLAIM GIFT
// ============================================================================

/**
 * Authenticated user claims a pending gift addressed to their email/phone.
 * Recognises the gift fee as platform revenue.
 */
export async function claimGift(giftId: string, userId: string) {
  const gift = await db.gift.findUnique({ where: { id: giftId } });
  if (!gift) throw new Error('Gift not found');
  if (gift.status !== 'pending') throw new Error(`Gift is ${gift.status} and cannot be claimed`);
  if (new Date() > gift.expiresAt) throw new Error('Gift has expired');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditsBalance: true, email: true, phone: true },
  });
  if (!user) throw new Error('User not found');

  // Verify contact match
  const emailMatch = gift.recipientEmail && gift.recipientEmail === user.email;
  const phoneMatch = gift.recipientPhone && gift.recipientPhone === user.phone;
  if (!emailMatch && !phoneMatch) {
    throw new Error('This gift was not addressed to your account');
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    const newBalance = user.creditsBalance + gift.creditAmount;

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'bonus',
        amount: gift.creditAmount,
        balanceAfter: newBalance,
        referenceType: 'gift',
        referenceId: giftId,
        description: `Claimed gift of ${gift.creditAmount} credits`,
        expiresAt: addDays(now, ECONOMICS.CREDIT_EXPIRY_DAYS),
      },
    });
    await tx.user.update({ where: { id: userId }, data: { creditsBalance: newBalance } });

    await tx.gift.update({
      where: { id: giftId },
      data: { status: 'claimed', claimedAt: now, recipientUserId: userId },
    });

    // Recognise gift-fee revenue
    await (tx as any).platformRevenue.create({
      data: {
        type: 'gift_fee',
        amountNgn: gift.feeCredits * ECONOMICS.CREDIT_VALUE_NGN,
        amountCredits: gift.feeCredits,
        sourceType: 'gift',
        sourceId: giftId,
        userId: gift.senderId,
        billingMonth: billingMonthNow(),
      },
    }).catch(() => {});
  });

  // Notify sender + recipient (fire-and-forget)
  notifyGiftClaimed(gift.senderId, userId, gift.creditAmount).catch(() => {});

  return { claimed: true, creditAmount: gift.creditAmount };
}

// ============================================================================
// AUTO-CLAIM ON REGISTRATION
// ============================================================================

/**
 * Called after a new user successfully registers.
 * Claims any pending gifts addressed to their email or phone.
 */
export async function autoClaimGiftsForNewUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, creditsBalance: true },
  });
  if (!user) return;

  const pendingGifts = await db.gift.findMany({
    where: {
      status: 'pending',
      expiresAt: { gt: new Date() },
      OR: [
        ...(user.email ? [{ recipientEmail: user.email }] : []),
        ...(user.phone ? [{ recipientPhone: user.phone }] : []),
      ],
    },
  });

  for (const gift of pendingGifts) {
    await claimGift(gift.id, userId).catch(() => {});
  }
}

// ============================================================================
// GIFT EXPIRY (cron)
// ============================================================================

/**
 * Called by the daily credits cron. Expires pending gifts past their window
 * and refunds (creditAmount + feeCredits) to the sender — no fee earned.
 */
export async function processExpiredGifts(): Promise<{ expired: number; refundedCredits: number }> {
  const now = new Date();

  const expiredGifts = await db.gift.findMany({
    where: { status: 'pending', expiresAt: { lte: now } },
    include: { sender: { select: { id: true, creditsBalance: true } } },
  });

  let refundedCredits = 0;

  for (const gift of expiredGifts) {
    const refund = gift.creditAmount + gift.feeCredits;

    await db.$transaction(async (tx) => {
      const newBalance = gift.sender.creditsBalance + refund;

      await tx.creditTransaction.create({
        data: {
          userId: gift.senderId,
          type: 'refund',
          amount: refund,
          balanceAfter: newBalance,
          referenceType: 'gift',
          referenceId: gift.id,
          description: `Unclaimed gift refund (${gift.creditAmount} + ${gift.feeCredits} fee)`,
        },
      });
      await tx.user.update({ where: { id: gift.senderId }, data: { creditsBalance: newBalance } });
      await tx.gift.update({ where: { id: gift.id }, data: { status: 'expired' } });
    });

    refundedCredits += refund;
    // Notify sender of expiry (fire-and-forget)
    notifyGiftExpired(gift.senderId, gift.creditAmount).catch(() => {});
  }

  return { expired: expiredGifts.length, refundedCredits };
}

// ============================================================================
// READ
// ============================================================================

export async function getUserGifts(userId: string, options: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [sent, sentTotal, received, receivedTotal] = await Promise.all([
    db.gift.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { recipientUser: { select: { name: true, email: true } } },
    }),
    db.gift.count({ where: { senderId: userId } }),
    db.gift.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { sender: { select: { name: true } } },
    }),
    db.gift.count({ where: { recipientUserId: userId } }),
  ]);

  return {
    sent: { data: sent, total: sentTotal, page, limit },
    received: { data: received, total: receivedTotal, page, limit },
  };
}

// ============================================================================
// INTERNAL NOTIFICATIONS (fire-and-forget callers wrap these in .catch())
// ============================================================================

async function sendGiftInvite(gift: {
  id: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  creditAmount: number;
  message?: string | null;
  expiresAt: Date;
}) {
  const { config } = await import('@/lib/config');
  const appUrl = config.app.url;
  const claimUrl = `${appUrl}/gifts/claim/${gift.id}`;
  const expiryStr = gift.expiresAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  const personalNote = gift.message ? `\n\nPersonal message: "${gift.message}"` : '';

  if (gift.recipientEmail) {
    const { sendEmail } = await import('./email.service');
    await (sendEmail as any)({
      to: gift.recipientEmail,
      subject: `You've received ${gift.creditAmount} Bucr credits!`,
      html: `
        <!DOCTYPE html><html><head>
        <style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;padding:24px;text-align:center;border-radius:12px 12px 0 0}
          .content{padding:24px;background:#f9fafb;border:1px solid #e5e7eb}
          .amount{font-size:48px;font-weight:700;color:#f59e0b;text-align:center;margin:16px 0}
          .cta{display:block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;text-align:center;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;margin:24px auto;width:fit-content}
          .footer{text-align:center;padding:16px;color:#666;font-size:12px}
          .note{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin:16px 0;font-style:italic}
        </style>
        </head><body>
        <div class="container">
          <div class="header"><h1>🎁 You've Got a Gift!</h1></div>
          <div class="content">
            <p>Someone sent you Bucr credits to use at top restaurants!</p>
            <div class="amount">${gift.creditAmount} credits</div>
            <p style="text-align:center;color:#666">Worth ₦${(gift.creditAmount * ECONOMICS.CREDIT_VALUE_NGN).toLocaleString()}</p>
            ${personalNote ? `<div class="note">${personalNote}</div>` : ''}
            <p>Use your credits to book reservations at amazing restaurants. Create your free Bucr account to claim them.</p>
            <a href="${claimUrl}" class="cta">Claim Your Credits</a>
            <p style="color:#999;font-size:13px;text-align:center">Expires on ${expiryStr}. Unclaimed credits are returned to the sender.</p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Bucr. All rights reserved.</p></div>
        </div>
        </body></html>
      `,
    }).catch((e: unknown) => console.error('[gift] email invite failed:', e));
  }

  if (gift.recipientPhone) {
    const { sendSms } = await import('./sms.service');
    const msg = `You've received ${gift.creditAmount} Bucr credits (worth ₦${(gift.creditAmount * ECONOMICS.CREDIT_VALUE_NGN).toLocaleString()})!${personalNote ? ` Message: "${gift.message}"` : ''} Claim before ${expiryStr}: ${claimUrl}`;
    await sendSms({ to: gift.recipientPhone, message: msg })
      .catch((e: unknown) => console.error('[gift] SMS invite failed:', e));
  }
}

async function notifyGiftClaimed(senderId: string, _recipientId: string, amount: number) {
  const { sendNotification } = await import('./notification.service');
  await (sendNotification as any)({
    userId: senderId,
    type: 'gift_claimed',
    category: 'gifts',
    title: 'Your gift was claimed! 🎉',
    body: `${amount} credits (₦${(amount * ECONOMICS.CREDIT_VALUE_NGN).toLocaleString()}) were received by the recipient.`,
    data: { screen: 'wallet' },
    channels: ['push'],
  }).catch(() => {});
}

async function notifyGiftExpired(senderId: string, amount: number) {
  const { sendNotification } = await import('./notification.service');
  await (sendNotification as any)({
    userId: senderId,
    type: 'gift_expired',
    category: 'gifts',
    title: 'Gift expired — credits returned',
    body: `Your unclaimed ${amount}-credit gift has expired. All credits (including the fee) are back in your wallet.`,
    data: { screen: 'wallet' },
    channels: ['push'],
  }).catch(() => {});
}
