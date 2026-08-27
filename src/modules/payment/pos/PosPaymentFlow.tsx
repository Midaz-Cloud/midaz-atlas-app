import { useCallback, useState } from 'react';

import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';

import { PaymentChangeDocumentScreen } from '../PaymentChangeDocumentScreen';
import { resolvePaymentPayerDocumentId } from '../utils/resolvePaymentPayerDocumentId';
import { PosCardTypeScreen } from './PosCardTypeScreen';
import { PosPaymentScreen } from './PosPaymentScreen';

import type { CardKind } from '@shared/kiosk-order';

export type PosPaymentFlowStep = 'card-type' | 'pos' | 'change-document';

export type PosPaymentFlowProps = {
  onBack: () => void;
  onContinue: () => void;
};

export function PosPaymentFlow({
  onBack,
  onContinue,
}: PosPaymentFlowProps) {
  const { customer } = useKioskCustomer();
  const { paymentPayerDocumentId, setPaymentPayerDocumentId, cardKind, setCardKind } =
    useKioskOrder();
  // Arranca preguntando débito/crédito: el terminal no lo dice de forma fiable.
  const [step, setStep] = useState<PosPaymentFlowStep>('card-type');

  const handleSelectCardKind = useCallback(
    (kind: CardKind) => {
      setCardKind(kind);
      setStep('pos');
    },
    [setCardKind],
  );

  const effectivePayerDocumentId = resolvePaymentPayerDocumentId(
    paymentPayerDocumentId,
    customer?.documentId,
  );

  const handleChangeDocumentContinue = useCallback(
    (documentId: string) => {
      setPaymentPayerDocumentId(documentId);
      setStep('pos');
    },
    [setPaymentPayerDocumentId],
  );

  if (step === 'card-type') {
    return (
      <PosCardTypeScreen
        onBack={onBack}
        onSelect={handleSelectCardKind}
        selected={cardKind}
      />
    );
  }

  if (step === 'change-document') {
    return (
      <PaymentChangeDocumentScreen
        initialDocumentId={effectivePayerDocumentId}
        onBack={() => setStep('pos')}
        onContinue={handleChangeDocumentContinue}
        testIdPrefix="payment-pos-change-document"
      />
    );
  }

  return (
    <PosPaymentScreen
      onBack={() => setStep('card-type')}
      onContinue={onContinue}
      onChangeDocument={() => setStep('change-document')}
    />
  );
}
