import { parseDocumentId } from '@shared/api/kiosk/utils/documentId';

/** Formato visual de cédula/RIF (ej. `V 19.301.293`, Figma 205:388 / 47:2). */
export function formatAssociatedDocumentDisplay(documentId: string): string {
  const { type, number } = parseDocumentId(documentId);
  const digits = number.replace(/\D/g, '');
  if (digits.length <= 3) {
    return `${type} ${digits}`;
  }
  if (digits.length === 8) {
    return `${type} ${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length === 9 && type === 'J') {
    return `${type} ${digits.slice(0, 8)}-${digits.slice(8)}`;
  }
  const last = digits.slice(-3);
  const head = digits.slice(0, -3);
  const headFormatted = head.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${type} ${headFormatted}.${last}`;
}
