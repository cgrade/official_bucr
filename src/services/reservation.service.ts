import { db } from '@/lib/db';
import { generateBookingReference, generatePin, getHoursUntil } from '@/lib/utils/helpers';
import { generateQRCode } from './qrcode.service';
import {
  deductCredits,
  refundCredits,
  awardBonus,
  forfeitCredits,
  calculateCreditsForPartySize,
  calculateShowupBonus,
  calculateCancellationRefund,
} from './credit.service';
import { config } from '@/lib/config';
import { sendReservationConfirmation } from './email.service';
import { notifyReservationConfirmed, notifyCheckInBonus, notifyNoShow } from './notification.service';

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
}

export async function createReservation(params: CreateReservationParams) {
  const {
    userId,
    vendorId,
    branchId,
    experienceId,
    date,
    time,
    partySize,
    specialRequests,
    occasion,
  } = params;

  // Verify vendor exists and is active
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId, deletedAt: null, verificationStatus: 'approved' },
  });

  if (!vendor) {
    throw new Error('Vendor not found or not verified');
  }

  // Calculate required credits
  let creditsRequired = calculateCreditsForPartySize(partySize);

  // If experience, use experience credits
  if (experienceId) {
    const experience = await db.experience.findUnique({
      where: { id: experienceId, vendorId, deletedAt: null, isActive: true },
    });

    if (!experience) {
      throw new Error('Experience not found');
    }

    creditsRequired = experience.creditsRequired;
  }

  // Check user has enough credits
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditsBalance: true },
  });

  if (!user || user.creditsBalance < creditsRequired) {
    throw new Error('Insufficient credits');
  }

  // Generate reference, PIN, and QR code
  const reference = generateBookingReference();
  const pin = generatePin(4);

  // Create reservation and deduct credits in transaction
  const reservation = await db.$transaction(async (tx) => {
    // Deduct credits
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

    await tx.user.update({
      where: { id: userId },
      data: { creditsBalance: newBalance },
    });

    // Create reservation
    const newReservation = await tx.reservation.create({
      data: {
        userId,
        vendorId,
        branchId,
        experienceId,
        reference,
        date,
        time,
        partySize,
        specialRequests,
        occasion,
        creditsDeposited: creditsRequired,
        status: 'confirmed',
        pin,
      },
      include: {
        vendor: {
          select: { businessName: true, slug: true },
        },
        branch: {
          select: { name: true, address: true, city: true },
        },
      },
    });

    // Update vendor stats
    await tx.vendor.update({
      where: { id: vendorId },
      data: { totalBookings: { increment: 1 } },
    });

    return newReservation;
  });

  // Generate QR code (outside transaction for performance)
  const qrCode = await generateQRCode({
    type: 'reservation',
    id: reservation.id,
    reference,
    pin,
  });

  // Update reservation with QR code
  await db.reservation.update({
    where: { id: reservation.id },
    data: { qrCode },
  });

  // Send confirmation email (fire-and-forget)
  const userForEmail = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (userForEmail?.email) {
    sendReservationConfirmation({
      to: userForEmail.email,
      userName: userForEmail.name,
      vendorName: reservation.vendor?.businessName || 'Restaurant',
      date: date.toISOString().split('T')[0],
      time,
      partySize,
      reference,
      pin,
      qrCodeUrl: qrCode || '',
    }).catch((err) => console.error('Failed to send reservation email:', err));
  }

  // Push notification (fire-and-forget)
  notifyReservationConfirmed(userId, {
    vendorName: reservation.vendor?.businessName || 'Restaurant',
    date: date.toISOString().split('T')[0],
    time,
    reference,
  }).catch((err) => console.error('Failed to send reservation push:', err));

  return { ...reservation, qrCode };
}

export async function checkInReservation(
  reservationId: string,
  pin: string,
  vendorId: string
) {
  const reservation = await db.reservation.findFirst({
    where: {
      id: reservationId,
      vendorId,
      status: { in: ['confirmed', 'pending'] },
    },
    include: {
      user: { select: { id: true, creditsBalance: true } },
      vendor: { select: { businessName: true } },
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.pin !== pin) {
    throw new Error('Invalid PIN');
  }

  // Calculate bonus
  const bonus = calculateShowupBonus(reservation.creditsDeposited);
  const totalRefund = reservation.creditsDeposited + bonus;

  // Process check-in with credit refund and bonus
  const updatedReservation = await db.$transaction(async (tx) => {
    const user = reservation.user;
    const newBalance = user.creditsBalance + totalRefund;

    // Refund credits
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

    // Award bonus
    if (bonus > 0) {
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'bonus',
          amount: bonus,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `${config.credits.showupBonusPercent}% show-up bonus`,
        },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: { creditsBalance: newBalance },
    });

    // Update reservation
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'checked_in',
        checkedInAt: new Date(),
        creditsRefunded: reservation.creditsDeposited,
        bonusCredits: bonus,
      },
    });

    // Update or create guest profile
    await tx.guestProfile.upsert({
      where: {
        vendorId_userId: {
          vendorId: reservation.vendorId,
          userId: user.id,
        },
      },
      create: {
        vendorId: reservation.vendorId,
        userId: user.id,
        visitCount: 1,
        lastVisit: new Date(),
      },
      update: {
        visitCount: { increment: 1 },
        lastVisit: new Date(),
      },
    });

    return updated;
  });

  // Push notification for check-in bonus (fire-and-forget)
  notifyCheckInBonus(reservation.userId, {
    vendorName: reservation.vendor?.businessName || 'Restaurant',
    bonusCredits: bonus,
    totalRefunded: reservation.creditsDeposited + bonus,
  }).catch((err) => console.error('Failed to send check-in push:', err));

  return {
    reservation: updatedReservation,
    creditsRefunded: reservation.creditsDeposited,
    bonusCredits: bonus,
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
      user: { select: { id: true, creditsBalance: true } },
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found or already processed');
  }

  // Calculate refund based on cancellation policy
  const reservationDateTime = new Date(reservation.date);
  const [hours, minutes] = reservation.time.split(':').map(Number);
  reservationDateTime.setHours(hours, minutes);

  const hoursUntil = getHoursUntil(reservationDateTime);
  
  let refundAmount: number;
  let bonusAmount = 0;

  if (cancelledBy === 'vendor') {
    // Vendor cancellation: full refund + 10% bonus
    refundAmount = reservation.creditsDeposited;
    bonusAmount = Math.floor(reservation.creditsDeposited * 0.1);
  } else {
    // User cancellation: based on policy
    refundAmount = calculateCancellationRefund(reservation.creditsDeposited, hoursUntil);
  }

  const forfeitedAmount = reservation.creditsDeposited - refundAmount;

  // Process cancellation
  const updatedReservation = await db.$transaction(async (tx) => {
    const user = reservation.user;
    let newBalance = user.creditsBalance;

    // Refund credits if applicable
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

    // Award bonus for vendor cancellation
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

    // Record forfeiture if applicable
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

    await tx.user.update({
      where: { id: user.id },
      data: { creditsBalance: newBalance },
    });

    // Update reservation
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
    where: {
      id: reservationId,
      userId,
      status: { in: ['pending', 'confirmed'] },
    },
    include: {
      user: { select: { id: true, creditsBalance: true } },
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found or cannot be modified');
  }

  // Check if within modification window (12 hours)
  const reservationDateTime = new Date(reservation.date);
  const [hours, minutes] = reservation.time.split(':').map(Number);
  reservationDateTime.setHours(hours, minutes);

  const hoursUntil = getHoursUntil(reservationDateTime);

  if (hoursUntil < config.reservations.modificationWindowHours) {
    throw new Error(
      `Reservations can only be modified ${config.reservations.modificationWindowHours} hours before the scheduled time`
    );
  }

  // Calculate new credits required if party size changed
  let creditsDifference = 0;
  if (updates.partySize && updates.partySize !== reservation.partySize) {
    const newCreditsRequired = calculateCreditsForPartySize(updates.partySize);
    creditsDifference = newCreditsRequired - reservation.creditsDeposited;

    if (creditsDifference > 0 && reservation.user.creditsBalance < creditsDifference) {
      throw new Error('Insufficient credits for larger party size');
    }
  }

  // Process modification
  const updatedReservation = await db.$transaction(async (tx) => {
    const user = reservation.user;

    // Handle credit adjustment for party size change
    if (creditsDifference !== 0) {
      const newBalance = user.creditsBalance - creditsDifference;

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: creditsDifference > 0 ? 'redeem' : 'refund',
          amount: -creditsDifference,
          balanceAfter: newBalance,
          referenceType: 'reservation',
          referenceId: reservationId,
          description: `Party size change adjustment`,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { creditsBalance: newBalance },
      });
    }

    // Update reservation
    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        ...(updates.date && { date: updates.date }),
        ...(updates.time && { time: updates.time }),
        ...(updates.partySize && {
          partySize: updates.partySize,
          creditsDeposited: reservation.creditsDeposited + creditsDifference,
        }),
        ...(updates.specialRequests !== undefined && {
          specialRequests: updates.specialRequests,
        }),
      },
    });
  });

  return updatedReservation;
}

export async function markNoShow(reservationId: string, vendorId: string) {
  const reservation = await db.reservation.findFirst({
    where: {
      id: reservationId,
      vendorId,
      status: 'confirmed',
    },
    include: {
      user: { select: { id: true, creditsBalance: true } },
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  const forfeitedCredits = reservation.creditsDeposited;

  // No-show forfeiture policy:
  // - 100% of forfeited credits go to the platform
  // - Vendor receives 0% (config.credits.noShowVendorSharePercent = 0)
  // - User loses their deposited credits completely
  
  await db.$transaction(async (tx) => {
    // Record the forfeiture transaction for the user
    await tx.creditTransaction.create({
      data: {
        userId: reservation.userId,
        type: 'forfeit',
        amount: -forfeitedCredits,
        balanceAfter: reservation.user.creditsBalance, // Balance unchanged since credits were already deducted at booking
        referenceType: 'reservation',
        referenceId: reservationId,
        description: `No-show forfeiture: ${forfeitedCredits} credits lost`,
      },
    });

    // Update reservation status
    await tx.reservation.update({
      where: { id: reservationId },
      data: { 
        status: 'no_show',
      },
    });

    // Update vendor no-show stats
    await tx.vendor.update({
      where: { id: vendorId },
      data: { noShowCount: { increment: 1 } },
    });

    // Update guest profile with no-show record
    await tx.guestProfile.upsert({
      where: {
        vendorId_userId: {
          vendorId: reservation.vendorId,
          userId: reservation.userId,
        },
      },
      create: {
        vendorId: reservation.vendorId,
        userId: reservation.userId,
        noShowCount: 1,
        lastVisit: new Date(),
      },
      update: {
        noShowCount: { increment: 1 },
        lastVisit: new Date(),
      },
    });
  });

  // Push notification for no-show (fire-and-forget)
  notifyNoShow(reservation.userId, {
    vendorName: 'Restaurant',
    creditsForfeited: forfeitedCredits,
  }).catch((err) => console.error('Failed to send no-show push:', err));

  return { 
    message: 'Reservation marked as no-show',
    creditsForfeited: forfeitedCredits,
    vendorShare: 0,
    platformShare: forfeitedCredits,
  };
}
