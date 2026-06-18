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
  // Paystack handles all payment channels (card, bank, USSD, mobile money, QR)
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
  credits: {
    valueNgn: Number(process.env.CREDIT_VALUE_NGN) || 100,
    purchasePriceNgn: Number(process.env.CREDIT_PURCHASE_PRICE_NGN) || 120, // ₦120 = 1 credit (17% margin)
    expiryMonths: Number(process.env.CREDIT_EXPIRY_MONTHS) || 6,
    expiryReminderDays: Number(process.env.CREDIT_EXPIRY_REMINDER_DAYS) || 30,
    showupBonusPercent: Number(process.env.CREDIT_SHOWUP_BONUS_PERCENT) || 5,
    reviewBonusMin: Number(process.env.CREDIT_REVIEW_BONUS_MIN) || 5,
    reviewBonusMax: Number(process.env.CREDIT_REVIEW_BONUS_MAX) || 10,
    referralBonus: Number(process.env.CREDIT_REFERRAL_BONUS) || 20,
    // No-show forfeiture: 100% goes to platform (vendor gets 0%)
    noShowVendorSharePercent: 0,
  },
  reservations: {
    tiers: {
      standard: { minGuests: 1, maxGuests: 2, credits: 50 },
      group: { minGuests: 3, maxGuests: 6, credits: 100 },
      largeParty: { minGuests: 7, maxGuests: 999, credits: 200 },
    },
    modificationWindowHours: 12,
    cancellation: {
      fullRefundHours: 24,
      partialRefundHours: 12,
      partialRefundPercent: 50,
    },
  },
  subscriptions: {
    basic: {
      name: 'Basic',
      priceNgn: 75000,
      features: ['Listings', 'Bookings', 'Credit integration'],
    },
    pro: {
      name: 'Pro',
      priceNgn: 145000,
      features: ['Analytics', 'Custom profiles', 'Priority support'],
    },
    premium: {
      name: 'Premium',
      priceNgn: 250000,
      features: ['Marketing tools', 'Featured spots', 'Advanced CRM'],
    },
  },
} as const;
