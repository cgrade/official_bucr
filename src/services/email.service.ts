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

// ── Shared branded layout (BUCR navy + gold) ────────────────────────────────
const BRAND = { navy: '#0f2547', gold: '#c9a84c', cream: '#f5f0e8', ink: '#070f1e', muted: '#7a8fa6' };
const APP_URL = config.app.url || 'https://bucr.ng';

function baseEmailLayout(opts: {
  heading: string;
  bodyHtml: string;
  preheader?: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const cta = opts.ctaText && opts.ctaUrl
    ? `<div style="text-align:center;margin:26px 0 8px"><a href="${opts.ctaUrl}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.ink};text-decoration:none;font-weight:700;padding:12px 30px;border-radius:10px">${opts.ctaText}</a></div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;color:${BRAND.navy};line-height:1.6">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preheader}</div>` : ''}
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <div style="text-align:center;padding:6px 0 18px">
        <span style="font-size:28px;font-weight:800;letter-spacing:0.5px"><span style="color:${BRAND.gold}">B</span><span style="color:${BRAND.navy}">ucr</span></span>
      </div>
      <div style="background:${BRAND.navy};padding:24px;border-radius:14px 14px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;color:${BRAND.cream}">${opts.heading}</h1>
      </div>
      <div style="background:#ffffff;padding:24px 24px 8px;border-radius:0 0 14px 14px">${opts.bodyHtml}${cta}</div>
      <div style="text-align:center;padding:18px;color:${BRAND.muted};font-size:12px">
        <p style="margin:4px 0;font-style:italic">Your table, actually waiting.</p>
        <p style="margin:4px 0">© ${new Date().getFullYear()} Bucr · bucr.ng</p>
      </div>
    </div>
  </body></html>`;
}

const detailRow = (label: string, value: string | number) =>
  `<tr><td style="padding:6px 0;color:${BRAND.muted}">${label}</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:${BRAND.navy}">${value}</td></tr>`;

/** Welcome email for a new diner. */
export async function sendWelcomeEmail(params: { to: string; userName: string }) {
  const html = baseEmailLayout({
    heading: `Welcome to Bucr, ${params.userName}!`,
    preheader: 'Reserve tables that are actually waiting for you.',
    bodyHtml: `
      <p>Hi ${params.userName},</p>
      <p>Welcome to <strong>Bucr</strong> — where your reservation is guaranteed by a refundable credit deposit, so the table you book is the table you get.</p>
      <p style="margin:16px 0 8px;font-weight:bold;color:${BRAND.navy}">Here's how it works:</p>
      <ul style="margin:0 0 8px;padding-left:18px;color:${BRAND.navy}">
        <li>Discover top restaurants and book in seconds.</li>
        <li>A small credit deposit confirms your table.</li>
        <li>Show up and your deposit is refunded — plus a 3% bonus.</li>
        <li>Credits are valid for 90 days.</li>
      </ul>`,
    ctaText: 'Explore restaurants',
    ctaUrl: APP_URL,
  });
  return sendEmail({ to: params.to, subject: 'Welcome to Bucr 🎉', html });
}

/** Email a 6-digit verification code to a diner. */
export async function sendVerificationEmail(params: { to: string; userName: string; otp: string }) {
  const html = baseEmailLayout({
    heading: 'Verify your email',
    preheader: 'Your Bucr verification code',
    bodyHtml: `
      <p>Hi ${params.userName},</p>
      <p>Enter this code in the app to verify your email and start booking:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;color:${BRAND.navy};background:#f5f0e8;border-radius:8px;padding:18px;margin:18px 0">${params.otp}</p>
      <p style="color:#7a8fa6;font-size:13px">This code expires in 30 minutes. If you didn't create a Bucr account, you can ignore this email.</p>`,
  });
  return sendEmail({ to: params.to, subject: 'Verify your Bucr email', html });
}

/** Welcome email for a new vendor. */
export async function sendVendorWelcomeEmail(params: {
  to: string;
  businessName: string;
  verificationPending?: boolean;
}) {
  const nextSteps = params.verificationPending
    ? `<li><strong>Complete verification</strong> — upload your CAC and owner ID so we can approve your venue.</li>`
    : '';
  const html = baseEmailLayout({
    heading: `Welcome aboard, ${params.businessName}!`,
    preheader: 'Set up your venue and start taking guaranteed bookings.',
    bodyHtml: `
      <p>Hi ${params.businessName},</p>
      <p>Your Bucr vendor account is ready. Bucr helps you cut no-shows with credit-backed reservations and fills your tables with diners who actually turn up.</p>
      <p style="margin:16px 0 8px;font-weight:bold;color:${BRAND.navy}">Your next steps:</p>
      <ul style="margin:0 0 8px;padding-left:18px;color:${BRAND.navy}">
        ${nextSteps}
        <li>Add your menu, photos and opening hours.</li>
        <li>Set your reservation deposit in Settings.</li>
        <li>Pin your location on the map so diners can find you.</li>
      </ul>`,
    ctaText: 'Go to your dashboard',
    ctaUrl: `${APP_URL.replace(':3000', ':3001')}/dashboard`,
  });
  return sendEmail({ to: params.to, subject: `Welcome to Bucr, ${params.businessName}`, html });
}

/** Notifies a vendor by email that a new reservation was booked. */
export async function sendVendorNewReservation(params: {
  to: string;
  vendorName: string;
  guestName: string;
  date: string;
  time: string;
  partySize: number;
  reference: string;
}) {
  const html = baseEmailLayout({
    heading: 'New reservation booked',
    preheader: `${params.guestName} booked a table for ${params.partySize}.`,
    bodyHtml: `
      <p>Hi ${params.vendorName},</p>
      <p>You have a new confirmed reservation:</p>
      <table style="width:100%;border-collapse:collapse;background:${BRAND.cream};padding:12px;border-radius:8px;margin:12px 0">
        ${detailRow('Guest', params.guestName)}
        ${detailRow('Date', params.date)}
        ${detailRow('Time', params.time)}
        ${detailRow('Party size', `${params.partySize} guest(s)`)}
        ${detailRow('Reference', params.reference)}
      </table>
      <p style="font-size:13px;color:${BRAND.muted}">The guest has placed a credit deposit, so this booking is confirmed. You can turn off these emails in Settings → Notifications.</p>`,
    ctaText: 'View in dashboard',
    ctaUrl: `${APP_URL.replace(':3000', ':3001')}/reservations`,
  });
  return sendEmail({ to: params.to, subject: `New reservation — ${params.guestName}, ${params.date} ${params.time}`, html });
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
  const html = baseEmailLayout({
    heading: 'Reservation confirmed',
    preheader: `Your table at ${params.vendorName} on ${params.date} at ${params.time}.`,
    bodyHtml: `
      <p>Hi ${params.userName},</p>
      <p>Your reservation at <strong>${params.vendorName}</strong> is confirmed!</p>
      <table style="width:100%;border-collapse:collapse;background:${BRAND.cream};padding:12px;border-radius:8px;margin:12px 0">
        ${detailRow('Date', params.date)}
        ${detailRow('Time', params.time)}
        ${detailRow('Party size', `${params.partySize} guest(s)`)}
        ${detailRow('Reference', params.reference)}
      </table>
      ${params.qrCodeUrl ? `<div style="text-align:center;margin:18px 0"><p style="color:${BRAND.muted};margin:0 0 8px">Show this QR code when you arrive:</p><img src="${params.qrCodeUrl}" alt="QR Code" width="180" /></div>` : ''}
      <div style="text-align:center;font-size:22px;font-weight:bold;color:${BRAND.navy};margin:8px 0">PIN: ${params.pin}</div>
      <p style="font-size:13px;color:${BRAND.muted}">Arrive on time and your deposit is refunded plus a 3% bonus on check-in. A no-show forfeits part of your deposit.</p>`,
  });

  return sendEmail({
    to: params.to,
    subject: `Reservation confirmed at ${params.vendorName} — ${params.reference}`,
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

/** Featured spot auto-renewed successfully. */
export async function sendFeaturedRenewal(params: {
  to: string;
  vendorName: string;
  packageName: string;
  credits: number;
  endDate: string;
}) {
  const html = baseEmailLayout({
    heading: 'Your featured spot renewed',
    preheader: `${params.packageName} renewed — featured until ${params.endDate}.`,
    bodyHtml: `
      <p>Hi ${params.vendorName},</p>
      <p>Your <strong>${params.packageName}</strong> featured placement auto-renewed.</p>
      <table style="width:100%;border-collapse:collapse;background:${BRAND.cream};padding:12px;border-radius:8px;margin:12px 0">
        ${detailRow('Package', params.packageName)}
        ${detailRow('Charged', `${params.credits.toLocaleString()} credits`)}
        ${detailRow('Featured until', params.endDate)}
      </table>
      <p style="font-size:13px;color:${BRAND.muted}">You can turn auto-renew off any time from Featured Spots in your dashboard.</p>`,
    ctaText: 'View featured spots',
    ctaUrl: `${APP_URL.replace(':3000', ':3001')}/featured`,
  });
  return sendEmail({ to: params.to, subject: `Your ${params.packageName} featured spot renewed`, html });
}

/** Featured spot auto-renew failed (not enough credits) — it has lapsed. */
export async function sendFeaturedRenewalFailed(params: {
  to: string;
  vendorName: string;
  packageName: string;
  creditsNeeded: number;
  balance: number;
}) {
  const html = baseEmailLayout({
    heading: 'Featured spot didn’t renew',
    preheader: `${params.packageName} lapsed — top up to feature again.`,
    bodyHtml: `
      <p>Hi ${params.vendorName},</p>
      <p>Your <strong>${params.packageName}</strong> featured placement expired and couldn't auto-renew — you had ${params.balance.toLocaleString()} credits but it needs ${params.creditsNeeded.toLocaleString()}.</p>
      <p>Top up your credits and feature your venue again whenever you're ready.</p>`,
    ctaText: 'Top up & feature again',
    ctaUrl: `${APP_URL.replace(':3000', ':3001')}/featured`,
  });
  return sendEmail({ to: params.to, subject: `Your ${params.packageName} featured spot has lapsed`, html });
}

export async function sendCreditExpiryReminder(params: {
  to: string;
  userName: string;
  creditsExpiring: number;
  expiryDate: string;
}) {
  const html = baseEmailLayout({
    heading: 'Your credits are expiring soon',
    preheader: `${params.creditsExpiring} credits expire on ${params.expiryDate}.`,
    bodyHtml: `
      <p>Hi ${params.userName},</p>
      <div style="background:${BRAND.cream};border-left:4px solid ${BRAND.gold};padding:14px 16px;border-radius:8px;margin:14px 0">
        <strong>${params.creditsExpiring} credits</strong> (worth ₦${(params.creditsExpiring * ECONOMICS.CREDIT_VALUE_NGN).toLocaleString()}) will expire on <strong>${params.expiryDate}</strong>.
      </div>
      <p>Don't let them go to waste — book a reservation before they expire. Credits are valid for 90 days from purchase.</p>`,
    ctaText: 'Use your credits',
    ctaUrl: APP_URL,
  });

  return sendEmail({
    to: params.to,
    subject: 'Your Bucr credits are expiring soon',
    html,
  });
}
