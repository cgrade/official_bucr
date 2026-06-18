/**
 * Credits Expiration Cron Job
 * 
 * This script should be run daily via a cron scheduler (e.g., node-cron, Vercel Cron, or system cron)
 * 
 * Schedule: 0 0 * * * (Daily at midnight)
 * 
 * Tasks:
 * 1. Process expired credits (mark as expired, deduct from balance)
 * 2. Send expiry reminders (14 days and 7 days before expiry)
 */

import { processExpiredCredits, sendExpiryReminders } from '../src/services/credit.service';
import { db } from '../src/lib/db';

async function runCreditsCron() {
  console.log('🕐 Starting credits cron job...', new Date().toISOString());

  try {
    // 1. Process expired credits
    console.log('📦 Processing expired credits...');
    const expiredResult = await processExpiredCredits();
    console.log(`✅ Processed ${expiredResult.processed} expired transactions`);
    console.log(`💰 Total credits expired: ${expiredResult.totalExpired}`);
    if (expiredResult.users.length > 0) {
      console.log(`👥 Affected users: ${expiredResult.users.length}`);
    }

    // 2. Send expiry reminders (14-day warning)
    console.log('📧 Sending 14-day expiry reminders...');
    const reminderResult = await sendExpiryReminders();
    console.log(`✅ Sent ${reminderResult.sent} expiry reminders`);

    // 3. Send 7-day urgent reminders
    console.log('⚠️ Sending 7-day urgent expiry reminders...');
    const urgentResult = await sendUrgentExpiryReminders();
    console.log(`✅ Sent ${urgentResult.sent} urgent reminders`);

    console.log('✅ Credits cron job completed successfully');
    
    return {
      success: true,
      expired: expiredResult,
      reminders: reminderResult,
      urgentReminders: urgentResult,
    };
  } catch (error) {
    console.error('❌ Credits cron job failed:', error);
    throw error;
  }
}

async function sendUrgentExpiryReminders(): Promise<{
  sent: number;
  users: Array<{ userId: string; email: string; expiringCredits: number }>;
}> {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Find users with credits expiring within 7 days
  const expiringTransactions = await db.creditTransaction.findMany({
    where: {
      type: 'purchase',
      status: 'active',
      expiresAt: {
        gte: now,
        lte: sevenDaysFromNow,
      },
      expiredAt: null,
    },
    include: {
      user: { select: { id: true, email: true, name: true, pushToken: true } },
    },
  });

  // Group by user
  const userCredits = new Map<string, { 
    user: typeof expiringTransactions[0]['user']; 
    total: number;
    earliestExpiry: Date;
  }>();
  
  for (const tx of expiringTransactions) {
    const existing = userCredits.get(tx.userId);
    if (existing) {
      existing.total += tx.remainingAmount ?? tx.amount;
      if (tx.expiresAt && tx.expiresAt < existing.earliestExpiry) {
        existing.earliestExpiry = tx.expiresAt;
      }
    } else {
      userCredits.set(tx.userId, { 
        user: tx.user, 
        total: tx.remainingAmount ?? tx.amount,
        earliestExpiry: tx.expiresAt ?? sevenDaysFromNow,
      });
    }
  }

  const usersToNotify: Array<{ userId: string; email: string; expiringCredits: number }> = [];

  for (const [userId, data] of userCredits) {
    usersToNotify.push({
      userId,
      email: data.user.email,
      expiringCredits: data.total,
    });
    
    // Send push notification if user has push token
    if (data.user.pushToken) {
      // TODO: Integrate with push notification service
      console.log(`📱 Would send push to ${data.user.email}: ${data.total} credits expire soon!`);
    }
    
    // TODO: Send email notification
    // await sendUrgentCreditExpiryEmail(data.user.email, data.user.name, data.total, data.earliestExpiry);
  }

  return {
    sent: usersToNotify.length,
    users: usersToNotify,
  };
}

// Run if called directly
if (require.main === module) {
  runCreditsCron()
    .then((result) => {
      console.log('Cron result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cron error:', error);
      process.exit(1);
    });
}

export { runCreditsCron, sendUrgentExpiryReminders };
