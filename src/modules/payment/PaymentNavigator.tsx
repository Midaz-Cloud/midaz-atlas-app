import { useCallback, useEffect, useMemo, useState } from 'react';



import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';

import type { CashierAssistanceReason } from './assistance/services/requestCashierAssistance';

import { CallCashierScreen } from './assistance/CallCashierScreen';

import { getEnabledPaymentMethods } from './data/getEnabledPaymentMethods';
import { executePosCardPayment } from './pos/services/executePosCardPayment';
import { useKioskSession } from '@shared/session';
import { useEcrConnection } from '@shared/peripherals/ecr';
import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';
import { shouldSimulatePosFailure } from '@shared/config';

import { PaymentFlowPlaceholder } from './components/PaymentFlowPlaceholder';

import { CashPaymentScreen } from './cash/CashPaymentScreen';

import { MobilePaymentFlow } from './mobile/MobilePaymentFlow';

import { OrderOutcomeScreen } from './outcome/OrderOutcomeScreen';

import type { OrderOutcomeVariant } from './outcome/types';

import { PaymentErrorScreen } from './payment-error/PaymentErrorScreen';

import { OrderProcessingScreen } from './processing/OrderProcessingScreen';

import type { ProcessKioskOrderResult } from './processing/types';

import { PaymentMethodScreen } from './payment-method/PaymentMethodScreen';

import { PosPaymentFlow } from './pos/PosPaymentFlow';
import { resolvePaymentPayerDocumentId } from './utils/resolvePaymentPayerDocumentId';

import { TransferReferenceFlow } from './reference/TransferReferenceFlow';

import { ZellePaymentScreen } from './zelle/ZellePaymentScreen';

import type { CartReserveItemResult } from '@shared/api/kiosk';
import { CartStockShortageScreen } from '@modules/ordering/stock/CartStockShortageScreen';
import { adjustCartForStockShortages } from '@modules/ordering/stock/adjustCartForStockShortages';
import { reserveCartBeforePayment } from './services/reserveCartBeforePayment';

import type { PaymentMethodId, TransferPaymentMethodId } from './types';



type PaymentRoute =

  | { name: 'method-select' }

  | { name: 'flow'; methodId: PaymentMethodId }

  | { name: 'cash' }

  | { name: 'reference'; methodId: TransferPaymentMethodId }

  | { name: 'processing' }

  | { name: 'outcome'; variant: OrderOutcomeVariant }

  | {
      name: 'payment-error';
      methodId: PaymentMethodId;
      posReference?: string;
      orderRegistrationFailed?: boolean;
    }

  | { name: 'assistance'; reason: CashierAssistanceReason }
  | { name: 'stock-shortage'; shortages: CartReserveItemResult[] };



export type PaymentNavigatorProps = {
  onBackToCart: () => void;
  onSessionComplete: () => void;
};



function isTransferMethodId(

  methodId: PaymentMethodId,

): methodId is TransferPaymentMethodId {

  return methodId === 'zelle';

}



export function PaymentNavigator({

  onBackToCart,

  onSessionComplete,

}: PaymentNavigatorProps) {

  const { itemCount, lines, setOrderId, setPaymentMethodId, setCardPaymentPayload, totals, paymentPayerDocumentId, setReservationId, decrementLine, removeLine } =
    useKioskOrder();
  const { customer } = useKioskCustomer();
  const { runtimeConfig, refreshCatalogAfterPurchase } = useKioskSession();
  const ecr = useEcrConnection();
  const [posPaymentBusy, setPosPaymentBusy] = useState(false);
  const [reserveBusy, setReserveBusy] = useState(false);

  const enabledMethods = useMemo(
    () =>
      getEnabledPaymentMethods(runtimeConfig?.enabledPaymentMethods, {
        pagoMovilAccount: runtimeConfig?.raw.pagoMovilAccount,
      }),
    [runtimeConfig?.enabledPaymentMethods, runtimeConfig?.raw.pagoMovilAccount],
  );

  const [route, setRoute] = useState<PaymentRoute>({ name: 'method-select' });
  const [lastPaymentMethodId, setLastPaymentMethodId] = useState<PaymentMethodId>('pos');
  const [orderRetryCount, setOrderRetryCount] = useState(0);

  /** Sync route + order payment method when enabled methods resolve (avoids stale single-method POS skip). */
  useEffect(() => {
    if (enabledMethods.length === 0) {
      return;
    }

    if (enabledMethods.length === 1) {
      const methodId = enabledMethods[0]!.id;
      setPaymentMethodId(methodId);
      setLastPaymentMethodId(methodId);
      if (methodId === 'cash') {
        void (async () => {
          setReserveBusy(true);
          try {
            const result = await reserveCartBeforePayment(lines);
            if (result.ok) {
              setReservationId(result.reservationId);
              setRoute({ name: 'processing' });
              return;
            }
            setRoute({ name: 'stock-shortage', shortages: result.shortages });
          } catch {
            setRoute({ name: 'payment-error', methodId });
          } finally {
            setReserveBusy(false);
          }
        })();
        return;
      }
      setRoute({ name: 'flow', methodId });
      return;
    }

    setRoute((prev) => {
      if (
        prev.name === 'processing' ||
        prev.name === 'outcome' ||
        prev.name === 'assistance' ||
        prev.name === 'payment-error' ||
        prev.name === 'reference' ||
        prev.name === 'cash'
      ) {
        return prev;
      }
      if (prev.name === 'flow' && enabledMethods.some((m) => m.id === prev.methodId)) {
        return prev;
      }
      return { name: 'method-select' };
    });
  }, [enabledMethods, lines, setPaymentMethodId, setReservationId]);

  useEffect(() => {
    if (route.name === 'flow') {
      setPaymentMethodId(route.methodId);
      setLastPaymentMethodId(route.methodId);
    }
  }, [route, setPaymentMethodId]);

  useEffect(() => {

    if (itemCount === 0 && route.name !== 'outcome' && route.name !== 'assistance') {

      onBackToCart();

    }

  }, [itemCount, onBackToCart, route.name]);



  const proceedAfterReserve = useCallback(
    async (onSuccess: () => void, methodId: PaymentMethodId = lastPaymentMethodId) => {
      setReserveBusy(true);
      try {
        const result = await reserveCartBeforePayment(lines);
        if (result.ok) {
          setReservationId(result.reservationId);
          onSuccess();
          return;
        }
        setRoute({ name: 'stock-shortage', shortages: result.shortages });
      } catch {
        setRoute({ name: 'payment-error', methodId });
      } finally {
        setReserveBusy(false);
      }
    },
    [lastPaymentMethodId, lines, setReservationId],
  );

  const handleSelectMethod = useCallback((methodId: PaymentMethodId) => {

    setPaymentMethodId(methodId);
    setLastPaymentMethodId(methodId);

    if (methodId === 'cash') {
      void proceedAfterReserve(() => setRoute({ name: 'processing' }), methodId);
      return;
    }

    setRoute({ name: 'flow', methodId });

  }, [proceedAfterReserve, setPaymentMethodId]);



  const handleBackFromFlow = useCallback(() => {

    if (enabledMethods.length === 1) {

      onBackToCart();

      return;

    }

    setRoute({ name: 'method-select' });

  }, [enabledMethods.length, onBackToCart]);



  const goToProcessing = useCallback(() => {

    setRoute({ name: 'processing' });

  }, []);



  const handleFlowContinue = useCallback(

    (methodId: PaymentMethodId) => {

      setLastPaymentMethodId(methodId);

      if (isTransferMethodId(methodId)) {

        setRoute({ name: 'reference', methodId });

        return;

      }



      if (methodId === 'pos' && shouldSimulatePosFailure()) {

        setRoute({ name: 'payment-error', methodId });

        return;

      }



      if (methodId === 'pos') {
        void (async () => {
          const payerDocumentId = resolvePaymentPayerDocumentId(
            paymentPayerDocumentId,
            customer?.documentId,
          );
          if (!payerDocumentId) {
            setRoute({ name: 'payment-error', methodId });
            return;
          }

          setPosPaymentBusy(true);
          try {
            const reserveResult = await reserveCartBeforePayment(lines);
            if (!reserveResult.ok) {
              setRoute({ name: 'stock-shortage', shortages: reserveResult.shortages });
              return;
            }
            setReservationId(reserveResult.reservationId);

            const result = await executePosCardPayment({
              ecr,
              documentId: payerDocumentId,
              cartTotalVes: totals.totalVes,
            });
            if (!result.ok) {
              setRoute({ name: 'payment-error', methodId });
              return;
            }
            const posPayment = buildPosPaymentFromEcr({
              rawEcrResponse: result.rawResponse,
              customer: {
                documentId: customer!.documentId,
                firstName: customer!.firstName,
                lastName: customer!.lastName,
                phone: customer!.phone,
              },
              payerDocumentId,
              paymentMethodId: 'pos',
            });
            if (!posPayment.ok) {
              setRoute({ name: 'payment-error', methodId });
              return;
            }
            setCardPaymentPayload(posPayment.payload);
            goToProcessing();
          } catch {
            setRoute({ name: 'payment-error', methodId });
          } finally {
            setPosPaymentBusy(false);
          }
        })();
        return;
      }

    },

    [customer, ecr, goToProcessing, lines, paymentPayerDocumentId, setCardPaymentPayload, setReservationId, totals.totalVes],

  );



  const handleBackFromReference = useCallback((methodId: TransferPaymentMethodId) => {

    setRoute({ name: 'flow', methodId });

  }, []);



  const handleReferenceValidated = useCallback(() => {

    void proceedAfterReserve(goToProcessing);

  }, [goToProcessing, proceedAfterReserve]);



  const handleRequestHelp = useCallback(() => {

    setRoute({ name: 'assistance', reason: 'reference' });

  }, []);



  const handleCallCashier = useCallback(() => {

    setRoute({ name: 'assistance', reason: 'fiscal_error' });

  }, []);



  const handleAssistanceCancel = useCallback(() => {

    if (route.name === 'assistance' && route.reason === 'fiscal_error') {

      onSessionComplete();

      return;

    }

    onBackToCart();

  }, [onBackToCart, onSessionComplete, route]);



  const handleAssistanceTimeout = useCallback(() => {

    onSessionComplete();

  }, [onSessionComplete]);



  const handleProcessingComplete = useCallback(

    (result: ProcessKioskOrderResult) => {

      if (result.status === 'ok') {
        setOrderId(result.orderId);
        void refreshCatalogAfterPurchase();

        if (lastPaymentMethodId === 'cash') {
          setRoute({ name: 'cash' });
          return;
        }

        setRoute({ name: 'outcome', variant: 'success' });
        return;
      }



      if (result.status === 'fiscal_error') {

        setOrderId(result.orderId);

        setRoute({ name: 'outcome', variant: 'fiscal_error' });

        return;

      }



      if (result.status === 'order_registration_failed') {
        setOrderRetryCount((prev) => {
          const next = prev + 1;
          setRoute({
            name: 'payment-error',
            methodId: lastPaymentMethodId,
            posReference: result.posReference ?? result.mobileReference,
            orderRegistrationFailed: true,
          });
          return next;
        });
        return;
      }

      if (result.status === 'reservation_expired') {
        onBackToCart();
        return;
      }

      if (result.status === 'failed') {
        setRoute({ name: 'payment-error', methodId: lastPaymentMethodId });
      }

    },

    [lastPaymentMethodId, onBackToCart, refreshCatalogAfterPurchase, setOrderId],

  );

  const handleStockShortageBackToCart = useCallback(() => {
    onBackToCart();
  }, [onBackToCart]);

  const handleRemoveUnavailableItems = useCallback(() => {
    if (route.name !== 'stock-shortage') {
      return;
    }
    adjustCartForStockShortages(lines, route.shortages, {
      decrementLine,
      removeLine,
    });
    onBackToCart();
  }, [decrementLine, lines, onBackToCart, removeLine, route]);



  if (route.name === 'stock-shortage') {

    return (

      <CartStockShortageScreen
        shortages={route.shortages}
        onBackToCart={handleStockShortageBackToCart}
        onRemoveUnavailable={handleRemoveUnavailableItems}
      />

    );

  }



  if (route.name === 'assistance') {

    return (

      <CallCashierScreen

        reason={route.reason}

        onCancelOrder={handleAssistanceCancel}

        onTimeout={handleAssistanceTimeout}

      />

    );

  }



  if (route.name === 'payment-error') {

    return (

      <PaymentErrorScreen

        methodId={route.methodId}

        orderRegistrationFailed={route.orderRegistrationFailed}

        posReference={route.posReference}

        retryCount={orderRetryCount}

        onBack={onBackToCart}

        onRetry={() => {
          if (
            route.orderRegistrationFailed ||
            route.methodId === 'cash'
          ) {
            goToProcessing();
          } else {
            setRoute({ name: 'flow', methodId: route.methodId });
          }
        }}

        onChangeMethod={() => {
          if (route.orderRegistrationFailed) {
            handleRequestHelp();
          } else {
            setRoute({ name: 'method-select' });
          }
        }}

      />

    );

  }



  if (route.name === 'outcome') {

    return (

      <OrderOutcomeScreen

        variant={route.variant}

        onCallCashier={handleCallCashier}

        onSessionComplete={onSessionComplete}

      />

    );

  }



  if (route.name === 'processing') {

    return <OrderProcessingScreen onComplete={handleProcessingComplete} />;

  }



  if (route.name === 'reference') {

    return (

      <TransferReferenceFlow

        methodId={route.methodId}

        onBackToAccount={() => handleBackFromReference(route.methodId)}

        onReferenceValidated={handleReferenceValidated}

        onRequestHelp={handleRequestHelp}

      />

    );

  }



  if (route.name === 'cash') {
    return (
      <CashPaymentScreen
        onBack={handleBackFromFlow}
        onSessionComplete={onSessionComplete}
      />
    );
  }



  if (route.name === 'flow') {

    if (route.methodId === 'pos') {

      return (

        <PosPaymentFlow
          onBack={handleBackFromFlow}
          onContinue={() => handleFlowContinue(route.methodId)}
          posPaymentBusy={posPaymentBusy || reserveBusy}
        />

      );

    }



    if (route.methodId === 'mobile') {

      return (

        <MobilePaymentFlow

          onBack={handleBackFromFlow}

          onValidated={() => {
            void proceedAfterReserve(goToProcessing, 'mobile');
          }}

          onRequestHelp={handleRequestHelp}

        />

      );

    }



    if (route.methodId === 'zelle') {

      return (

        <ZellePaymentScreen

          onBack={handleBackFromFlow}

          onContinue={() => handleFlowContinue(route.methodId)}

        />

      );

    }



    return (

      <PaymentFlowPlaceholder methodId={route.methodId} onBack={handleBackFromFlow} />

    );

  }



  return (

    <PaymentMethodScreen onBack={onBackToCart} onSelectMethod={handleSelectMethod} />

  );

}


