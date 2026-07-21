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
};

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

  if (input.documentType === 'J') {
    return firstName.length > 0;
  }

  return firstName.length > 0 && lastName.length > 0;
}
