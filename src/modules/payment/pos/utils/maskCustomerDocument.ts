import { parseDocumentId } from '@shared/api/kiosk/utils/documentId';

/** Display-only mask for payer document on POS screen (e.g. V-•••••697). */
export function maskCustomerDocument(documentId: string): string {
  const { type, number } = parseDocumentId(documentId);
  const digits = number.replace(/\D/g, '');
  if (digits.length <= 3) {
    return `${type}${digits}`;
  }
  const visible = digits.slice(-3);
  const masked = '•'.repeat(Math.max(digits.length - 3, 4));
  return `${type}-${masked}${visible}`;
}
