import { db } from '@/lib/db';
import { sendFeaturedRenewal, sendFeaturedRenewalFailed } from './email.service';

/**
 * Auto-renew expired featured spots that opted in.
 *
 * For each active spot whose window has ended with autoRenew on: if the vendor
 * still has enough credits, atomically deactivate the old spot, create a fresh
 * one for the same package/duration, deduct the credits, and log the spend.
 * If they can't afford it, the spot lapses (deactivated, auto-renew turned off)
 * so it isn't reprocessed. Run from the daily cleanup cron.
 */
export async function processFeaturedAutoRenewals(): Promise<{ renewed: number; lapsed: number; processed: number }> {
  const now = new Date();
  const expiring = await db.featuredSpot.findMany({
    where: { isActive: true, autoRenew: true, endDate: { lt: now } },
    include: {
      package: true,
      vendor: { select: { id: true, wallet: true, businessName: true, email: true } },
    },
  });

  let renewed = 0;
  let lapsed = 0;

  for (const spot of expiring) {
    const pkg = spot.package;
    const wallet = spot.vendor.wallet;

    if (pkg?.isActive && wallet && wallet.balance >= pkg.creditsCost) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + pkg.durationDays);

      try {
        await db.$transaction(async (tx) => {
          await tx.featuredSpot.update({ where: { id: spot.id }, data: { isActive: false } });

          const fresh = await tx.featuredSpot.create({
            data: {
              vendorId: spot.vendorId,
              packageId: spot.packageId,
              type: spot.type,
              experienceId: spot.experienceId,
              offerId: spot.offerId,
              creditsPaid: pkg.creditsCost,
              startDate,
              endDate,
              isActive: true,
              addedByAdmin: false,
              autoRenew: true,
            },
          });

          await tx.vendorWallet.update({
            where: { vendorId: spot.vendorId },
            data: { balance: { decrement: pkg.creditsCost } },
          });

          await tx.vendorCreditTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'featured_spend',
              amount: -pkg.creditsCost,
              description: `Auto-renew: ${pkg.name}`,
              referenceType: 'featured_spot',
              referenceId: fresh.id,
              balanceAfter: wallet.balance - pkg.creditsCost,
            },
          });
        });
        renewed++;

        // Notify the vendor it renewed (fire-and-forget).
        if (spot.vendor.email) {
          sendFeaturedRenewal({
            to: spot.vendor.email,
            vendorName: spot.vendor.businessName,
            packageName: pkg.name,
            credits: pkg.creditsCost,
            endDate: endDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }),
          }).catch(() => {});
        }
      } catch (err) {
        console.error(`[featured] auto-renew failed for spot ${spot.id}:`, err);
      }
    } else {
      // Can't afford / package retired — let it lapse and stop retrying.
      await db.featuredSpot.update({
        where: { id: spot.id },
        data: { isActive: false, autoRenew: false },
      }).catch(() => {});
      lapsed++;

      // Tell the vendor it lapsed so they can top up + re-feature (fire-and-forget).
      if (spot.vendor.email && pkg) {
        sendFeaturedRenewalFailed({
          to: spot.vendor.email,
          vendorName: spot.vendor.businessName,
          packageName: pkg.name,
          creditsNeeded: pkg.creditsCost,
          balance: wallet?.balance ?? 0,
        }).catch(() => {});
      }
    }
  }

  return { renewed, lapsed, processed: expiring.length };
}
