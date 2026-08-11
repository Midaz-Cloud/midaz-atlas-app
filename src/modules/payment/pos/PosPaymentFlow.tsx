import { useCallback, useState } from 'react';

import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';

import { PaymentChangeDocumentScreen } from '../PaymentChangeDocumentScreen';
import { resolvePaymentPayerDocumentId } from '../utils/resolvePaymentPayerDocumentId';
import { PosPaymentScreen } from './PosPaymentScreen';

export type PosPaymentFlowStep = 'pos' | 'change-document';

export type PosPaymentFlowProps = {
  onBack: () => void;
  onContinue: () => void;
};

export function PosPaymentFlow({
  onBack,
  onContinue,
}: PosPaymentFlowProps) {
  const { customer } = useKioskCustomer();
  const { paymentPayerDocumentId, setPaymentPayerDocumentId } = useKioskOrder();
  const [step, setStep] = useState<PosPaymentFlowStep>('pos');

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
      onBack={onBack}
      onContinue={onContinue}
      onChangeDocument={() => setStep('change-document')}
    />
  );
}
