import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeEventEmitter } from 'react-native';

import { shouldUseMockApi } from '@shared/config';

import { createEcrClient } from './createEcrClient';
import { ECR_PAYMENT_TIMEOUT_MS } from './ecrPaymentTimeoutMs';
import { ecrErrorFromPaymentResponse } from './ecrTransactionError';
import { extractLastBalancedJson } from './extractLastBalancedJson';
import { formatEcrDocumentNumber } from './formatEcrDocumentNumber';
import { isTransientEcrResponse } from './isTransientEcrResponse';
import { getUsbSerialModule } from './usbSerialModule';
import { toEcrTerminalAmount } from './toEcrTerminalAmount';

type PendingTx = {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
};

export type UseUsbECRReturn = {
  isConnected: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  error: string | null;
  lastTransactionResponse: string | null;
  receivedMessages: string[];
  usesNativeUsb: boolean;
  initialize: () => Promise<void>;
  connect: (deviceName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /** @param amountVes Monto en bolívares (ej. 1 = 1.00 Bs → se envía 100 al terminal). */
  performPayment: (documentNumber: string, amountVes: number) => Promise<string>;
  performSettlement: () => Promise<string>;
  /** Manda `{ type: 'version' }` y espera la respuesta cruda — ver `checkPosVersion.ts`. */
  performVersionCheck: () => Promise<string>;
  forceCleanup: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
};

export function useUsbECR(): UseUsbECRReturn {
  const UsbSerialModule = getUsbSerialModule();
  const usesNativeUsb = !shouldUseMockApi() && UsbSerialModule != null;
  const fallbackClientRef = useRef(createEcrClient());

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransactionResponse, setLastTransactionResponse] = useState<string | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);

  const eventEmitter = useRef(
    UsbSerialModule != null ? new NativeEventEmitter(UsbSerialModule) : null,
  );
  const subscriptions = useRef<Record<string, { remove: () => void }>>({});
  const pendingTransaction = useRef<PendingTx | null>(null);

  const clearPendingTransaction = useCallback((reason?: Error) => {
    const pending = pendingTransaction.current;
    if (!pending) {
      return;
    }
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    pendingTransaction.current = null;
    setIsProcessing(false);
    if (reason) {
      setError(reason.message);
      pending.reject(reason);
    }
  }, []);

  const settlePendingTransaction = useCallback(
    (payload: string) => {
      const pending = pendingTransaction.current;
      if (!pending) {
        return;
      }

      if (isTransientEcrResponse(payload)) {
        return;
      }

      const balanced = extractLastBalancedJson(payload);
      const settledPayload = balanced ?? payload;

      setReceivedMessages((prev) => [...prev, settledPayload]);
      setLastTransactionResponse(settledPayload);

      const paymentError = ecrErrorFromPaymentResponse(settledPayload);
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pendingTransaction.current = null;
      setIsProcessing(false);

      if (paymentError) {
        setError(paymentError.message);
        pending.reject(paymentError);
        return;
      }

      setError(null);
      pending.resolve(settledPayload);
    },
    [],
  );

  const rejectPendingTransaction = useCallback(
    (reason: Error) => {
      const pending = pendingTransaction.current;
      if (!pending) {
        return;
      }
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pendingTransaction.current = null;
      setIsProcessing(false);
      setError(reason.message);
      pending.reject(reason);
    },
    [],
  );

  useEffect(() => {
    if (!usesNativeUsb || UsbSerialModule == null || eventEmitter.current == null) {
      return;
    }

    subscriptions.current.statusChange = eventEmitter.current.addListener(
      'onUsbStatusChange',
      (event: { isOpen: boolean }) => {
        setIsConnected(event.isOpen);
        setIsConnecting(false);
        if (!event.isOpen && pendingTransaction.current) {
          rejectPendingTransaction(new Error('USB desconectado durante operación'));
        }
      },
    );

    subscriptions.current.commandReceived = eventEmitter.current.addListener(
      'onUsbCommandReceived',
      (event: { type: string; payload: string }) => {
        if (isTransientEcrResponse(event.payload)) {
          return;
        }
        settlePendingTransaction(event.payload);
      },
    );

    subscriptions.current.lineReceived = eventEmitter.current.addListener(
      'onUsbLineReceived',
      (event: { line: string }) => {
        if (!pendingTransaction.current) {
          return;
        }
        const line = event.line.trim();
        if (!line) {
          return;
        }
        if (isTransientEcrResponse(line)) {
          return;
        }
        // Fallback when native could not emit command: extract last balanced JSON.
        const balanced = extractLastBalancedJson(line);
        const candidate = balanced ?? line;
        if (balanced != null) {
          const looksLikePayment =
            candidate.includes('"success"') ||
            candidate.includes('"type"') ||
            candidate.includes('responseCode') ||
            candidate.includes('errorCode');
          if (!looksLikePayment) {
            return;
          }
        }
        settlePendingTransaction(candidate);
      },
    );

    void UsbSerialModule.initialize().catch(() => {});

    return () => {
      Object.values(subscriptions.current).forEach((sub) => sub?.remove());
      subscriptions.current = {};
      if (pendingTransaction.current) {
        rejectPendingTransaction(new Error('Componente desmontado'));
      }
    };
  }, [
    UsbSerialModule,
    rejectPendingTransaction,
    settlePendingTransaction,
    usesNativeUsb,
  ]);

  const initialize = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      if (usesNativeUsb && UsbSerialModule) {
        await UsbSerialModule.initialize();
        return;
      }
      await fallbackClientRef.current.initialize();
    } catch (err) {
      const msg = `Error inicializando ECR: ${err instanceof Error ? err.message : String(err)}`;
      setError(msg);
      throw new Error(msg);
    }
  }, [UsbSerialModule, usesNativeUsb]);

  const connect = useCallback(
    async (_deviceName?: string): Promise<void> => {
      try {
        setError(null);
        setIsConnecting(true);
        if (usesNativeUsb && UsbSerialModule) {
          await UsbSerialModule.initialize();
          await UsbSerialModule.requestUsbPermission();
          // Native opens the port inside requestUsbPermission; event may have fired before
          // listeners mounted — mark connected when the promise resolves (log: "Puerto abierto").
          setIsConnected(true);
          setIsConnecting(false);
          return;
        }
        await fallbackClientRef.current.connect(_deviceName);
        setIsConnected(true);
        setIsConnecting(false);
      } catch (err) {
        setIsConnecting(false);
        const msg = `Error conectando ECR: ${err instanceof Error ? err.message : String(err)}`;
        setError(msg);
        throw new Error(msg);
      }
    },
    [UsbSerialModule, usesNativeUsb],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      if (usesNativeUsb && UsbSerialModule) {
        await UsbSerialModule.close();
        setIsConnected(false);
        return;
      }
      await fallbackClientRef.current.disconnect();
      setIsConnected(false);
    } catch (err) {
      const msg = `Error desconectando ECR: ${err instanceof Error ? err.message : String(err)}`;
      setError(msg);
      throw new Error(msg);
    }
  }, [UsbSerialModule, usesNativeUsb]);

  const forceCleanup = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      if (usesNativeUsb && UsbSerialModule) {
        await UsbSerialModule.close();
      } else {
        await fallbackClientRef.current.forceCleanup();
      }
      setIsConnected(false);
      clearPendingTransaction();
    } catch (err) {
      const msg = `Error en limpieza ECR: ${err instanceof Error ? err.message : String(err)}`;
      setError(msg);
      throw new Error(msg);
    }
  }, [UsbSerialModule, clearPendingTransaction, usesNativeUsb]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (usesNativeUsb) {
      return isConnected;
    }
    return fallbackClientRef.current.checkConnection();
  }, [isConnected, usesNativeUsb]);

  const sendAndWait = useCallback(
    async (payload: object, timeoutMs = ECR_PAYMENT_TIMEOUT_MS): Promise<string> => {
      if (!usesNativeUsb || !UsbSerialModule) {
        const type = (payload as { type?: string }).type;
        if (type === 'settlement') {
          return fallbackClientRef.current.performSettlement();
        }
        const payment = payload as { documentNumber?: string; amount?: number };
        const result = await fallbackClientRef.current.performPayment(
          payment.documentNumber ?? '',
          payment.amount ?? 0,
        );
        const paymentError = ecrErrorFromPaymentResponse(result.rawResponse);
        if (paymentError) {
          setError(paymentError.message);
          throw paymentError;
        }
        return result.rawResponse;
      }

      if (pendingTransaction.current) {
        clearPendingTransaction(new Error('Operación POS cancelada'));
      }

      setIsProcessing(true);
      setError(null);
      setLastTransactionResponse(null);

      const txPromise = new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          rejectPendingTransaction(
            new Error(
              `Timeout esperando respuesta del POS (${Math.round(timeoutMs / 1000)}s)`,
            ),
          );
        }, timeoutMs);
        pendingTransaction.current = { resolve, reject, timeoutId };
      });

      try {
        await UsbSerialModule.sendLine(JSON.stringify(payload));
      } catch (err) {
        rejectPendingTransaction(
          new Error(
            `Error enviando al POS: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        throw err instanceof Error ? err : new Error(String(err));
      }

      return txPromise;
    },
    [UsbSerialModule, clearPendingTransaction, rejectPendingTransaction, usesNativeUsb],
  );

  const performPayment = useCallback(
    async (documentNumber: string, amountVes: number): Promise<string> => {
      const doc = formatEcrDocumentNumber(documentNumber);
      const amount = toEcrTerminalAmount(amountVes);
      return sendAndWait({
        type: 'payment',
        documentNumber: doc,
        amount,
        waiterNum: '01',
        transType: 0,
        referenceNo: `REF-${Date.now()}`,
        timestamp: Date.now(),
      });
    },
    [sendAndWait],
  );

  const performSettlement = useCallback(async (): Promise<string> => {
    return sendAndWait({
      type: 'settlement',
      referenceNo: `REF-${Date.now()}`,
      timestamp: Date.now(),
    });
  }, [sendAndWait]);

  /** Consulta rápida de versión (PKUSB + veslc) — ver `checkPosVersion.ts`. */
  const performVersionCheck = useCallback(async (): Promise<string> => {
    return sendAndWait(
      {
        type: 'version',
        referenceNo: `VERCHK-${Date.now()}`,
        timestamp: Date.now(),
      },
      8000,
    );
  }, [sendAndWait]);

  return {
    isConnected,
    isConnecting,
    isProcessing,
    error,
    lastTransactionResponse,
    receivedMessages,
    usesNativeUsb,
    initialize,
    connect,
    disconnect,
    performPayment,
    performSettlement,
    performVersionCheck,
    forceCleanup,
    checkConnection,
  };
}
