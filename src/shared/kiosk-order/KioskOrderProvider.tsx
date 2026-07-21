import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import { resolveAppliedModifiersFromSelections } from '@shared/modifiers/resolveAppliedModifiers';
import { getCatalogEntryByLineProductId } from '@shared/catalog/catalogStore';
import { resolveProductAvailable } from '@shared/catalog/productAvailability';

import { computeOrderTotals } from './computeOrderTotals';
import { cartLineModifierKey } from './modifierKey';
import { defaultOrderFiscalConfig } from './mockOrderFiscalConfig';
import type {
  CartLine,
  ComputeOrderTotalsOptions,
  ConfirmedOrderTotals,
  KioskOrderCheckoutSnapshot,
  ModifierSelection,
  CardPaymentPayload,
  MobilePaymentPayload,
  OrderFiscalConfig,
  OrderTotals,
} from './types';

function createCartLineId(): string {
  return `cart-line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function moveLineToFront(lines: CartLine[], lineId: string): CartLine[] {
  const index = lines.findIndex((line) => line.lineId === lineId);
  if (index <= 0) {
    return lines;
  }
  const line = lines[index]!;
  return [line, ...lines.slice(0, index), ...lines.slice(index + 1)];
}

function resolveLineMaxQuantity(productId: string): number | undefined {
  const entry = getCatalogEntryByLineProductId(productId);
  if (!entry) {
    return undefined;
  }
  if (entry.product.available != null) {
    return resolveProductAvailable(entry.product);
  }
  if (entry.product.soldOut) {
    return 0;
  }
  return undefined;
}

export type AddProductOptions = {
  unitPriceVes?: number;
  taxRate?: number;
  isExempt?: boolean;
  modifierGroups?: ProductModifierGroup[];
  /** Prepend new/updated lines (retail scan cart — most recent on top). */
  recentFirst?: boolean;
};

export type KioskOrderContextValue = {
  lines: CartLine[];
  itemCount: number;
  totalUsd: number;
  totals: OrderTotals;
  usdToVesRate: number;
  primaryCurrency: string;
  fiscalConfig: OrderFiscalConfig;
  confirmedOrder: ConfirmedOrderTotals | null;
  setConfirmedOrder: (order: ConfirmedOrderTotals | null) => void;
  addProduct: (
    productId: string,
    unitPrice: number,
    quantity?: number,
    modifierSelections?: ModifierSelection[],
    options?: AddProductOptions,
  ) => void;
  incrementLine: (lineId: string) => void;
  decrementLine: (lineId: string) => void;
  removeLine: (lineId: string) => void;
  resetOrder: () => void;
  getCheckoutSnapshot: () => KioskOrderCheckoutSnapshot;
  orderId?: string;
  setOrderId: (orderId: string) => void;
  paymentMethodId?: string;
  setPaymentMethodId: (methodId: string) => void;
  clearPaymentMethodId: () => void;
  mobilePaymentPayload: MobilePaymentPayload | null;
  setMobilePaymentPayload: (payload: MobilePaymentPayload | null) => void;
  clearMobilePaymentPayload: () => void;
  /** Cédula/RIF usada para POS y pago móvil (puede diferir de facturación). */
  paymentPayerDocumentId: string | null;
  setPaymentPayerDocumentId: (documentId: string | null) => void;
  clearPaymentPayerDocumentId: () => void;
  cardPaymentPayload: CardPaymentPayload | null;
  setCardPaymentPayload: (payload: CardPaymentPayload | null) => void;
  clearCardPaymentPayload: () => void;
  reservationId: string | null;
  setReservationId: (reservationId: string) => void;
  clearReservationId: () => void;
};

export const KioskOrderContext = createContext<KioskOrderContextValue | null>(null);

type KioskOrderProviderProps = {
  children: ReactNode;
  fiscalConfig?: OrderFiscalConfig;
  computeOptions?: ComputeOrderTotalsOptions;
  primaryCurrency?: string;
};

export function KioskOrderProvider({
  children,
  fiscalConfig = defaultOrderFiscalConfig,
  computeOptions,
  primaryCurrency = 'USD',
}: KioskOrderProviderProps) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [paymentMethodId, setPaymentMethodIdState] = useState<string | undefined>();
  const [orderId, setOrderIdState] = useState<string | undefined>();
  const [confirmedOrder, setConfirmedOrderState] = useState<ConfirmedOrderTotals | null>(
    null,
  );
  const [mobilePaymentPayload, setMobilePaymentPayloadState] =
    useState<MobilePaymentPayload | null>(null);
  const [paymentPayerDocumentId, setPaymentPayerDocumentIdState] =
    useState<string | null>(null);
  const [cardPaymentPayload, setCardPaymentPayloadState] =
    useState<CardPaymentPayload | null>(null);
  const [reservationId, setReservationIdState] = useState<string | null>(null);

  const clearReservationId = useCallback(() => {
    setReservationIdState(null);
  }, []);

  const setReservationId = useCallback((id: string) => {
    setReservationIdState(id);
  }, []);

  const addProduct = useCallback(
    (
      productId: string,
      unitPrice: number,
      quantity = 1,
      modifierSelections?: ModifierSelection[],
      options?: AddProductOptions,
    ) => {
      const amount = Math.max(1, quantity);
      const selections =
        modifierSelections?.length &&
        modifierSelections.some((s) => s.options.some((row) => row.quantity > 0))
          ? modifierSelections.map((selection) => ({
              groupId: selection.groupId,
              options: [...selection.options]
                .filter((row) => row.quantity > 0)
                .sort((a, b) => a.optionId.localeCompare(b.optionId)),
            }))
          : undefined;
      const { appliedModifiers, surcharge } = resolveAppliedModifiersFromSelections(
        options?.modifierGroups,
        selections,
      );

      const key = cartLineModifierKey({
        lineId: '',
        productId,
        quantity: amount,
        unitPrice,
        modifierSelections: selections,
      });

      const maxQuantity = resolveLineMaxQuantity(productId);

      clearReservationId();
      setLines((current) => {
        const existing = current.find(
          (line) =>
            line.productId === productId && cartLineModifierKey(line) === key,
        );
        if (existing) {
          const nextQuantity = existing.quantity + amount;
          const capped =
            maxQuantity != null ? Math.min(nextQuantity, maxQuantity) : nextQuantity;
          if (capped <= existing.quantity) {
            return current;
          }
          let next = current.map((line) =>
            line.productId === productId && cartLineModifierKey(line) === key
              ? { ...line, quantity: capped }
              : line,
          );
          if (options?.recentFirst) {
            next = moveLineToFront(next, existing.lineId);
          }
          return next;
        }
        const initialQuantity =
          maxQuantity != null ? Math.min(amount, maxQuantity) : amount;
        if (initialQuantity <= 0) {
          return current;
        }
        const newLine: CartLine = {
          lineId: createCartLineId(),
          productId,
          quantity: initialQuantity,
          unitPrice,
          unitPriceVes: options?.unitPriceVes,
          taxRate: options?.taxRate,
          isExempt: options?.isExempt,
          modifierSelections: selections,
          appliedModifiers:
            appliedModifiers.length > 0 ? appliedModifiers : undefined,
          modifierSurchargePrimary: surcharge > 0 ? surcharge : undefined,
        };
        return options?.recentFirst ? [newLine, ...current] : [...current, newLine];
      });
    },
    [clearReservationId],
  );

  const incrementLine = useCallback((lineId: string) => {
    clearReservationId();
    setLines((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) {
          return line;
        }
        const hasModifiers =
          (line.modifierSelections?.length ?? 0) > 0 ||
          (line.appliedModifiers?.length ?? 0) > 0 ||
          (line.modifierIds?.length ?? 0) > 0;
        if (hasModifiers) {
          return line;
        }
        const maxQuantity = resolveLineMaxQuantity(line.productId);
        if (maxQuantity != null && line.quantity >= maxQuantity) {
          return line;
        }
        return { ...line, quantity: line.quantity + 1 };
      }),
    );
  }, [clearReservationId]);

  const decrementLine = useCallback((lineId: string) => {
    clearReservationId();
    setLines((current) =>
      current.flatMap((line) => {
        if (line.lineId !== lineId) {
          return [line];
        }
        if (line.quantity <= 1) {
          return [];
        }
        return [{ ...line, quantity: line.quantity - 1 }];
      }),
    );
  }, [clearReservationId]);

  const removeLine = useCallback((lineId: string) => {
    clearReservationId();
    setLines((current) => current.filter((line) => line.lineId !== lineId));
  }, [clearReservationId]);

  const setPaymentMethodId = useCallback((methodId: string) => {
    setPaymentMethodIdState(methodId);
  }, []);

  const clearPaymentMethodId = useCallback(() => {
    setPaymentMethodIdState(undefined);
  }, []);

  const setMobilePaymentPayload = useCallback((payload: MobilePaymentPayload | null) => {
    setMobilePaymentPayloadState(payload);
  }, []);

  const clearMobilePaymentPayload = useCallback(() => {
    setMobilePaymentPayloadState(null);
  }, []);

  const setPaymentPayerDocumentId = useCallback((documentId: string | null) => {
    setPaymentPayerDocumentIdState(documentId);
  }, []);

  const clearPaymentPayerDocumentId = useCallback(() => {
    setPaymentPayerDocumentIdState(null);
  }, []);

  const setCardPaymentPayload = useCallback((payload: CardPaymentPayload | null) => {
    setCardPaymentPayloadState(payload);
  }, []);

  const clearCardPaymentPayload = useCallback(() => {
    setCardPaymentPayloadState(null);
  }, []);

  const setOrderId = useCallback((id: string) => {
    setOrderIdState(id);
  }, []);

  const setConfirmedOrder = useCallback((order: ConfirmedOrderTotals | null) => {
    setConfirmedOrderState(order);
  }, []);

  const resetOrder = useCallback(() => {
    setLines([]);
    setPaymentMethodIdState(undefined);
    setOrderIdState(undefined);
    setConfirmedOrderState(null);
    setMobilePaymentPayloadState(null);
    setPaymentPayerDocumentIdState(null);
    setCardPaymentPayloadState(null);
    setReservationIdState(null);
  }, []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const totalUsd = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          line.quantity * line.unitPrice +
          (line.modifierSurchargePrimary ?? 0),
        0,
      ),
    [lines],
  );

  const totals = useMemo(
    () =>
      computeOrderTotals(lines, fiscalConfig, {
        ...computeOptions,
        primaryCurrency,
      }),
    [lines, fiscalConfig, computeOptions, primaryCurrency],
  );

  const getCheckoutSnapshot = useCallback(
    (): KioskOrderCheckoutSnapshot => ({
      lines,
      totals,
      usdToVesRate: fiscalConfig.usdToVesRate,
      primaryCurrency,
    }),
    [lines, totals, fiscalConfig.usdToVesRate, primaryCurrency],
  );

  const value = useMemo<KioskOrderContextValue>(
    () => ({
      lines,
      itemCount,
      totalUsd,
      totals,
      usdToVesRate: fiscalConfig.usdToVesRate,
      primaryCurrency,
      fiscalConfig,
      confirmedOrder,
      setConfirmedOrder,
      addProduct,
      incrementLine,
      decrementLine,
      removeLine,
      resetOrder,
      getCheckoutSnapshot,
      orderId,
      setOrderId,
      paymentMethodId,
      setPaymentMethodId,
      clearPaymentMethodId,
      mobilePaymentPayload,
      setMobilePaymentPayload,
      clearMobilePaymentPayload,
      paymentPayerDocumentId,
      setPaymentPayerDocumentId,
      clearPaymentPayerDocumentId,
      cardPaymentPayload,
      setCardPaymentPayload,
      clearCardPaymentPayload,
      reservationId,
      setReservationId,
      clearReservationId,
    }),
    [
      lines,
      itemCount,
      totalUsd,
      totals,
      fiscalConfig,
      primaryCurrency,
      confirmedOrder,
      setConfirmedOrder,
      addProduct,
      incrementLine,
      decrementLine,
      removeLine,
      resetOrder,
      getCheckoutSnapshot,
      orderId,
      setOrderId,
      paymentMethodId,
      setPaymentMethodId,
      clearPaymentMethodId,
      mobilePaymentPayload,
      setMobilePaymentPayload,
      clearMobilePaymentPayload,
      paymentPayerDocumentId,
      setPaymentPayerDocumentId,
      clearPaymentPayerDocumentId,
      cardPaymentPayload,
      setCardPaymentPayload,
      clearCardPaymentPayload,
      reservationId,
      setReservationId,
      clearReservationId,
    ],
  );

  return (
    <KioskOrderContext.Provider value={value}>{children}</KioskOrderContext.Provider>
  );
}
