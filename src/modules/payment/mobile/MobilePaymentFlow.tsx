import { useCallback, useState } from 'react';

import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';

import { MAX_REFERENCE_ATTEMPTS } from '../reference/types';
import { ReferenceErrorScreen } from '../reference/ReferenceErrorScreen';
import { ReferenceVerifyingScreen } from '../reference/ReferenceVerifyingScreen';
import { PaymentChangeDocumentScreen } from '../PaymentChangeDocumentScreen';
import { resolvePaymentPayerDocumentId } from '../utils/resolvePaymentPayerDocumentId';
import { MobilePaymentAccountScreen } from './MobilePaymentAccountScreen';
import { MobilePaymentScreen } from './MobilePaymentScreen';
import { useMobilePaymentValidation } from './hooks/useMobilePaymentValidation';
import { useMobilePaymentPayerForm } from './hooks/useMobilePaymentPayerForm';

export type MobilePaymentFlowStep =
  | 'account'
  | 'confirm'
  | 'change-document'
  | 'verifying'
  | 'error';

export type MobilePaymentFlowProps = {
  onBack: () => void;
  onValidated: () => void;
  onRequestHelp?: () => void;
};

export function MobilePaymentFlow({
  onBack,
  onValidated,
  onRequestHelp,
}: MobilePaymentFlowProps) {
  const { customer } = useKioskCustomer();
  const { paymentPayerDocumentId, setPaymentPayerDocumentId } =
    useKioskOrder();
  const [step, setStep] = useState<MobilePaymentFlowStep>('account');
  const [attemptCount, setAttemptCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const payerForm = useMobilePaymentPayerForm();
  const { validate } = useMobilePaymentValidation();

  const effectivePayerDocumentId = resolvePaymentPayerDocumentId(
    paymentPayerDocumentId,
    customer?.documentId,
  );

  const handleValidate = useCallback(async () => {
    const base = payerForm.buildPayloadBase();
    if (!base) {
      return;
    }
    setStep('verifying');
    const result = await validate(base);
    if (result.ok) {
      onValidated();
      return;
    }
    setErrorMessage(result.message);
    setAttemptCount((n) => n + 1);
    setStep('error');
  }, [onValidated, payerForm, validate]);

  const handleRetry = useCallback(() => {
    payerForm.resetForm();
    setErrorMessage(undefined);
    setStep('confirm');
  }, [payerForm]);

  const handleErrorBack = useCallback(() => {
    setStep('confirm');
  }, []);

  const handleRequestHelp = useCallback(() => {
    onRequestHelp?.();
  }, [onRequestHelp]);

  const handleChangeDocument = useCallback(() => {
    setStep('change-document');
  }, []);

  const handleChangeDocumentBack = useCallback(() => {
    setStep('confirm');
  }, []);

  const handleChangeDocumentContinue = useCallback(
    (documentId: string) => {
      setPaymentPayerDocumentId(documentId);
      setStep('confirm');
    },
    [setPaymentPayerDocumentId],
  );

  if (step === 'account') {
    return (
      <MobilePaymentAccountScreen
        onBack={onBack}
        onContinue={() => setStep('confirm')}
      />
    );
  }

  if (step === 'change-document') {
    return (
      <PaymentChangeDocumentScreen
        initialDocumentId={effectivePayerDocumentId}
        onBack={handleChangeDocumentBack}
        onContinue={handleChangeDocumentContinue}
        testIdPrefix="payment-mobile-change-document"
      />
    );
  }

  if (step === 'verifying') {
    return <ReferenceVerifyingScreen />;
  }

  if (step === 'error') {
    return (
      <ReferenceErrorScreen
        blocked={attemptCount >= MAX_REFERENCE_ATTEMPTS}
        message={errorMessage}
        onBack={handleErrorBack}
        onRetry={handleRetry}
        onRequestHelp={handleRequestHelp}
      />
    );
  }

  return (
    <MobilePaymentScreen
      payerForm={payerForm}
      onBack={() => setStep('account')}
      onValidate={() => void handleValidate()}
      onChangeDocument={handleChangeDocument}
    />
  );
}
