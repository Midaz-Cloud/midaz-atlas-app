import { getKioskQrGeneratorUrl } from '@shared/config/api';
import { loadAccessToken } from './tokenStorage';
import type { KioskPagoMovilAccount } from './types';

export type PagoMovilDisplayFields = {
  bank: string;
  phone: string;
  documentId: string;
  holder: string;
};

export function sanitizePagoMovilName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, '') // Keep only letters, numbers, and spaces
    .slice(0, 30)                  // Limit to 30 characters for maximum safety
    .trim();                       // Trim leading/trailing spaces
}

export async function generatePagoMovilQrCode(
  account: KioskPagoMovilAccount,
  amountVes: number,
): Promise<string> {
  const url = getKioskQrGeneratorUrl();
  const token = await loadAccessToken();

  // According to KIOSK_DEVELOPER_GUIDE-UPDATE-10.md, the new endpoint is POST /kiosk/generate-payment-qr
  // which expects: bankCode, cedula, phone, amountVES, name, description
  const payload = {
    bankCode: account.bankCode?.trim() ?? '',
    cedula: account.cedula?.trim() ?? '',
    phone: account.phone?.trim() ?? '',
    amountVES: amountVes.toFixed(2), // The guide specifies "amountVES" as a string (accepts point or comma decimal)
    name: sanitizePagoMovilName(account.holder?.trim() ?? 'Pago Movil'),
    description: 'Pedido kiosko',
  };

  console.log('[generatePagoMovilQrCode] Request URL:', url);
  console.log('[generatePagoMovilQrCode] Request Payload:', JSON.stringify(payload, null, 2));
  console.log('[generatePagoMovilQrCode] Has Authorization Token:', !!token);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log('[generatePagoMovilQrCode] Response Status:', response.status, response.statusText);

  if (!response.ok) {
    let errorMsg = `Failed to generate QR code: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.text();
      errorMsg += ` - Body: ${errBody}`;
    } catch {
      // Ignore body read error
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (data.error || data.success === false) {
    throw new Error(data.error || 'Failed to generate QR code (success: false)');
  }

  return data.qrCode; // Returns the base64 data URI string
}

export function formatPagoMovilBankLine(account: KioskPagoMovilAccount): string {
  const bank = account.bank?.trim() ?? '';
  const bankCode = account.bankCode?.trim() ?? '';
  if (bank && bankCode) {
    return `${bank} (${bankCode})`;
  }
  return bank || bankCode;
}

export function mapPagoMovilAccountToDisplay(
  account: KioskPagoMovilAccount,
): PagoMovilDisplayFields {
  return {
    bank: formatPagoMovilBankLine(account),
    phone: account.phone?.trim() ?? '',
    documentId: account.cedula?.trim() ?? '',
    holder: account.holder?.trim() ?? '',
  };
}

/** True when at least one destination field is present (live API may send partial data). */
export function isPagoMovilAccountConfigured(
  account: KioskPagoMovilAccount | null | undefined,
): boolean {
  if (!account) {
    return false;
  }
  return Boolean(
    account.bank?.trim() ||
      account.bankCode?.trim() ||
      account.phone?.trim() ||
      account.cedula?.trim() ||
      account.holder?.trim(),
  );
}
