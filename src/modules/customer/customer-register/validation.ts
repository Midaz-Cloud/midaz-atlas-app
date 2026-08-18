import {
  composeVenezuelaPhone,
  isValidVenezuelaPhone,
  isValidVenezuelaPhoneParts,
  type VenezuelaMobileOperatorCode,
} from '@shared/phone';
import type { CustomerDocumentType } from '@shared/api/kiosk';

export function composeRegisterPhone(
  phoneOperatorCode: VenezuelaMobileOperatorCode,
  phoneSubscriberNumber: string,
): string {
  return composeVenezuelaPhone(phoneOperatorCode, phoneSubscriberNumber);
}

export function isValidPhone(phone: string): boolean {
  return isValidVenezuelaPhone(phone);
}

export type RegisterFormValidationInput = {
  documentType: CustomerDocumentType;
  firstName: string;
  lastName: string;
  phoneOperatorCode: VenezuelaMobileOperatorCode;
  phoneSubscriberNumber: string;
  email?: string;
  requireEmail?: boolean;
};

/** Matches backend CUSTOMER_FIELD_LIMITS.email. */
export const CUSTOMER_EMAIL_MAX_LENGTH = 40;

const CUSTOMER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCustomerEmail(email: string): boolean {
  const trimmed = (email ?? '').trim();
  if (trimmed.length === 0 || trimmed.length > CUSTOMER_EMAIL_MAX_LENGTH) {
    return false;
  }
  return CUSTOMER_EMAIL_PATTERN.test(trimmed);
}

export function isRegisterFormValid(input: RegisterFormValidationInput): boolean {
  const firstName = (input.firstName ?? '').trim();
  const lastName = (input.lastName ?? '').trim();
  const phoneOk = isValidVenezuelaPhoneParts(
    input.phoneOperatorCode,
    (input.phoneSubscriberNumber ?? '').trim(),
  );

  if (!phoneOk) {
    return false;
  }

  if (input.requireEmail && !isValidCustomerEmail(input.email ?? '')) {
    return false;
  }

  if (input.documentType === 'J') {
    return firstName.length > 0;
  }

  return firstName.length > 0 && lastName.length > 0;
}
