import { useCallback, useMemo, useState } from 'react';

import {
  isValidDocumentId,
  normalizeDocumentId,
  type KioskBank,
} from '@shared/api/kiosk';
import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';
import {
  composeVenezuelaPhone,
  DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
  isValidVenezuelaPhoneParts,
  parseVenezuelaPhone,
  type VenezuelaMobileOperatorCode,
} from '@shared/phone/venezuelaPhone';

import { REFERENCE_SUFFIX_LENGTH } from '../../reference/types';
import { resolvePaymentPayerDocumentId } from '../../utils/resolvePaymentPayerDocumentId';

export type MobilePaymentPayerFormState = {
  selectedBank: KioskBank | null;
  reference: string;
  cedula: string;
  phone: string;
};

export function useMobilePaymentPayerForm() {
  const { customer } = useKioskCustomer();
  const { paymentPayerDocumentId } = useKioskOrder();
  const [selectedBank, setSelectedBank] = useState<KioskBank | null>(null);
  const [reference, setReference] = useState('');
  const [operatorCode, setOperatorCode] = useState<VenezuelaMobileOperatorCode>(
    DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
  );
  const [subscriberNumber, setSubscriberNumber] = useState('');

  const cedula = useMemo(
    () =>
      resolvePaymentPayerDocumentId(
        paymentPayerDocumentId,
        customer?.documentId,
      ),
    [customer?.documentId, paymentPayerDocumentId],
  );

  const phone = useMemo(
    () => composeVenezuelaPhone(operatorCode, subscriberNumber),
    [operatorCode, subscriberNumber],
  );

  const canValidate = useMemo(() => {
    if (!selectedBank?.code?.trim()) {
      return false;
    }
    if (reference.trim().length !== REFERENCE_SUFFIX_LENGTH) {
      return false;
    }
    if (!isValidDocumentId(cedula)) {
      return false;
    }
    if (!isValidVenezuelaPhoneParts(operatorCode, subscriberNumber)) {
      return false;
    }
    return true;
  }, [cedula, operatorCode, reference, selectedBank, subscriberNumber]);

  const resetForm = useCallback(() => {
    setSelectedBank(null);
    setReference('');
    setOperatorCode(DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE);
    setSubscriberNumber('');
  }, []);

  const hydratePhone = useCallback((raw: string) => {
    const parsed = parseVenezuelaPhone(raw);
    setOperatorCode(parsed.operatorCode);
    setSubscriberNumber(parsed.subscriberNumber);
  }, []);

  const buildPayloadBase = useCallback(() => {
    if (!selectedBank || !canValidate) {
      return null;
    }
    return {
      bankCode: selectedBank.code,
      bankName: selectedBank.name,
      reference: reference.trim(),
      cedula: normalizeDocumentId(cedula),
      phone: composeVenezuelaPhone(operatorCode, subscriberNumber),
    };
  }, [canValidate, cedula, operatorCode, reference, selectedBank, subscriberNumber]);

  return {
    selectedBank,
    setSelectedBank,
    reference,
    setReference,
    operatorCode,
    setOperatorCode,
    subscriberNumber,
    setSubscriberNumber,
    hydratePhone,
    cedula,
    phone,
    canValidate,
    resetForm,
    buildPayloadBase,
  };
}
