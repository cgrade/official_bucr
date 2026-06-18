import { Resend } from 'resend';
import { config } from '@/lib/config';

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
            <p><strong>${params.creditsExpiring} credits</strong> (worth ₦${(params.creditsExpiring * 100).toLocaleString()}) will expire on <strong>${params.expiryDate}</strong>.</p>
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
