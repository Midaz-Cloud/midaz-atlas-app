import { useCallback, useState } from 'react';



import { IntroductionNavigator } from '@modules/introduction/IntroductionNavigator';

import { OrderingNavigator } from '@modules/ordering/OrderingNavigator';
import { RetailOrderingNavigator } from '@modules/ordering/retail/RetailOrderingNavigator';

import { PaymentFlowNavigator } from '@modules/payment/PaymentFlowNavigator';
import { useKioskCustomer } from '@shared/customer';

import { DemoModeBanner } from '@shared/ui/DemoModeBanner';

import { KioskInactivityProvider } from '@shared/inactivity';

import { useSessionLocale } from '@shared/i18n';

import { useKioskOrder } from '@shared/kiosk-order';
import { useKioskSession } from '@shared/session';
import { KioskScreenThemeProvider } from '@shared/theme';
import type { OrderType } from '@modules/introduction/types';



import { getInitialFlowStep, resetKioskSession, type KioskFlowStep } from './kioskSession';



export { resetKioskSession } from './kioskSession';



export function AppNavigator() {

  const [flowStep, setFlowStep] = useState<KioskFlowStep>(getInitialFlowStep);

  const [resumeCartCheckout, setResumeCartCheckout] = useState(false);

  const { itemCount, getCheckoutSnapshot, resetOrder } = useKioskOrder();
  const { setOrderType, setTableNumber, runtimeConfig } = useKioskSession();

  const { resetSession } = useSessionLocale();
  const { clearCustomer } = useKioskCustomer();

  const completeIntroduction = useCallback(
    (orderType?: OrderType) => {
      if (orderType) {
        setOrderType(orderType);
      }
      setFlowStep('ordering');
    },
    [setOrderType],
  );



  const handleProceedToPayment = useCallback(() => {

    if (itemCount === 0) {

      return;

    }

    getCheckoutSnapshot();

    setTableNumber(undefined);

    setResumeCartCheckout(false);

    setFlowStep('payment');

  }, [getCheckoutSnapshot, itemCount, setTableNumber]);



  const handleBackToCart = useCallback(() => {

    setTableNumber(undefined);

    setResumeCartCheckout(true);

    setFlowStep('ordering');

  }, [setTableNumber]);

  const handleInitialCartCheckoutConsumed = useCallback(() => {
    setResumeCartCheckout(false);
  }, []);



  /** Intro / idle / pago terminado: vacía carrito, cliente y vuelve a home. */
  const handleExitToIntroduction = useCallback(async () => {
    setTableNumber(undefined);
    setResumeCartCheckout(false);
    await resetKioskSession({
      flowStep,
      setFlowStep,
      resetLocale: resetSession,
      resetOrder,
      clearCustomer,
    });
  }, [flowStep, resetSession, resetOrder, clearCustomer, setTableNumber]);

  const handleSessionComplete = handleExitToIntroduction;
  const handleSessionExpire = handleExitToIntroduction;

  const isRetailMode = runtimeConfig?.foodServiceEnabled === false;

  let flowContent;

  if (flowStep === 'introduction') {

    flowContent = <IntroductionNavigator onComplete={completeIntroduction} />;

  } else if (flowStep === 'payment') {

    flowContent = (

      <PaymentFlowNavigator

        onBackToCart={handleBackToCart}

        onSessionComplete={handleSessionComplete}

      />

    );

  } else {
    flowContent = isRetailMode ? (
      <RetailOrderingNavigator
        onExit={() => {
          void handleExitToIntroduction();
        }}
        onProceedToPayment={handleProceedToPayment}
      />
    ) : (
      <OrderingNavigator
        initialCartCheckoutOpen={resumeCartCheckout}
        onInitialCartCheckoutConsumed={handleInitialCartCheckoutConsumed}
        onExit={() => {
          void handleExitToIntroduction();
        }}
        onProceedToPayment={handleProceedToPayment}
      />
    );
  }



  return (

    <KioskScreenThemeProvider>
      <KioskInactivityProvider flowStep={flowStep} onSessionExpire={handleSessionExpire}>
        {flowContent}
        <DemoModeBanner />
      </KioskInactivityProvider>
    </KioskScreenThemeProvider>

  );

}


