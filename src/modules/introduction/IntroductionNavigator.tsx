import { useCallback, useState } from 'react';

import {
  getInitialIntroductionStep,
  getIntroductionFlowFlags,
  getStepAfterHome,
} from './introductionFlow';
import { useSessionLocale } from '@shared/i18n';
import { useKioskSession } from '@shared/session';
import { HomeScreen } from './home/HomeScreen';
import {
  AdminDashboardScreen,
  FailedPaymentDetailScreen,
  FailedPaymentsListScreen,
} from './home/components';
import { LanguageSelectionScreen } from './language-selection/LanguageSelectionScreen';
import { OrderTypeScreen } from './order-type/OrderTypeScreen';
import type { IntroductionStep, OrderType } from './types';
import { fulfillmentToOrderType, type KioskOrderTypeChoice } from '@shared/api/kiosk';

type IntroductionNavigatorProps = {
  onComplete: (orderType?: OrderType) => void;
};

export function IntroductionNavigator({ onComplete }: IntroductionNavigatorProps) {
  const { runtimeConfig, setOrderSelection } = useKioskSession();
  const { languageSwitcherEnabled, enabledLocales } = useSessionLocale();
  const flowFlags = getIntroductionFlowFlags(
    runtimeConfig?.orderTypeSelectionEnabled,
  );
  const [step, setStep] = useState<IntroductionStep>(getInitialIntroductionStep);
  const [selectedFailedPaymentId, setSelectedFailedPaymentId] = useState<
    number | null
  >(null);

  const advanceFromHome = useCallback(() => {
    const next = getStepAfterHome(flowFlags);
    if (next === 'complete') {
      // 0 opciones: no se le pregunta nada al cliente y la orden va como consumo
      // en el local. 1 opción: se aplica sola, sin pantalla de por medio.
      const onlyChoice = runtimeConfig?.orderTypeChoices?.[0];
      setOrderSelection(onlyChoice);
      onComplete(onlyChoice ? fulfillmentToOrderType(onlyChoice.fulfillment) : 'dineIn');
      return;
    }
    setStep(next);
  }, [flowFlags, onComplete, runtimeConfig, setOrderSelection]);

  const advanceFromOrderType = useCallback(
    (choice: KioskOrderTypeChoice) => {
      setOrderSelection(choice);
      onComplete(fulfillmentToOrderType(choice.fulfillment));
    },
    [onComplete, setOrderSelection],
  );

  const goBackToHome = useCallback(() => {
    setStep('home');
  }, []);

  const openLanguageFromHome = useCallback(() => {
    if (!languageSwitcherEnabled) {
      return;
    }
    setStep('language');
  }, [languageSwitcherEnabled]);

  const openAdminFromHome = useCallback(() => {
    setStep('admin');
  }, []);

  const openFailedPayments = useCallback(() => {
    setStep('failedPayments');
  }, []);

  const openFailedPaymentDetail = useCallback((id: number) => {
    setSelectedFailedPaymentId(id);
    setStep('failedPaymentDetail');
  }, []);

  const backFromFailedPaymentDetail = useCallback(() => {
    setSelectedFailedPaymentId(null);
    setStep('failedPayments');
  }, []);

  if (step === 'home') {
    return (
      <HomeScreen
        onStart={advanceFromHome}
        onLanguagePress={openLanguageFromHome}
        languageSwitcherEnabled={languageSwitcherEnabled}
        onAdminPress={openAdminFromHome}
      />
    );
  }

  if (step === 'language') {
    return (
      <LanguageSelectionScreen
        enabledLocales={enabledLocales}
        onContinue={goBackToHome}
        onBack={goBackToHome}
      />
    );
  }

  if (step === 'admin') {
    return (
      <AdminDashboardScreen
        onBack={goBackToHome}
        onOpenFailedPayments={openFailedPayments}
      />
    );
  }

  if (step === 'failedPayments') {
    return (
      <FailedPaymentsListScreen
        onBack={() => setStep('admin')}
        onSelect={openFailedPaymentDetail}
      />
    );
  }

  if (step === 'failedPaymentDetail' && selectedFailedPaymentId != null) {
    return (
      <FailedPaymentDetailScreen
        paymentId={selectedFailedPaymentId}
        onBack={backFromFailedPaymentDetail}
      />
    );
  }

  return (
    <OrderTypeScreen onContinue={advanceFromOrderType} onBack={goBackToHome} />
  );
}
