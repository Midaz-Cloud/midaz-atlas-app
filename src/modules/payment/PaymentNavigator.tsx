import { useCallback, useEffect, useMemo, useRef, useState } from 'react';



import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';
import {
  buildFailedPaymentInput,
  recordFailedPayment,
  recordFailedPaymentSafe,
} from '@shared/persistence';
import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';
import { retryCustomerFiscalEmit } from './recovery';

import type { CashierAssistanceReason } from './assistance/services/requestCashierAssistance';

import { CallCashierScreen } from './assistance/CallCashierScreen';

import { getEnabledPaymentMethods } from './data/getEnabledPaymentMethods';
import { useKioskSession, useKioskOrganization } from '@shared/session';
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

import { PosChargeProcessingScreen } from './pos/PosChargeProcessingScreen';
import { PosPaymentFlow } from './pos/PosPaymentFlow';
import type { PosChargeResult } from './pos/types';

import { TransferReferenceFlow } from './reference/TransferReferenceFlow';

import { ZellePaymentScreen } from './zelle/ZellePaymentScreen';

import type { CartReserveItemResult } from '@shared/api/kiosk';
import { CartStockShortageScreen } from '@modules/ordering/stock/CartStockShortageScreen';
import { adjustCartForStockShortages } from '@modules/ordering/stock/adjustCartForStockShortages';
import { reserveCartBeforePayment } from './services/reserveCartBeforePayment';
import { isPaymentRouteLockedAfterCheckoutStart } from './paymentRouteGuards';

import type { PaymentMethodId, TransferPaymentMethodId } from './types';



type PaymentRoute =

  | { name: 'method-select' }

  | { name: 'flow'; methodId: PaymentMethodId }

  | { name: 'cash' }

  | { name: 'reference'; methodId: TransferPaymentMethodId }

  | { name: 'processing' }

  | { name: 'pos-charging' }

  | { name: 'outcome'; variant: OrderOutcomeVariant; shortCode?: string | null }

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

  const {
    itemCount,
    lines,
    setOrderId,
    setPaymentMethodId,
    setCardPaymentPayload,
    totals,
    paymentPayerDocumentId,
    setReservationId,
    decrementLine,
    removeLine,
    reservationId,
    cardPaymentPayload,
    mobilePaymentPayload,
    fiscalConfig,
    primaryCurrency,
    setConfirmedOrder,
    confirmedOrder,
  } = useKioskOrder();
  const { customer } = useKioskCustomer();
  const { runtimeConfig, refreshCatalogAfterPurchase, orderType, tableNumber } =
    useKioskSession();
  const organization = useKioskOrganization();
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
  const [fiscalFailedPaymentId, setFiscalFailedPaymentId] = useState<number | null>(
    null,
  );
  const [fiscalRetryBusy, setFiscalRetryBusy] = useState(false);
  const routeRef = useRef(route);
  routeRef.current = route;
  /** Once order+print succeeded, ignore late processKioskOrder failures (e.g. reservation_expired). */
  const orderSucceededRef = useRef(false);

  const failedPaymentContext = useCallback(
    (methodId?: PaymentMethodId) => ({
      customer,
      lines,
      totals,
      reservationId,
      paymentMethod: methodId ?? lastPaymentMethodId,
      cardPayment: cardPaymentPayload,
      mobilePayment: mobilePaymentPayload,
      orderType,
      tableNumber: tableNumber ?? null,
    }),
    [
      cardPaymentPayload,
      customer,
      lastPaymentMethodId,
      lines,
      mobilePaymentPayload,
      orderType,
      reservationId,
      tableNumber,
      totals,
    ],
  );

  /** Sync route + order payment method when enabled methods resolve (avoids stale single-method POS skip). */
  useEffect(() => {
    if (enabledMethods.length === 0) {
      return;
    }

    if (enabledMethods.length === 1) {
      const methodId = enabledMethods[0]!.id;
      setPaymentMethodId(methodId);
      setLastPaymentMethodId(methodId);

      const current = routeRef.current;
      if (isPaymentRouteLockedAfterCheckoutStart(current.name)) {
        return;
      }
      if (current.name === 'flow' && current.methodId === methodId) {
        return;
      }

      if (methodId === 'cash') {
        void (async () => {
          if (isPaymentRouteLockedAfterCheckoutStart(routeRef.current.name)) {
            return;
          }
          setReserveBusy(true);
          try {
            const result = await reserveCartBeforePayment(lines);
            if (isPaymentRouteLockedAfterCheckoutStart(routeRef.current.name)) {
              return;
            }
            if (result.ok) {
              setReservationId(result.reservationId);
              setRoute({ name: 'processing' });
              return;
            }
            setRoute({ name: 'stock-shortage', shortages: result.shortages });
          } catch {
            if (!isPaymentRouteLockedAfterCheckoutStart(routeRef.current.name)) {
              recordFailedPaymentSafe(
                buildFailedPaymentInput(failedPaymentContext(methodId), {
                  stage: 'reserve',
                  errorReason: 'reserve_failed',
                  errorMessage: 'Error al reservar stock antes del cobro',
                }),
              );
              setRoute({ name: 'payment-error', methodId });
            }
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
      if (isPaymentRouteLockedAfterCheckoutStart(prev.name)) {
        return prev;
      }
      if (prev.name === 'flow' && enabledMethods.some((m) => m.id === prev.methodId)) {
        return prev;
      }
      return { name: 'method-select' };
    });
  }, [enabledMethods, failedPaymentContext, lines, setPaymentMethodId, setReservationId]);

  useEffect(() => {
    if (route.name === 'flow') {
      setPaymentMethodId(route.methodId);
      setLastPaymentMethodId(route.methodId);
    }
  }, [route, setPaymentMethodId]);

  useEffect(() => {

    if (
      itemCount === 0 &&
      route.name !== 'outcome' &&
      route.name !== 'assistance' &&
      route.name !== 'pos-charging'
    ) {

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
        recordFailedPaymentSafe(
          buildFailedPaymentInput(failedPaymentContext(methodId), {
            stage: 'reserve',
            errorReason: 'reserve_failed',
            errorMessage: 'Error al reservar stock antes del cobro',
          }),
        );
        setRoute({ name: 'payment-error', methodId });
      } finally {
        setReserveBusy(false);
      }
    },
    [failedPaymentContext, lastPaymentMethodId, lines, setReservationId],
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
        recordFailedPaymentSafe(
          buildFailedPaymentInput(failedPaymentContext(methodId), {
            stage: 'pos_charge',
            errorReason: 'simulated_failure',
            errorMessage: 'Fallo de POS simulado (demo)',
          }),
        );
        setRoute({ name: 'payment-error', methodId });
        return;
      }



      if (methodId === 'pos') {
        setRoute({ name: 'pos-charging' });
        return;
      }

    },

    [failedPaymentContext],

  );

  const handlePosChargeComplete = useCallback(
    (result: PosChargeResult) => {
      if (result.ok) {
        goToProcessing();
        return;
      }
      if (result.kind === 'stock-shortage') {
        setRoute({ name: 'stock-shortage', shortages: result.shortages });
        return;
      }
      setRoute({ name: 'payment-error', methodId: 'pos' });
    },
    [goToProcessing],
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

    async (result: ProcessKioskOrderResult) => {
      // Late duplicate processKioskOrder (catalog refresh) must not yank success → cart.
      if (orderSucceededRef.current) {
        return;
      }

      if (result.status === 'ok' || result.status === 'ticket_print_failed') {
        orderSucceededRef.current = true;
        setOrderId(result.orderId);
        void refreshCatalogAfterPurchase();

        if (lastPaymentMethodId === 'cash') {
          setRoute({ name: 'cash' });
          return;
        }

        setRoute({
          name: 'outcome',
          variant: result.status === 'ok' ? 'success' : 'ticket_print_failed',
          shortCode: result.status === 'ticket_print_failed' ? result.shortCode : undefined,
        });
        return;
      }

      if (result.status === 'fiscal_error') {
        orderSucceededRef.current = true;
        setOrderId(result.orderId);
        try {
          const id = await recordFailedPayment(
            buildFailedPaymentInput(failedPaymentContext(), {
              stage: 'fiscal',
              errorReason: 'fiscal_error',
              errorMessage: result.message ?? 'Error al emitir factura fiscal',
              fiscalInvoiceNumber: result.fiscalInvoiceNumber,
              displayOrderNumber: confirmedOrder?.displayOrderNumber,
            }),
          );
          setFiscalFailedPaymentId(id);
        } catch (error) {
          console.warn('[PaymentNavigator] record fiscal failed_payment', error);
          setFiscalFailedPaymentId(null);
        }
        setRoute({ name: 'outcome', variant: 'fiscal_error' });
        return;
      }

      if (result.status === 'order_registration_failed') {
        recordFailedPaymentSafe(
          buildFailedPaymentInput(failedPaymentContext(), {
            stage: 'order_register',
            errorReason: 'order_registration_failed',
            errorMessage:
              result.message ?? 'Fallo al registrar la orden en el servidor',
            posReference: result.posReference,
            mobileReference: result.mobileReference,
            rawJson: result.rawJson ?? null,
            fiscalInvoiceNumber: result.fiscalInvoiceNumber,
          }),
        );
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
        // If we already left processing for outcome, never send user back to cart.
        if (routeRef.current.name === 'outcome' || routeRef.current.name === 'cash') {
          return;
        }
        onBackToCart();
        return;
      }

      if (result.status === 'failed') {
        recordFailedPaymentSafe(
          buildFailedPaymentInput(failedPaymentContext(), {
            stage: 'order_register',
            errorReason: 'failed',
            errorMessage: result.message ?? 'Error al procesar la orden',
            rawJson: result.rawJson ?? null,
            fiscalInvoiceNumber: result.fiscalInvoiceNumber,
          }),
        );
        setRoute({ name: 'payment-error', methodId: lastPaymentMethodId });
      }

    },

    [
      confirmedOrder?.displayOrderNumber,
      failedPaymentContext,
      lastPaymentMethodId,
      onBackToCart,
      refreshCatalogAfterPurchase,
      setOrderId,
    ],

  );

  const handleRetryFiscal = useCallback(async () => {
    if (fiscalRetryBusy) {
      return;
    }
    setFiscalRetryBusy(true);
    try {
      const declaresTaxes = parseDeclaresTaxes(
        organization?.declaresTaxes ?? runtimeConfig?.raw.organization.declaresTaxes,
      );
      const existingRegisteredOrder = confirmedOrder?.displayOrderNumber
        ? {
            displayOrderNumber: confirmedOrder.displayOrderNumber,
          }
        : undefined;
      const result = await retryCustomerFiscalEmit({
        failedPaymentId: fiscalFailedPaymentId,
        salvage: {
          declaresTaxes,
          usdToVesRate: fiscalConfig.usdToVesRate,
          primaryCurrency,
          organizationName: organization?.name ?? runtimeConfig?.raw.organization.name,
          organizationLegalName:
            organization?.legalName ?? runtimeConfig?.raw.organization.legalName,
          printQrEnabled: lastPaymentMethodId !== 'cash',
        },
        session: {
          lines,
          totals,
          usdToVesRate: fiscalConfig.usdToVesRate,
          primaryCurrency,
          paymentMethodId: lastPaymentMethodId,
          orderType,
          tableNumber,
          organizationName: organization?.name ?? runtimeConfig?.raw.organization.name,
          organizationLegalName:
            organization?.legalName ?? runtimeConfig?.raw.organization.legalName,
          declaresTaxes,
          customerId: customer?.id,
          customerDocumentId: customer?.documentId,
          customerName: customer
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : undefined,
          mobilePayment:
            lastPaymentMethodId === 'mobile' ? mobilePaymentPayload : undefined,
          cardPayment: lastPaymentMethodId === 'pos' ? cardPaymentPayload : undefined,
          printQrEnabled: lastPaymentMethodId !== 'cash',
          reservationId,
          skipSimulatedFiscalError: true,
          existingRegisteredOrder,
          onOrderRegistered: (
            displayOrderNumber,
            grandTotalVES,
            grandTotalCurrency,
            currencyCode,
          ) => {
            setConfirmedOrder({
              displayOrderNumber,
              grandTotalVES,
              grandTotalCurrency,
              currencyCode,
            });
          },
        },
      });

      if (result.status === 'ok' || result.status === 'ticket_print_failed') {
        setFiscalFailedPaymentId(null);
        setOrderId(result.orderId);
        void refreshCatalogAfterPurchase();
        setRoute({
          name: 'outcome',
          variant: result.status === 'ok' ? 'success' : 'ticket_print_failed',
          shortCode:
            result.status === 'ticket_print_failed' ? result.shortCode : undefined,
        });
        return;
      }
    } finally {
      setFiscalRetryBusy(false);
    }
  }, [
    cardPaymentPayload,
    confirmedOrder?.displayOrderNumber,
    customer,
    fiscalConfig.usdToVesRate,
    fiscalFailedPaymentId,
    fiscalRetryBusy,
    lastPaymentMethodId,
    lines,
    mobilePaymentPayload,
    orderType,
    organization,
    primaryCurrency,
    refreshCatalogAfterPurchase,
    reservationId,
    runtimeConfig?.raw.organization.declaresTaxes,
    runtimeConfig?.raw.organization.legalName,
    runtimeConfig?.raw.organization.name,
    setConfirmedOrder,
    setOrderId,
    tableNumber,
    totals,
  ]);

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

        shortCode={route.shortCode}

        onCallCashier={handleCallCashier}

        onRetryFiscal={route.variant === 'fiscal_error' ? handleRetryFiscal : undefined}

        fiscalRetryBusy={fiscalRetryBusy}

        onSessionComplete={onSessionComplete}

      />

    );

  }



  if (route.name === 'pos-charging') {

    return <PosChargeProcessingScreen onComplete={handlePosChargeComplete} />;

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


