import { Resend } from 'resend';
import { config } from '@/lib/config';
import { ECONOMICS } from '@/lib/config/economics';

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!config.email.resendApiKey) {
    return null;
  }
  if (!resend) {
    resend = new Resend(config.email.resendApiKey);
  }
  return resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  try {
    const client = getResendClient();
    if (!client) {
      console.log('Email service not configured, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await client.emails.send({
      from: config.email.from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
}

export async function sendReservationConfirmation(params: {
  to: string;
  userName: string;
  vendorName: string;
  date: string;
  time: string;
  partySize: number;
  reference: string;
  qrCodeUrl: string;
  pin: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .qr-code { text-align: center; margin: 20px 0; }
        .pin { font-size: 24px; font-weight: bold; color: #2563eb; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reservation Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${params.userName},</p>
          <p>Your reservation at <strong>${params.vendorName}</strong> has been confirmed!</p>
          
          <div class="details">
            <p><strong>Date:</strong> ${params.date}</p>
            <p><strong>Time:</strong> ${params.time}</p>
            <p><strong>Party Size:</strong> ${params.partySize} guest(s)</p>
            <p><strong>Reference:</strong> ${params.reference}</p>
          </div>
          
          <div class="qr-code">
            <p>Show this QR code when you arrive:</p>
            <img src="${params.qrCodeUrl}" alt="QR Code" width="200" />
          </div>
          
          <div class="pin">
            <p>Your PIN: ${params.pin}</p>
          </div>
          
          <p><strong>Important:</strong> Please arrive on time. Your deposit will be refunded plus a bonus when you check in!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Bucr. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: `Reservation Confirmed at ${params.vendorName} - ${params.reference}`,
    html,
  });
}

export async function sendOrderConfirmation(params: {
  to: string;
  userName: string;
  vendorName: string;
  orderType: 'pickup' | 'delivery';
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  reference: string;
  scheduledTime?: string;
}) {
  const itemsHtml = params.items
    .map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₦${item.price.toLocaleString()}</td></tr>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        .total { font-size: 18px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Placed!</h1>
        </div>
        <div class="content">
          <p>Hi ${params.userName},</p>
          <p>Your ${params.orderType} order from <strong>${params.vendorName}</strong> has been placed!</p>
          
          <div class="details">
            <p><strong>Reference:</strong> ${params.reference}</p>
            <p><strong>Order Type:</strong> ${params.orderType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
            ${params.scheduledTime ? `<p><strong>Scheduled:</strong> ${params.scheduledTime}</p>` : ''}
            
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <p>Subtotal: ₦${params.subtotal.toLocaleString()}</p>
            ${params.deliveryFee > 0 ? `<p>Delivery Fee: ₦${params.deliveryFee.toLocaleString()}</p>` : ''}
            <p class="total">Total: ₦${params.total.toLocaleString()}</p>
          </div>
          
          <p><strong>Note:</strong> Please ensure payment has been made to the vendor.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Bucr. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: `Order Confirmed - ${params.reference}`,
    html,
  });
}

export async function sendVendorWeeklyReport(params: {
  to: string;
  vendorName: string;
  periodLabel: string;
  reservations: number;
  checkIns: number;
  noShows: number;
  orders: number;
  newReviews: number;
  averageRating: number | null;
}) {
  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:8px 0;color:#7a8fa6">${label}</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#0f2547">${value}</td></tr>`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #0f2547; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #0f2547; color: #c9a84c; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f5f0e8; }
      table { width: 100%; border-collapse: collapse; background:white; padding:12px; border-radius:8px; }
      .footer { text-align: center; padding: 20px; color: #7a8fa6; font-size: 12px; }
    </style></head>
    <body>
      <div class="container">
        <div class="header"><h1>Your weekly summary</h1></div>
        <div class="content">
          <p>Hi ${params.vendorName},</p>
          <p>Here's how your venue performed ${params.periodLabel}:</p>
          <table>
            ${row('Reservations', params.reservations)}
            ${row('Guests checked in', params.checkIns)}
            ${row('No-shows', params.noShows)}
            ${row('Takeout/delivery orders', params.orders)}
            ${row('New reviews', params.newReviews)}
            ${row('Average rating', params.averageRating != null ? `${params.averageRating.toFixed(1)} ★` : '—')}
          </table>
          <p style="margin-top:16px">Log in to your Bucr dashboard for full analytics.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Bucr. Your table, actually waiting.</p>
        <p>You can turn off weekly reports in Settings → Notifications.</p></div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({
    to: params.to,
    subject: `${params.vendorName} — your weekly Bucr summary`,
    html,
  });
}

export async function sendReservationReminderEmail(params: {
  to: string;
  userName: string;
  vendorName: string;
  date: string;
  time: string;
  partySize: number;
  reference: string;
  pin?: string;
  qrCodeUrl?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #0f2547; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0f2547; color: #c9a84c; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f5f0e8; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .pin { font-size: 22px; font-weight: bold; color: #0f2547; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #7a8fa6; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your reservation is tomorrow</h1>
        </div>
        <div class="content">
          <p>Hi ${params.userName},</p>
          <p>This is a reminder for your reservation at <strong>${params.vendorName}</strong>.</p>
          <div class="details">
            <p><strong>Date:</strong> ${params.date}</p>
            <p><strong>Time:</strong> ${params.time}</p>
            <p><strong>Party Size:</strong> ${params.partySize} guest(s)</p>
            <p><strong>Reference:</strong> ${params.reference}</p>
          </div>
          ${params.qrCodeUrl ? `<div style="text-align:center;margin:20px 0"><p>Show this QR code when you arrive:</p><img src="${params.qrCodeUrl}" alt="QR Code" width="180" /></div>` : ''}
          ${params.pin ? `<div class="pin"><p>Your PIN: ${params.pin}</p></div>` : ''}
          <p><strong>Remember:</strong> show up to get your deposit back plus a bonus. A no-show forfeits part of your deposit.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Bucr. Your table, actually waiting.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: `Reminder: your table at ${params.vendorName} tomorrow at ${params.time}`,
    html,
  });
}

export async function sendCreditExpiryReminder(params: {
  to: string;
  userName: string;
  creditsExpiring: number;
  expiryDate: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Credits Expiring Soon!</h1>
        </div>
        <div class="content">
          <p>Hi ${params.userName},</p>
          
          <div class="alert">
            <p><strong>${params.creditsExpiring} credits</strong> (worth ₦${(params.creditsExpiring * ECONOMICS.CREDIT_VALUE_NGN).toLocaleString()}) will expire on <strong>${params.expiryDate}</strong>.</p>
          </div>
          
          <p>Don't let your credits go to waste! Book a reservation or place an order before they expire.</p>
          
          <p>Open the Bucr app to use your credits now.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Bucr. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    subject: 'Your Bucr Credits Are Expiring Soon!',
    html,
  });
}
