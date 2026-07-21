import { parseDocumentId } from '@shared/api/kiosk/utils/documentId';

import { formatEcrDocumentNumber } from './formatEcrDocumentNumber';

export class EcrDocumentNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EcrDocumentNumberError';
  }
}

/** Maps customer `documentId` (e.g. V26396697) to numeric digits for the POS. */
export function documentIdToEcrDocumentNumber(documentId: string): string {
  const trimmed = documentId.trim();
  if (!trimmed) {
    throw new EcrDocumentNumberError('Documento del cliente vacío');
  }

  const { number } = parseDocumentId(trimmed);
  if (!number) {
    throw new EcrDocumentNumberError('Documento del cliente sin dígitos válidos');
  }

  return formatEcrDocumentNumber(number);
}
