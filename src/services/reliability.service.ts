import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';

/**
 * Reliability score — computed daily over a rolling window.
 *
 * score = fulfilledBookings / totalConfirmedBookings
 *
 * A booking counts AGAINST the vendor only if the VENDOR cancelled or failed
 * to honor it — not if the guest no-showed.
 * Status breakdown:
 *   fulfilled    = checked_in | completed
 *   vendor-fault = cancelled where cancelledBy = 'vendor'
 *   excluded     = no_show (guest fault), pending (not yet due)
 *
 * Badge: score ≥ BADGE_THRESHOLD for BADGE_SUSTAINED_DAYS consecutive days
 *        → bookWithConfidence = true; drop if it falls below.
 */
export async function computeReliabilityScores(): Promise<{
  updated: number;
  badgesAwarded: number;
  badgesRevoked: number;
}> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - ECONOMICS.RELIABILITY_WINDOW_DAYS);

  const vendors = await db.vendor.findMany({
    where: { deletedAt: null, verificationStatus: 'approved' },
    select: {
      id: true,
      reliabilityScore: true,
      bookWithConfidence: true,
      badgeQualifyingSince: true,
    },
  });

  let updated = 0;
  let badgesAwarded = 0;
  let badgesRevoked = 0;

  for (const vendor of vendors) {
    const reservations = await db.reservation.findMany({
      where: {
        vendorId: vendor.id,
        date: { gte: windowStart, lte: now },
        status: {
          // confirmed + checked_in + completed + no_show + vendor-cancelled
          in: ['confirmed', 'checked_in', 'completed', 'no_show', 'cancelled'],
        },
      },
      select: { status: true, cancelledBy: true },
    });

    // Only count reservations where the VENDOR was expected to perform:
    //   fulfilled  = checked_in | completed  (good outcome)
    //   against    = cancelled where cancelledBy = 'vendor'  (bad outcome)
    // Guest no-shows and user cancellations are excluded entirely —
    // they are the guest's responsibility and must not penalise the vendor.
    const confirmed = reservations.filter(
      (r) =>
        r.status === 'checked_in' ||
        r.status === 'completed' ||
        (r.status === 'cancelled' && r.cancelledBy === 'vendor')
    );

    if (confirmed.length === 0) continue; // no data — skip

    const fulfilled = confirmed.filter(
      (r) => r.status === 'checked_in' || r.status === 'completed'
    ).length;

    const score = fulfilled / confirmed.length;

    // Badge qualification logic
    let badgeQualifyingSince = vendor.badgeQualifyingSince;
    let bookWithConfidence = vendor.bookWithConfidence;

    if (score >= ECONOMICS.BADGE_THRESHOLD) {
      if (!badgeQualifyingSince) {
        badgeQualifyingSince = now; // start the clock
      }
      const daysSinceQualifying = Math.floor(
        (now.getTime() - badgeQualifyingSince.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceQualifying >= ECONOMICS.BADGE_SUSTAINED_DAYS && !bookWithConfidence) {
        bookWithConfidence = true;
        badgesAwarded++;
      }
    } else {
      // Fell below threshold — revoke badge and reset clock
      if (bookWithConfidence) badgesRevoked++;
      bookWithConfidence = false;
      badgeQualifyingSince = null;
    }

    await db.vendor.update({
      where: { id: vendor.id },
      data: {
        reliabilityScore: Math.round(score * 1000) / 1000, // 3 d.p.
        bookWithConfidence,
        badgeQualifyingSince,
      } as any,
    });

    updated++;
  }

  return { updated, badgesAwarded, badgesRevoked };
}
