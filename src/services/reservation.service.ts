import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';
import { generateBookingReference, generatePin, getHoursUntil } from '@/lib/utils/helpers';
import { generateQRCode } from './qrcode.service';
import {
  calculateReservationDeposit,
  calculateShowupBonus,
  calculateCancellationRefund,
} from './credit.service';
import { sendReservationConfirmation, sendVendorNewReservation } from './email.service';
import { notifyReservationConfirmed, notifyCheckInBonus, notifyNoShow, notifyVendorNewReservation, notifyVendorCancellation } from './notification.service';
import { resolvePreferences, resolveVendorPreferences } from '@/lib/notifications/preferences';

export interface CreateReservationParams {
  userId: string;
  vendorId: string;
  branchId?: string;
  experienceId?: string;
  date: Date;
  time: string;
  partySize: number;
  specialRequests?: string;
  occasion?: string;
  idempotencyKey?: string;
}

export async function createReservation(params: CreateReservationParams) {
  const { userId, vendorId, branchId, experienceId, date, time, partySize, specialRequests, occasion, idempotencyKey } = params;

  const vendor = await db.vendor.findUnique({
    where: { id: vendorId, deletedAt: null, verificationStatus: 'approved' },
    select: { id: true, businessName: true, subscriptionTier: true, customDepositCredits: true, venueType: true },
  });
  if (!vendor) throw new Error('Vendor not found or not verified');

  // Flat deposit per reservation — party size does NOT affect the amount.
  // Vendor custom override → venue-type default → global default.
  let creditsRequired = calculateReservationDeposit(
    (vendor as any).venueType,
    vendor.customDepositCredits
  );

  if (experienceId) {
    const experience = await db.experience.findUnique({
      where: { id: experienceId, vendorId, deletedAt: null, isActive: true },
    });
    if (!experience) throw new Error('Experience not found');
    creditsRequired = experience.creditsRequired;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditsBalance: true },
  });
  if (!user || user.creditsBalance < creditsRequired) throw new Error('Insufficient credits');

  const reference = generateBookingReference();
  const pin = generatePin(4);

  const reservation = await db.$transaction(async (tx) => {
    const newBalance = user.creditsBalance - creditsRequired;

    await tx.creditTransaction.create({
      data: {
        userId,
        type: 'redeem',
        amount: -creditsRequired,
        balanceAfter: newBalance,
        referenceType: 'reservation',
        description: `Deposit for reservation at ${vendor.businessName}`,
      },
    });

    await tx.user.update({ where: { id: userId }, data: { creditsBalance: newBalance } });

    const newReservation = await tx.reservation.create({
      data: {
        userId, vendorId, branchId, experienceId, reference,
        date, time, partySize, specialRequests, occasion,
        creditsDeposited: creditsRequired,
        status: 'confirmed',
        pin,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      include: {
        vendor: { select: { businessName: true, slug: true } },
        branch: { select: { name: true, address: true, city: true } },
      },
    });

    await tx.vendor.update({ where: { id: vendorId }, data: { totalBookings: { increment: 1 } } });

    return newReservation;
  });

  const qrCode = await generateQRCode({ type: 'reservation', id: reservation.id, reference, pin });

  await db.reservation.update({ where: { id: reservation.id }, data: { qrCode } });

  const userForEmail = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, notificationPreferences: true },
  });
  const guestName = userForEmail?.name || 'A guest';
  const vendorName = reservation.vendor?.businessName || 'Restaurant';
  const dateStr = date.toISOString().split('T')[0];

  // Guest confirmation email — gated by the guest's 'reservations' preference.
  const reservationsEnabled = resolvePreferences(userForEmail?.notificationPreferences).reservations;
  if (userForEmail?.email && reservationsEnabled) {
    sendReservationConfirmation({
      to: userForEmail.email,
      userName: userForEmail.name,
      vendorName,
      date: dateStr,
      time, partySize, reference, pin, qrCodeUrl: qrCode || '',
    }).catch((err) => console.error('Failed to send reservation email:', err));
  }

  // Guest push/in-app (gated internally by 'reservations').
  notifyReservationConfirmed(userId, {
    vendorName, date: dateStr, time, reference,
  }).catch((err) => console.error('Failed to send reservation push:', err));

  // Vendor-facing push/in-app (gated by vendor's 'newReservations' preference).
  notifyVendorNewReservation(vendorId, {
    guestName, date: dateStr, time, partySize, reference,
  }).catch((err) => console.error('Failed to notify vendor of reservation:', err));

  // Vendor-facing EMAIL (same 'newReservations' preference gate).
  db.vendor.findUnique({
    where: { id: vendorId },
    select: { email: true, businessName: true, notificationPreferences: true },
  }).then((v) => {
    if (!v?.email || !resolveVendorPreferences(v.notificationPreferences).newReservations) return;
    return sendVendorNewReservation({
      to: v.email, vendorName: v.businessName, guestName, date: dateStr, time, partySize, reference,
    });
  }).catch((err) => console.error('Failed to email vendor of reservation:', err));

  return { ...reservation, qrCode };
}

export async function checkInReservation(reservationId: string, pin: string, vendorId: string) {
  const reservation = await db.reservation.findFirst({
    where: { id: reservationId, vendorId, status: { in: ['confirmed', 'pending'] } },
    include: {
      user: { select: { id: true, creditsBalance: true } },
      vendor: { select: { businessName: true, subscriptionTier: true, venueType: true } },
    },
  });
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.pin !== pin) throw new Error('Invalid PIN');

  const bonus = calculateShowupBonus(reservation.creditsDeposited);
  const totalRefund = reservation.creditsDeposited + bonus;

  // Per-cover fee: charged to vendor on each checked-in guest
  const venueType = (reservation.vendor as any)?.venueType ?? 'upscale_casual';
  const tier = (reservation.vendor as any)?.subscriptionTier ?? 'basic';
  const tierKey = (tier as string).replace('premium', 'elite');
  const baseFee = ECONOMICS.PER_COVER_FEE[venueType] ?? ECONOMICS.PER_COVER_FEE['upscale_casual'];
  const multiplier = ECONOMICS.PER_COVER_TIER_MULTIPLIER[tierKey] ?? 1.0;
  const coverFee = Math.round(baseFee * multiplier * reservation.partySize);

  const updatedReservation = await db.$transaction(async (tx) => {
    const user = reservation.user;
    const newBalance = user.creditsBalance + totalRefund;

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        type: 'refund',
        amount: reservation.creditsDeposited,
        balanceAfter: user.creditsBalance + reservation.creditsDeposited,
        referenceType: 'reservation',
        referenceId: reservationId,
        description: 'Deposit refund for showing up',
      },
    });

    if (bonus > 0) {
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'bonus',
          amount: bonus,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `${ECONOMICS.SHOWUP_BONUS_PCT * 100}% show-up bonus`,
        },
      });
    }

    await tx.user.update({ where: { id: user.id }, data: { creditsBalance: newBalance } });

    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'checked_in',
        checkedInAt: new Date(),
        creditsRefunded: reservation.creditsDeposited,
        bonusCredits: bonus,
      },
    });

    // Accrue per-cover fee — inside the transaction so it rolls back with the check-in
    if (coverFee > 0) {
      const now = new Date();
      await (tx as any).coverCharge.create({
        data: {
          vendorId,
          reservationId,
          partySize: reservation.partySize,
          feeCharged: coverFee,
          venueType,
          tierAtTime: tierKey,
          billingMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          status: 'accrued',
        },
      });
    }

    await tx.guestProfile.upsert({
      where: { vendorId_userId: { vendorId: reservation.vendorId, userId: user.id } },
      create: { vendorId: reservation.vendorId, userId: user.id, visitCount: 1, lastVisit: new Date() },
      update: { visitCount: { increment: 1 }, lastVisit: new Date() },
    });

    return updated;
  });

  notifyCheckInBonus(reservation.userId, {
    vendorName: reservation.vendor?.businessName || 'Restaurant',
    bonusCredits: bonus,
    totalRefunded: reservation.creditsDeposited + bonus,
  }).catch((err) => console.error('Failed to send check-in push:', err));

  return {
    reservation: updatedReservation,
    creditsRefunded: reservation.creditsDeposited,
    bonusCredits: bonus,
    coverFeeNgn: coverFee,
  };
}

export async function cancelReservation(
  reservationId: string,
  userId: string,
  cancelledBy: 'user' | 'vendor',
  reason?: string
) {
  const reservation = await db.reservation.findFirst({
    where: {
      id: reservationId,
      ...(cancelledBy === 'user' ? { userId } : {}),
      status: { in: ['pending', 'confirmed'] },
    },
    include: {
      user: { select: { id: true, name: true, creditsBalance: true } },
      vendor: { select: { id: true, businessName: true } },
    },
  });
  if (!reservation) throw new Error('Reservation not found or already processed');

  const reservationDateTime = new Date(reservation.date);
  const [hours, minutes] = reservation.time.split(':').map(Number);
  reservationDateTime.setHours(hours, minutes);
  const hoursUntil = getHoursUntil(reservationDateTime);

  let refundAmount: number;
  let bonusAmount = 0;

  if (cancelledBy === 'vendor') {
    refundAmount = reservation.creditsDeposited; // 100% refund
    bonusAmount  = Math.floor(reservation.creditsDeposited * ECONOMICS.VENDOR_CANCEL_BONUS_PCT);
  } else {
    refundAmount = calculateCancellationRefund(reservation.creditsDeposited, hoursUntil);
  }

  const forfeitedAmount = reservation.creditsDeposited - refundAmount;

  const updatedReservation = await db.$transaction(async (tx) => {
    const user = reservation.user;
    let newBalance = user.creditsBalance;

    // Vendor-initiated cancellation: the VENDOR funds the guest's compensation bonus
    // from their (non-cashable) marketing wallet — so they must hold enough credits to cancel.
    let vendorWallet: { id: string; balance: number } | null = null;
    if (cancelledBy === 'vendor' && bonusAmount > 0) {
      vendorWallet = await tx.vendorWallet.findUnique({
        where: { vendorId: reservation.vendorId },
        select: { id: true, balance: true },
      });
      if (!vendorWallet || vendorWallet.balance < bonusAmount) {
        throw new Error(
          `Insufficient wallet credits to cover the ${Math.round(ECONOMICS.VENDOR_CANCEL_BONUS_PCT * 100)}% cancellation compensation (${bonusAmount} credits). Top up your marketing credits, then cancel.`,
        );
      }
    }

    if (refundAmount > 0) {
      newBalance += refundAmount;
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'refund',
          amount: refundAmount,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `Cancellation refund (${cancelledBy})`,
        },
      });
    }

    if (bonusAmount > 0) {
      newBalance += bonusAmount;
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'bonus',
          amount: bonusAmount,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: 'Vendor cancellation compensation',
        },
      });
    }

    if (forfeitedAmount > 0) {
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'forfeit',
          amount: -forfeitedAmount,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: 'Late cancellation forfeiture',
        },
      });
    }

    await tx.user.update({ where: { id: user.id }, data: { creditsBalance: newBalance } });

    // Debit the vendor wallet for the compensation they just paid the guest.
    if (cancelledBy === 'vendor' && bonusAmount > 0 && vendorWallet) {
      const newVendorBalance = vendorWallet.balance - bonusAmount;
      await tx.vendorCreditTransaction.create({
        data: {
          walletId: vendorWallet.id,
          type: 'adjustment',
          amount: -bonusAmount,
          balanceAfter: newVendorBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `Cancellation compensation paid to guest (${Math.round(ECONOMICS.VENDOR_CANCEL_BONUS_PCT * 100)}% of ${reservation.creditsDeposited}-credit deposit)`,
        },
      });
      await tx.vendorWallet.update({
        where: { id: vendorWallet.id },
        data: { balance: newVendorBalance, totalSpent: { increment: bonusAmount } },
      });
    }

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason,
        creditsRefunded: refundAmount,
      },
    });
  });

  // Notify the vendor when a guest cancels (gated by vendor 'cancellations' pref).
  if (cancelledBy === 'user' && reservation.vendor?.id) {
    notifyVendorCancellation(reservation.vendor.id, {
      guestName: reservation.user?.name || 'A guest',
      date: new Date(reservation.date).toISOString().split('T')[0],
      time: reservation.time,
      reference: reservation.reference,
      reason: 'cancelled',
    }).catch((err) => console.error('Failed to notify vendor of cancellation:', err));
  }

  return {
    reservation: updatedReservation,
    creditsRefunded: refundAmount,
    bonusCredits: bonusAmount,
    creditsForfeited: forfeitedAmount,
  };
}

export async function modifyReservation(
  reservationId: string,
  userId: string,
  updates: {
    date?: Date;
    time?: string;
    partySize?: number;
    specialRequests?: string;
  }
) {
  const reservation = await db.reservation.findFirst({
    where: { id: reservationId, userId, status: { in: ['pending', 'confirmed'] } },
    include: { user: { select: { id: true, creditsBalance: true } } },
  });
  if (!reservation) throw new Error('Reservation not found or cannot be modified');

  const reservationDateTime = new Date(reservation.date);
  const [hours, minutes] = reservation.time.split(':').map(Number);
  reservationDateTime.setHours(hours, minutes);
  const hoursUntil = getHoursUntil(reservationDateTime);

  const MODIFICATION_WINDOW_HOURS = 12;
  if (hoursUntil < MODIFICATION_WINDOW_HOURS) {
    throw new Error(`Reservations can only be modified ${MODIFICATION_WINDOW_HOURS} hours before the scheduled time`);
  }

  // Deposit is FLAT per reservation — changing party size does NOT change the
  // deposit, so no credit adjustment is needed when partySize changes.
  const updatedReservation = await db.$transaction(async (tx) => {
    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        ...(updates.date && { date: updates.date }),
        ...(updates.time && { time: updates.time }),
        ...(updates.partySize && { partySize: updates.partySize }),
        ...(updates.specialRequests !== undefined && { specialRequests: updates.specialRequests }),
      },
    });
  });

  return updatedReservation;
}

// ============================================================================
// PHASE 4 — Resolved no-show split
//
// deposit = creditsDeposited
// forfeitPct = NOSHOW_FORFEIT_BY_VENUE[venueType] ?? NOSHOW_FORFEIT_PCT (default 0.30)
// forfeit = floor(deposit × forfeitPct)
//
// guestKeeps   = deposit − forfeit          → returned as usable credits
// vendorShare  = floor(deposit × 0.20)      → vendor marketing credits (non-cashable)
// platformShare = forfeit − vendorShare     → BUCR platform revenue
// ============================================================================

export async function markNoShow(reservationId: string, vendorId: string) {
  const reservation = await db.reservation.findFirst({
    where: { id: reservationId, vendorId, status: 'confirmed' },
    include: {
      user: { select: { id: true, creditsBalance: true, name: true } },
      vendor: { select: { businessName: true, venueType: true } },
    },
  });
  if (!reservation) throw new Error('Reservation not found');

  const deposit = reservation.creditsDeposited;
  const venueType = (reservation.vendor as any)?.venueType ?? 'upscale_casual';
  const forfeitPct =
    ECONOMICS.NOSHOW_FORFEIT_BY_VENUE[venueType] ?? ECONOMICS.NOSHOW_FORFEIT_PCT;

  const forfeit = Math.floor(deposit * forfeitPct);
  const guestKeeps = deposit - forfeit;
  // Cap vendorShare at forfeit so platformShare can never be negative,
  // even if NOSHOW_VENDOR_PCT is misconfigured > forfeitPct.
  const vendorShare = Math.min(Math.floor(deposit * ECONOMICS.NOSHOW_VENDOR_PCT), forfeit);
  const platformShare = forfeit - vendorShare; // always ≥ 0

  const now = new Date();
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await db.$transaction(async (tx) => {
    // 1. Record forfeit (already debited at booking — this is just the ledger entry)
    await tx.creditTransaction.create({
      data: {
        userId: reservation.userId,
        type: 'forfeit',
        amount: -forfeit,
        balanceAfter: reservation.user.creditsBalance, // credits were already out of balance at booking
        referenceType: 'reservation',
        referenceId: reservationId,
        description: `No-show: ${Math.round(forfeitPct * 100)}% of deposit forfeited`,
      },
    });

    // 2. Return guestKeeps as usable credits
    if (guestKeeps > 0) {
      const newBalance = reservation.user.creditsBalance + guestKeeps;
      await tx.creditTransaction.create({
        data: {
          userId: reservation.userId,
          type: 'refund',
          amount: guestKeeps,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `No-show: ${guestKeeps} credits returned (${100 - Math.round(forfeitPct * 100)}% of deposit)`,
        },
      });
      await tx.user.update({
        where: { id: reservation.userId },
        data: { creditsBalance: newBalance },
      });
    }

    // 3. Mark reservation no-show
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: 'no_show' },
    });

    // 4. Update vendor no-show stats
    await tx.vendor.update({
      where: { id: vendorId },
      data: { noShowCount: { increment: 1 } },
    });

    // 5. Update guest profile
    await tx.guestProfile.upsert({
      where: { vendorId_userId: { vendorId, userId: reservation.userId } },
      create: { vendorId, userId: reservation.userId, noShowCount: 1, lastVisit: new Date() },
      update: { noShowCount: { increment: 1 }, lastVisit: new Date() },
    });

    // 6. Vendor marketing credit share (non-cashable)
    if (vendorShare > 0) {
      let wallet = await tx.vendorWallet.findUnique({ where: { vendorId } });
      if (!wallet) {
        wallet = await tx.vendorWallet.create({ data: { vendorId } });
      }
      const newVendorBalance = wallet.balance + vendorShare;
      await tx.vendorCreditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'no_show_share',
          amount: vendorShare,
          balanceAfter: newVendorBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `No-show share: ${vendorShare} marketing credits (${Math.round(ECONOMICS.NOSHOW_VENDOR_PCT * 100)}% of ${deposit}-credit deposit)`,
        },
      });
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: { balance: newVendorBalance, totalEarned: { increment: vendorShare } },
      });
    }

    // 7. Platform revenue — no-show share (inside the transaction)
    if (platformShare > 0) {
      await (tx as any).platformRevenue.create({
        data: {
          type: 'noshow_platform_share',
          amountNgn: platformShare * ECONOMICS.CREDIT_VALUE_NGN,
          amountCredits: platformShare,
          sourceType: 'reservation',
          sourceId: reservationId,
          vendorId,
          userId: reservation.userId,
          billingMonth,
        },
      });
    }
  });

  // Notify guest (partial return) and vendor (marketing credits received) — fire-and-forget
  notifyNoShow(reservation.userId, {
    vendorName: reservation.vendor?.businessName || 'Restaurant',
    creditsForfeited: forfeit,
    creditsReturned: guestKeeps,
  } as any).catch(() => {});

  return {
    message: 'Reservation marked as no-show',
    deposit,
    forfeit,
    guestKeeps,
    vendorShare,
    platformShare,
    forfeitPct,
  };
}
