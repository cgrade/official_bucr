import { config } from '@/lib/config';

interface SendSmsParams {
  to: string;
  message: string;
}

interface TermiiResponse {
  code: string;
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

/**
 * Send SMS via Termii API
 */
export async function sendSms({ to, message }: SendSmsParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.sms.termiiApiKey) {
      console.log('SMS service not configured, skipping SMS send');
      return { success: false, error: 'SMS service not configured' };
    }

    // Format phone number (ensure it starts with country code)
    const formattedPhone = to.startsWith('+') ? to.slice(1) : to.startsWith('234') ? to : `234${to.slice(1)}`;

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.sms.termiiApiKey,
        to: formattedPhone,
        from: config.sms.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    });

    const data = await response.json() as TermiiResponse;

    if (data.code === 'ok') {
      return { success: true };
    }

    console.error('SMS send error:', data);
    return { success: false, error: data.message };
  } catch (error) {
    console.error('SMS service error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send OTP via Termii
 */
export async function sendOtp(params: {
  to: string;
  pinType?: 'NUMERIC' | 'ALPHANUMERIC';
  pinLength?: number;
  pinTimeToLive?: number;
  pinAttempts?: number;
}): Promise<{ success: boolean; pinId?: string; error?: string }> {
  try {
    if (!config.sms.termiiApiKey) {
      console.log('SMS service not configured, skipping OTP send');
      return { success: false, error: 'SMS service not configured' };
    }

    const formattedPhone = params.to.startsWith('+') 
      ? params.to.slice(1) 
      : params.to.startsWith('234') 
        ? params.to 
        : `234${params.to.slice(1)}`;

    const response = await fetch('https://api.ng.termii.com/api/sms/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.sms.termiiApiKey,
        message_type: 'NUMERIC',
        to: formattedPhone,
        from: config.sms.senderId,
        channel: 'generic',
        pin_attempts: params.pinAttempts || 3,
        pin_time_to_live: params.pinTimeToLive || 10, // minutes
        pin_length: params.pinLength || 6,
        pin_placeholder: '< 1234 >',
        message_text: `Your Bucr verification code is < 1234 >. Valid for ${params.pinTimeToLive || 10} minutes.`,
        pin_type: params.pinType || 'NUMERIC',
      }),
    });

    const data = await response.json();

    if (data.pinId) {
      return { success: true, pinId: data.pinId };
    }

    console.error('OTP send error:', data);
    return { success: false, error: data.message || 'Failed to send OTP' };
  } catch (error) {
    console.error('OTP service error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Verify OTP via Termii
 */
export async function verifyOtp(params: {
  pinId: string;
  pin: string;
}): Promise<{ success: boolean; verified: boolean; error?: string }> {
  try {
    if (!config.sms.termiiApiKey) {
      return { success: false, verified: false, error: 'SMS service not configured' };
    }

    const response = await fetch('https://api.ng.termii.com/api/sms/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.sms.termiiApiKey,
        pin_id: params.pinId,
        pin: params.pin,
      }),
    });

    const data = await response.json();

    if (data.verified === true || data.verified === 'true') {
      return { success: true, verified: true };
    }

    return { success: true, verified: false, error: data.message };
  } catch (error) {
    console.error('OTP verify error:', error);
    return { success: false, verified: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send reservation reminder SMS
 */
export async function sendReservationReminder(params: {
  to: string;
  vendorName: string;
  date: string;
  time: string;
  reference: string;
}) {
  const message = `Reminder: Your reservation at ${params.vendorName} is tomorrow at ${params.time}. Reference: ${params.reference}. Don't forget to show up to get your credits back + bonus! - Bucr`;
  return sendSms({ to: params.to, message });
}

/**
 * Send password reset OTP via SMS
 */
export async function sendPasswordResetSms(params: {
  to: string;
  otp: string;
}) {
  const message = `Your Bucr password reset code is ${params.otp}. Valid for 10 minutes. Do not share this code.`;
  return sendSms({ to: params.to, message });
}

/**
 * Send phone verification OTP
 */
export async function sendPhoneVerificationSms(params: {
  to: string;
  otp: string;
}) {
  const message = `Your Bucr verification code is ${params.otp}. Valid for 10 minutes.`;
  return sendSms({ to: params.to, message });
}
