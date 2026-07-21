import { parseDocumentId, type CustomerDocumentType } from '@shared/api/kiosk';

export function getCustomerDocumentType(documentId: string): CustomerDocumentType {
  return parseDocumentId(documentId).type;
}

export function isJuridicoDocumentId(documentId: string): boolean {
  return getCustomerDocumentType(documentId) === 'J';
}
