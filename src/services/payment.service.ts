import { db } from '@/lib/db';
import { config } from '@/lib/config';
import { PaymentChannel, PaymentStatus, PaymentPurpose } from '@prisma/client';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

// Paystack supported channels for the checkout
export type PaystackChannel = 'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer';

export interface InitializePaymentParams {
  userId?: string;
  vendorId?: string;
  purpose: PaymentPurpose;
  amountKobo: number;
  metadata?: Record<string, unknown>;
  email: string;
  callbackUrl?: string;
  channels?: PaystackChannel[]; // Optional: restrict to specific channels
}

export interface PaymentInitResult {
  payment: {
    id: string;
    reference: string;
    status: PaymentStatus;
    amountKobo: number;
  };
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  payment: {
    id: string;
    reference: string;
    status: PaymentStatus;
    amountKobo: number;
    paidAt?: Date;
  };
  providerResponse?: unknown;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateReference(prefix: string = 'PAY'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ============================================================================
// PAYSTACK API
// ============================================================================

async function initializePaystackTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: PaystackChannel[];
}): Promise<{ authorizationUrl: string; accessCode: string }> {
  const payload: Record<string, unknown> = {
    email: params.email,
    amount: params.amountKobo,
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  };

  // Optionally restrict to specific payment channels
  // If not specified, Paystack shows all available channels at checkout
  if (params.channels && params.channels.length > 0) {
    payload.channels = params.channels;
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!data.status) {
    throw new Error(data.message || 'Failed to initialize payment');
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
  };
}

async function verifyPaystackTransaction(reference: string): Promise<{
  success: boolean;
  amountKobo: number;
  channel?: string;
  paidAt?: Date;
  providerReference?: string;
}> {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
    },
  });

  const data = await response.json();
  
  if (!data.status) {
    return { success: false, amountKobo: 0 };
  }

  const transaction = data.data;
  const success = transaction.status === 'success';

  return {
    success,
    amountKobo: transaction.amount,
    channel: transaction.channel,
    paidAt: success ? new Date(transaction.paid_at) : undefined,
    providerReference: transaction.id?.toString(),
  };
}

// ============================================================================
// MAIN PAYMENT SERVICE FUNCTIONS
// ============================================================================

/**
 * Initialize a payment via Paystack checkout.
 * Paystack handles all payment channels (card, bank transfer, USSD, mobile money, etc.)
 * at their checkout page automatically.
 */
export async function initializePayment(params: InitializePaymentParams): Promise<PaymentInitResult> {
  const reference = generateReference(
    params.purpose === 'credit_purchase' ? 'CRD' :
    params.purpose === 'subscription' ? 'SUB' : 'PAY'
  );

  // Create payment record
  const payment = await db.payment.create({
    data: {
      userId: params.userId,
      vendorId: params.vendorId,
      purpose: params.purpose,
      status: 'pending',
      amountKobo: params.amountKobo,
      reference,
      metadata: params.metadata as object,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  // Initialize Paystack transaction
  // Paystack checkout displays all available payment options:
  // - Card (Visa, Mastercard, Verve)
  // - Bank Transfer
  // - USSD
  // - Mobile Money (including OPay, PalmPay wallets)
  // - QR Code
  const paystackResult = await initializePaystackTransaction({
    email: params.email,
    amountKobo: params.amountKobo,
    reference,
    callbackUrl: params.callbackUrl,
    metadata: params.metadata,
    channels: params.channels,
  });

  return {
    payment: {
      id: payment.id,
      reference: payment.reference,
      status: payment.status,
      amountKobo: payment.amountKobo,
    },
    authorizationUrl: paystackResult.authorizationUrl,
    accessCode: paystackResult.accessCode,
  };
}

export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  const payment = await db.payment.findUnique({
    where: { reference },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // If already completed, return current status
  if (payment.status === 'completed') {
    return {
      success: true,
      payment: {
        id: payment.id,
        reference: payment.reference,
        status: payment.status,
        amountKobo: payment.amountKobo,
        paidAt: payment.paidAt || undefined,
      },
    };
  }

  // Verify with Paystack
  const verificationResult = await verifyPaystackTransaction(reference);

  // Update payment status and channel used
  const updatedPayment = await db.payment.update({
    where: { id: payment.id },
    data: {
      status: verificationResult.success ? 'completed' : 'failed',
      channel: verificationResult.channel as PaymentChannel | undefined,
      paidAt: verificationResult.paidAt,
      providerReference: verificationResult.providerReference,
    },
  });

  return {
    success: verificationResult.success,
    payment: {
      id: updatedPayment.id,
      reference: updatedPayment.reference,
      status: updatedPayment.status,
      amountKobo: updatedPayment.amountKobo,
      paidAt: updatedPayment.paidAt || undefined,
    },
    providerResponse: verificationResult,
  };
}

export async function getPaymentByReference(reference: string) {
  return db.payment.findUnique({
    where: { reference },
  });
}

export async function getPaymentsByUser(userId: string, options: {
  page?: number;
  limit?: number;
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
} = {}) {
  const { page = 1, limit = 20, purpose, status } = options;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(purpose && { purpose }),
    ...(status && { status }),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.payment.count({ where }),
  ]);

  return { payments, total, page, limit };
}

export async function getPaymentsByVendor(vendorId: string, options: {
  page?: number;
  limit?: number;
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
} = {}) {
  const { page = 1, limit = 20, purpose, status } = options;
  const skip = (page - 1) * limit;

  const where = {
    vendorId,
    ...(purpose && { purpose }),
    ...(status && { status }),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.payment.count({ where }),
  ]);

  return { payments, total, page, limit };
}

export async function cancelPayment(reference: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { reference },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'pending') {
    throw new Error('Only pending payments can be cancelled');
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { status: 'cancelled' },
  });
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

export async function handlePaystackWebhook(event: {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    paid_at?: string;
    id?: number;
  };
}): Promise<void> {
  if (event.event !== 'charge.success') {
    return;
  }

  const payment = await db.payment.findUnique({
    where: { reference: event.data.reference },
  });

  if (!payment || payment.status === 'completed') {
    return;
  }

  // Verify amount matches
  if (event.data.amount !== payment.amountKobo) {
    console.error(`Payment amount mismatch: expected ${payment.amountKobo}, got ${event.data.amount}`);
    return;
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      paidAt: event.data.paid_at ? new Date(event.data.paid_at) : new Date(),
      providerReference: event.data.id?.toString(),
    },
  });

  // Process based on payment purpose
  await processCompletedPayment(payment.id);
}

export async function processCompletedPayment(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.status !== 'completed') {
    return;
  }

  // Import services dynamically to avoid circular dependencies
  switch (payment.purpose) {
    case 'credit_purchase': {
      const { purchaseCredits, purchaseVendorCredits } = await import('./credit.service');
      const credits = Math.floor(payment.amountKobo / (config.credits.purchasePriceNgn * 100));
      
      // Handle both user and vendor credit purchases
      if (payment.userId) {
        await purchaseCredits({
          userId: payment.userId,
          credits,
          paystackReference: payment.reference,
          amountPaidKobo: payment.amountKobo,
        });
      } else if (payment.vendorId) {
        await purchaseVendorCredits({
          vendorId: payment.vendorId,
          credits,
          description: `Purchased ${credits} credits (ref: ${payment.reference}, ₦${payment.amountKobo / 100})`,
        });
      }
      break;
    }

    case 'subscription': {
      if (!payment.vendorId) break;
      const { activateSubscription } = await import('./subscription.service');
      const metadata = payment.metadata as { tier?: string } | null;
      if (metadata?.tier) {
        await activateSubscription({
          vendorId: payment.vendorId,
          tier: metadata.tier as 'basic' | 'pro' | 'premium',
          paymentId: payment.id,
          amountPaidKobo: payment.amountKobo,
        });
      }
      break;
    }

    case 'order_payment': {
      const metadata = payment.metadata as { orderId?: string } | null;
      if (metadata?.orderId && payment.userId) {
        const { confirmOrderPayment } = await import('./order.service');
        await confirmOrderPayment(metadata.orderId, payment.userId);
      }
      break;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function calculateCreditsFromAmount(amountKobo: number): number {
  return Math.floor(amountKobo / (config.credits.purchasePriceNgn * 100));
}

export function calculateAmountForCredits(credits: number): number {
  return credits * config.credits.purchasePriceNgn * 100; // In kobo
}

export function getSubscriptionPrice(tier: 'basic' | 'pro' | 'premium'): number {
  return config.subscriptions[tier].priceNgn * 100; // In kobo
}
