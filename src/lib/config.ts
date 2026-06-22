import { ECONOMICS } from './config/economics';

// Re-export ECONOMICS so callers that already import config can access it
export { ECONOMICS };

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Bucr',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@bucr.ng',
  },
  sms: {
    termiiApiKey: process.env.TERMII_API_KEY || '',
    senderId: process.env.TERMII_SENDER_ID || 'Bucr',
  },
  // Economic values — source of truth is ECONOMICS; keep these as aliases
  credits: {
    valueNgn:           ECONOMICS.CREDIT_VALUE_NGN,
    // purchase price = value × (1 + spread)
    purchasePriceNgn:   ECONOMICS.CREDIT_VALUE_NGN * (1 + ECONOMICS.CREDIT_SPREAD),
    expiryMonths:       ECONOMICS.CREDIT_EXPIRY_MONTHS,
    expiryReminderDays: ECONOMICS.EXPIRY_REMINDER_DAYS,
    showupBonusPercent: ECONOMICS.SHOWUP_BONUS_PCT * 100,
    reviewBonusMin:     5,   // exactly 5 — user promised this, don't randomise
    reviewBonusMax:     5,   // min = max = 5 so bonusCredits is always exactly 5
    referralBonus:      20,  // referrer gets 20 credits when their invitee signs up
    referralInviteeBonus: 10, // new user also gets 10 credits for using a referral code
    noShowVendorSharePercent: ECONOMICS.NOSHOW_VENDOR_PCT * 100,
  },
  reservations: {
    tiers: {
      standard:   { minGuests: 1, maxGuests: 2,   credits: 50 },
      group:      { minGuests: 3, maxGuests: 6,   credits: 100 },
      largeParty: { minGuests: 7, maxGuests: 999, credits: 200 },
    },
    modificationWindowHours: 12,
    cancellation: {
      fullRefundHours:      24,
      partialRefundHours:   12,
      partialRefundPercent: 50,
    },
  },
  subscriptions: {
    basic: {
      name: 'Basic',
      priceNgn: ECONOMICS.SUBSCRIPTION.basic,
      features: ['Restaurant listing', 'Reservation management', 'Credit integration'],
    },
    pro: {
      name: 'Pro',
      priceNgn: ECONOMICS.SUBSCRIPTION.pro,
      features: ['Advanced analytics', 'Custom profile page', 'Priority support', 'Guest CRM', 'Multi-branch support'],
    },
    elite: {
      name: 'Elite',
      priceNgn: ECONOMICS.SUBSCRIPTION.elite,
      features: ['Marketing tools', 'Featured placement', 'Advanced CRM', 'Dedicated account manager', 'API access'],
    },
  },
} as const;
