import {
  splitRegisterPrefillPhone,
  type CustomerRegisterPrefill,
} from '@shared/api/kiosk';
import {
  DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
  type VenezuelaMobileOperatorCode,
} from '@shared/phone';

import { isJuridicoDocumentId } from '../utils/customerDocument';

function normalizePrefillText(value: string | undefined | null): string {
  return (value ?? '').trim();
}

export function initialRegisterFormFromPrefill(
  documentId: string,
  prefill?: CustomerRegisterPrefill,
): {
  firstName: string;
  lastName: string;
  phoneOperatorCode: VenezuelaMobileOperatorCode;
  phoneSubscriberNumber: string;
} {
  if (!prefill) {
    return {
      firstName: '',
      lastName: '',
      phoneOperatorCode: DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
      phoneSubscriberNumber: '',
    };
  }

  const phoneParts = splitRegisterPrefillPhone(prefill);
  const isJuridico = isJuridicoDocumentId(documentId);

  if (isJuridico) {
    const businessName = [prefill.firstName, prefill.lastName]
      .map((part) => normalizePrefillText(part))
      .filter(Boolean)
      .join(' ');
    return {
      firstName: businessName,
      lastName: '',
      phoneOperatorCode: phoneParts?.operatorCode ?? DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
      phoneSubscriberNumber: phoneParts?.subscriberNumber ?? '',
    };
  }

  return {
    firstName: normalizePrefillText(prefill.firstName),
    lastName: normalizePrefillText(prefill.lastName),
    phoneOperatorCode: phoneParts?.operatorCode ?? DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
    phoneSubscriberNumber: phoneParts?.subscriberNumber ?? '',
  };
}
