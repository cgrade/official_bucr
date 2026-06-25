import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';
import { notifyWaitlistReady } from './notification.service';

/**
 * Waitlist is a no-deposit "notify me when a table frees up" list. Seating from the
 * waitlist is a walk-in (paid at the venue) — no credit movement, so none of the
 * deposit/forfeit logic applies here. Flow: waiting → notified (hold window) →
 * claimed (seated) | expired (hold lapsed).
 */

/** Notify a waiting party that a table opened up, starting the claim hold window. */
export async function notifyWaitlistEntry(entryId: string, vendorId: string) {
  const entry = await db.waitlist.findFirst({
    where: { id: entryId, vendorId, status: { in: ['waiting', 'notified'] } },
    include: { vendor: { select: { businessName: true } } },
  });
  if (!entry) throw new Error('Waitlist entry not found');

  const holdMinutes = ECONOMICS.WAITLIST_HOLD_MINUTES;
  const claimExpiresAt = new Date(Date.now() + holdMinutes * 60_000);

  const updated = await db.waitlist.update({
    where: { id: entry.id },
    data: { status: 'notified', notifiedAt: new Date(), claimExpiresAt },
  });

  notifyWaitlistReady(entry.userId, {
    vendorName: entry.vendor?.businessName || 'the restaurant',
    partySize: entry.partySize,
    holdMinutes,
  }).catch((e) => console.error('Waitlist notify failed:', e?.message));

  return updated;
}

/** Mark a notified (or waiting) party as seated. */
export async function seatWaitlistEntry(entryId: string, vendorId: string) {
  const entry = await db.waitlist.findFirst({
    where: { id: entryId, vendorId, status: { in: ['waiting', 'notified'] } },
  });
  if (!entry) throw new Error('Waitlist entry not found');
  return db.waitlist.update({ where: { id: entry.id }, data: { status: 'claimed' } });
}

/** Remove a party from the waitlist (vendor-side). */
export async function removeWaitlistEntry(entryId: string, vendorId: string) {
  const entry = await db.waitlist.findFirst({ where: { id: entryId, vendorId } });
  if (!entry) throw new Error('Waitlist entry not found');
  return db.waitlist.update({ where: { id: entry.id }, data: { status: 'expired' } });
}

/** Expire notified entries whose claim hold has lapsed (called by the cleanup cron). */
export async function expireStaleWaitlist(): Promise<number> {
  const res = await db.waitlist.updateMany({
    where: { status: 'notified', claimExpiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  });
  return res.count;
}

/**
 * Position of an entry within its vendor's queue for the same desired date — 1-based,
 * counting only entries still "waiting" that joined no later than this one.
 */
export async function waitlistPosition(entry: { id: string; vendorId: string; desiredDate: Date; createdAt: Date; status: string }): Promise<number | null> {
  if (entry.status !== 'waiting') return null;
  const ahead = await db.waitlist.count({
    where: {
      vendorId: entry.vendorId,
      desiredDate: entry.desiredDate,
      status: 'waiting',
      createdAt: { lte: entry.createdAt },
    },
  });
  return ahead; // includes self → 1-based position
}
