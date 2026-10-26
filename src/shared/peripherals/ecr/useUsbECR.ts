import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeEventEmitter } from 'react-native';

import { shouldUseMockApi } from '@shared/config';

import { createEcrClient } from './createEcrClient';
import { ECR_PAYMENT_TIMEOUT_MS } from './ecrPaymentTimeoutMs';
import {
  isStrictJson,
  readEcrResult,
  stringifyWithCrc,
  verifyEcrCrc,
} from './ecrIntegrity';
import { ecrErrorFromPaymentResponse } from './ecrTransactionError';
import { extractLastBalancedJson } from './extractLastBalancedJson';
import { formatEcrDocumentNumber } from './formatEcrDocumentNumber';
import {
  isResponseForPendingEcrRequest,
  type PendingEcrRequest,
} from './isResponseForPendingEcrRequest';
import { isTransientEcrResponse } from './isTransientEcrResponse';
import { getUsbSerialModule } from './usbSerialModule';
import { toEcrTerminalAmount } from './toEcrTerminalAmount';

type PendingTx = {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  request?: PendingEcrRequest;
  /** Pedido tal como salió, para reenviarlo si PKUSB dice que llegó dañado (-94). */
  requestLine?: string;
  requestRetransmits: number;
  /** El nativo entrega cada línea dos veces (comando + línea): no contar el mismo -94 dos veces. */
  lastNack?: { payload: string; at: number };
  /** Respuesta dañada en reparación: se pide `resend` hasta que llegue una con crc válido. */
  recovery?: {
    lastDamaged: string;
    resendTimer: ReturnType<typeof setInterval>;
    deadlineTimer: ReturnType<typeof setTimeout>;
    resends: number;
  };
};

/** Cada cuánto se vuelve a pedir una respuesta dañada mientras no llegue una buena. */
const ECR_RESEND_INTERVAL_MS = 1500;
/**
 * Tope para reparar una respuesta dañada. Vencido, se usa la última copia dañada con
 * el parser tolerante de siempre: el cobro ya ocurrió y perderlo es peor que adivinarlo.
 */
const ECR_RESEND_WINDOW_MS = 45_000;
/** Reenvíos del pedido cuando PKUSB contesta que le llegó dañado (-94). */
const ECR_MAX_REQUEST_RETRANSMITS = 5;
const ECR_DUPLICATE_DELIVERY_MS = 500;

function stopPendingTimers(pending: PendingTx): void {
  if (pending.timeoutId) {
    clearTimeout(pending.timeoutId);
  }
  if (pending.recovery) {
    clearInterval(pending.recovery.resendTimer);
    clearTimeout(pending.recovery.deadlineTimer);
  }
}

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
  /** PKUSB ya mandó algo con crc válido: habla el protocolo con reenvío (versionCode 16+). */
  const peerSendsCrc = useRef(false);

  const writeLine = useCallback(
    (line: string) => {
      if (!UsbSerialModule) {
        return;
      }
      UsbSerialModule.sendLine(line).catch((err: unknown) => {
        if (__DEV__) {
          console.warn('[useUsbECR] no se pudo escribir al POS', err);
        }
      });
    },
    [UsbSerialModule],
  );

  const clearPendingTransaction = useCallback((reason?: Error) => {
    const pending = pendingTransaction.current;
    if (!pending) {
      return;
    }
    stopPendingTimers(pending);
    pendingTransaction.current = null;
    setIsProcessing(false);
    if (reason) {
      setError(reason.message);
      pending.reject(reason);
    }
  }, []);

  const settlePendingTransaction = useCallback(
    (payload: string, skipIntegrity = false) => {
      const pending = pendingTransaction.current;
      if (!pending) {
        return;
      }

      if (isTransientEcrResponse(payload)) {
        return;
      }

      const balanced = extractLastBalancedJson(payload);
      const settledPayload = balanced ?? payload;

      if (!skipIntegrity) {
        const integrity = verifyEcrCrc(settledPayload);
        if (integrity === 'valid') {
          peerSendsCrc.current = true;
          const result = readEcrResult(settledPayload);
          if (result === -94 || result === -96) {
            handleNack(settledPayload, result);
            return;
          }
        } else if (
          integrity === 'invalid' ||
          (peerSendsCrc.current && !isStrictJson(settledPayload))
        ) {
          startRecovery(settledPayload);
          return;
        }
      }

      if (pending.request && !isResponseForPendingEcrRequest(settledPayload, pending.request)) {
        if (__DEV__) {
          console.warn('[useUsbECR] respuesta ajena al pedido pendiente, ignorada', {
            expected: pending.request,
            payload: settledPayload,
          });
        }
        return;
      }

      setReceivedMessages((prev) => [...prev, settledPayload]);
      setLastTransactionResponse(settledPayload);

      const paymentError = ecrErrorFromPaymentResponse(settledPayload);
      stopPendingTimers(pending);
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
    // handleNack / startRecovery se declaran abajo (function hoisting) y solo leen refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * La respuesta llegó dañada: se pide `resend` a PKUSB cada 1,5 s hasta que llegue
   * una copia íntegra (la guarda por referenceNo y la reenvía sin volver a cobrar).
   */
  function startRecovery(damaged: string) {
    const pending = pendingTransaction.current;
    const referenceNo = pending?.request?.referenceNo;
    if (!pending || !referenceNo) {
      // Sin referencia no hay qué pedir: se procesa como siempre.
      settlePendingTransaction(damaged, true);
      return;
    }
    // Copia dañada de otra operación (llegó tarde): no es nuestra.
    if (!isResponseForPendingEcrRequest(damaged, pending.request!)) {
      return;
    }
    if (pending.recovery) {
      pending.recovery.lastDamaged = damaged;
      return;
    }

    // La respuesta ya llegó: el timeout de "POS no contesta" deja de aplicar.
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
      pending.timeoutId = undefined;
    }

    const resend = () => {
      const current = pendingTransaction.current;
      if (current !== pending || !current.recovery) {
        return;
      }
      current.recovery.resends += 1;
      if (__DEV__) {
        console.warn(`[useUsbECR] respuesta dañada, pidiendo reenvío #${current.recovery.resends}`, referenceNo);
      }
      writeLine(stringifyWithCrc({ type: 'resend', referenceNo }));
    };

    pending.recovery = {
      lastDamaged: damaged,
      resends: 0,
      resendTimer: setInterval(resend, ECR_RESEND_INTERVAL_MS),
      deadlineTimer: setTimeout(() => {
        const current = pendingTransaction.current;
        if (current !== pending || !current.recovery) {
          return;
        }
        const { lastDamaged, resendTimer } = current.recovery;
        clearInterval(resendTimer);
        current.recovery = undefined;
        if (__DEV__) {
          console.warn('[useUsbECR] no llegó copia íntegra, se usa la dañada', referenceNo);
        }
        settlePendingTransaction(lastDamaged, true);
      }, ECR_RESEND_WINDOW_MS),
    };
    resend();
  }

  /**
   * -94: a PKUSB le llegó dañado el pedido y no lo ejecutó, se reenvía igual.
   * -96: `resend` de algo que PKUSB no tiene; solo la versión se puede repetir sin riesgo,
   * un cobro no (si PKUSB se reinició tras cobrar, repetirlo cobraría dos veces).
   */
  function handleNack(payload: string, result: -94 | -96) {
    const pending = pendingTransaction.current;
    if (!pending?.requestLine) {
      return;
    }
    const referenceNo = /"referenceNo"\s*:\s*"([^"]*)"/.exec(payload)?.[1];
    if (referenceNo != null && referenceNo !== pending.request?.referenceNo) {
      return;
    }
    // Ya hay respuesta en reparación: el -94 es de un `resend` dañado y el intervalo lo repite solo.
    if (pending.recovery) {
      return;
    }
    if (result === -96 && pending.request?.type !== 'version') {
      return;
    }
    const now = Date.now();
    if (
      pending.lastNack?.payload === payload &&
      now - pending.lastNack.at < ECR_DUPLICATE_DELIVERY_MS
    ) {
      return;
    }
    pending.lastNack = { payload, at: now };
    if (pending.requestRetransmits >= ECR_MAX_REQUEST_RETRANSMITS) {
      rejectPendingTransaction(new Error('El POS no recibió el pedido completo. Verifique el cable USB.'));
      return;
    }
    pending.requestRetransmits += 1;
    if (__DEV__) {
      console.warn(`[useUsbECR] el POS pidió reenviar el pedido (#${pending.requestRetransmits})`);
    }
    writeLine(pending.requestLine);
  }

  const rejectPendingTransaction = useCallback(
    (reason: Error) => {
      const pending = pendingTransaction.current;
      if (!pending) {
        return;
      }
      stopPendingTimers(pending);
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

      // Con crc: si el pedido llega dañado, PKUSB no lo ejecuta y contesta -94.
      const requestLine = stringifyWithCrc(payload);

      const txPromise = new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          rejectPendingTransaction(
            new Error(
              `Timeout esperando respuesta del POS (${Math.round(timeoutMs / 1000)}s)`,
            ),
          );
        }, timeoutMs);
        const { referenceNo, type } = payload as { referenceNo?: string; type?: string };
        pendingTransaction.current = {
          resolve,
          reject,
          timeoutId,
          requestLine,
          requestRetransmits: 0,
          ...(referenceNo && type ? { request: { referenceNo, type } } : {}),
        };
      });

      try {
        await UsbSerialModule.sendLine(requestLine);
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

  // Los callbacks ya son estables (useCallback); memoizar el objeto de retorno
  // evita que EcrConnectionProvider empuje un `value` de Context nuevo (y
  // re-renderice a todos sus consumidores) en cada render en que nada cambió.
  return useMemo<UseUsbECRReturn>(
    () => ({
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
    }),
    [
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
    ],
  );
}
