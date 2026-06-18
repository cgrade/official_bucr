import QRCode from 'qrcode';
import { config } from '@/lib/config';

export interface QRCodeData {
  type: 'reservation' | 'order' | 'event_ticket' | 'event_bundle';
  id: string;
  reference?: string;
  pin?: string;
  [key: string]: any;
}

export async function generateQRCode(data: QRCodeData): Promise<string> {
  const qrData = JSON.stringify({
    ...data,
    app: config.app.name,
    timestamp: Date.now(),
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return qrCodeDataUrl;
}

export async function generateQRCodeBuffer(data: QRCodeData): Promise<Buffer> {
  const qrData = JSON.stringify({
    ...data,
    app: config.app.name,
    timestamp: Date.now(),
  });

  return QRCode.toBuffer(qrData, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 300,
    margin: 2,
  });
}

export function parseQRCodeData(qrString: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(qrString);
    if (parsed.type && parsed.id && parsed.reference && parsed.pin) {
      return {
        type: parsed.type,
        id: parsed.id,
        reference: parsed.reference,
        pin: parsed.pin,
      };
    }
    return null;
  } catch {
    return null;
  }
}
