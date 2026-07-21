import { useCallback, useState } from 'react';

import type { TransferPaymentMethodId } from '../types';
import { ReferenceEntryScreen } from './ReferenceEntryScreen';
import { ReferenceErrorScreen } from './ReferenceErrorScreen';
import { ReferenceVerifyingScreen } from './ReferenceVerifyingScreen';
import { useReferenceVerification } from './hooks/useReferenceVerification';
import {
  MAX_REFERENCE_ATTEMPTS,
  REFERENCE_SUFFIX_LENGTH,
  type ReferenceFlowStep,
} from './types';
import type { VerifyReferenceResult } from './services/verifyPaymentReference';

export type TransferReferenceFlowProps = {
  methodId: TransferPaymentMethodId;
  onBackToAccount: () => void;
  onReferenceValidated: () => void;
  onRequestHelp?: () => void;
};

export function TransferReferenceFlow({
  methodId,
  onBackToAccount,
  onReferenceValidated,
  onRequestHelp,
}: TransferReferenceFlowProps) {
  const [step, setStep] = useState<ReferenceFlowStep>('enter');
  const [reference, setReference] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);

  const handleVerificationResult = useCallback(
    (result: VerifyReferenceResult) => {
      if (result === 'ok') {
        onReferenceValidated();
        return;
      }
      setAttemptCount((n) => n + 1);
      setStep('error');
    },
    [onReferenceValidated],
  );

  useReferenceVerification({
    methodId,
    suffix: reference,
    enabled: step === 'verifying',
    onResult: handleVerificationResult,
  });

  const handleValidate = useCallback(() => {
    if (reference.length !== REFERENCE_SUFFIX_LENGTH) {
      return;
    }
    setStep('verifying');
  }, [reference]);

  const handleRetry = useCallback(() => {
    setReference('');
    setStep('enter');
  }, []);

  const handleErrorBack = useCallback(() => {
    setStep('enter');
  }, []);

  const handleRequestHelp = useCallback(() => {
    if (onRequestHelp) {
      onRequestHelp();
    }
  }, [onRequestHelp]);

  if (step === 'verifying') {
    return <ReferenceVerifyingScreen />;
  }

  if (step === 'error') {
    return (
      <ReferenceErrorScreen
        blocked={attemptCount >= MAX_REFERENCE_ATTEMPTS}
        onBack={handleErrorBack}
        onRetry={handleRetry}
        onRequestHelp={handleRequestHelp}
      />
    );
  }

  return (
    <ReferenceEntryScreen
      methodId={methodId}
      reference={reference}
      onBack={onBackToAccount}
      onReferenceChange={setReference}
      onValidate={handleValidate}
    />
  );
}
