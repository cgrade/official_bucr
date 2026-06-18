import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { config } from '@/lib/config';
import { handlePaystackWebhook } from '@/services/payment.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // Verify webhook signature
    if (!signature) {
      console.error('Paystack webhook: Missing signature');
      return new Response('Invalid signature', { status: 400 });
    }

    const hash = crypto
      .createHmac('sha512', config.paystack.secretKey)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Paystack webhook: Invalid signature');
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(body);

    console.log('Paystack webhook received:', event.event);

    // Handle the webhook
    await handlePaystackWebhook(event);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

// Disable body parsing for webhooks (we need raw body for signature verification)
export const dynamic = 'force-dynamic';
