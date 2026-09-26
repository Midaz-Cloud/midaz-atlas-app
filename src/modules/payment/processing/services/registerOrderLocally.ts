import type { CreateKioskOrderRequest, KioskCustomerSnapshotRequest } from '@shared/api/kiosk';
import { parseDocumentId } from '@shared/api/kiosk/utils/documentId';
import { getApiProductId } from '@shared/catalog/catalogStore';
import type { KioskCustomer } from '@shared/customer';
import type { CartLine } from '@shared/kiosk-order/types';
import {
  allocateLocalOrderNumber,
  enqueueOrderOutbox,
  getOrderOutboxByClientOrderId,
  insertLocalComanda,
  type LocalComandaItem,
  type OrderOutboxOrigin,
} from '@shared/persistence';
import { resolveProductLabel } from '@shared/peripherals/printer/formatOrderTicketText';
import { parseOutboxOrderPayload, type OutboxOrderPayload } from '@shared/sync/outboxPayload';

export type RegisterOrderLocallyParams = {
  request: CreateKioskOrderRequest;
  clientOrderId: string;
  deviceSerial: string;
  lines: CartLine[];
  paidAt: string;
  exchangeRate: number;
  grandTotalVES: number;
  customer?: KioskCustomer | null;
  origin: OrderOutboxOrigin;
  ticket: OutboxOrderPayload['ticket'];
  customerName?: string;
  fiscalInvoiceNumber?: number;
  posReference?: string | null;
  /** El backend ya rechazó la venta (4xx): queda `failed` para revisión, pero se entrega igual. */
  rejected?: { error: string; httpStatus: number };
};

export type RegisterOrderLocallyResult = { localNumber: string; request: CreateKioskOrderRequest };

export function buildCustomerSnapshot(
  customer: KioskCustomer | null | undefined,
): KioskCustomerSnapshotRequest | undefined {
  if (!customer || customer.id != null || !customer.documentId) {
    return undefined;
  }
  const { type, number } = parseDocumentId(customer.documentId);
  if (!number) {
    return undefined;
  }
  return {
    typeIdentification: type,
    identificationNumber: number,
    name: `${customer.firstName} ${customer.lastName}`.trim(),
    phoneNumber: customer.phone || undefined,
    email: customer.email || undefined,
  };
}

/** Ítems de la comanda LAN con la forma que ya consume la Comandera. */
export function buildLocalComandaItems(lines: CartLine[]): LocalComandaItem[] {
  return lines.map((line) => ({
    productId: getApiProductId(line.productId) ?? null,
    name: resolveProductLabel(line.productId),
    quantity: line.quantity,
    notes: null,
    selections: line.appliedModifiers?.length
      ? {
          modifiers: line.appliedModifiers.map((modifier) => ({
            groupId: modifier.groupId,
            groupName: modifier.groupName,
            optionId: modifier.optionId,
            optionName: modifier.optionName,
            quantity: modifier.quantity,
            priceDelta: modifier.priceDelta,
          })),
        }
      : undefined,
  }));
}

/**
 * La venta ya se cobró y no se pudo registrar en el backend: número local, cola de
 * sincronización y comanda para cocina por LAN. Idempotente por clientOrderId.
 */
export async function registerOrderLocally(
  params: RegisterOrderLocallyParams,
): Promise<RegisterOrderLocallyResult> {
  // Un reintento de la misma venta devuelve el número que ya tenía, sin gastar otro.
  const existing = await getOrderOutboxByClientOrderId(params.clientOrderId);
  const existingPayload = existing ? parseOutboxOrderPayload(existing.payload) : null;
  if (existing && existingPayload) {
    return { localNumber: existing.localNumber, request: existingPayload.request };
  }

  const { localNumber, seq } = await allocateLocalOrderNumber(params.deviceSerial);
  const customerSnapshot = params.request.customerId
    ? undefined
    : buildCustomerSnapshot(params.customer);
  // Sin reservationId: al sincronizar ya venció, y offline el backend descuenta stock forzado.
  const base: CreateKioskOrderRequest = { ...params.request };
  delete base.reservationId;
  const request: CreateKioskOrderRequest = {
    ...base,
    clientOrderId: params.clientOrderId,
    offline: true,
    paidAt: params.paidAt,
    exchangeRate: params.exchangeRate > 0 ? params.exchangeRate : undefined,
    grandTotalVES: params.grandTotalVES,
    localOrderNumber: localNumber,
    ...(customerSnapshot ? { customer: customerSnapshot } : {}),
  };
  const payload: OutboxOrderPayload = {
    version: 1,
    request,
    ticket: { ...params.ticket, displayOrderNumber: localNumber },
  };

  const record = await enqueueOrderOutbox({
    clientOrderId: params.clientOrderId,
    localNumber,
    localSeq: seq,
    paidAt: params.paidAt,
    // NOT NULL + INSERT OR IGNORE: un valor faltante descartaría la venta en silencio.
    paymentMethod: request.paymentMethod || 'desconocido',
    origin: params.origin,
    payload,
    fiscalInvoiceNumber: params.fiscalInvoiceNumber ?? null,
    posReference: params.posReference ?? null,
    initialStatus: params.rejected ? 'failed' : 'queued',
    lastError: params.rejected?.error ?? null,
    lastErrorStatus: params.rejected?.httpStatus ?? null,
  });

  try {
    await insertLocalComanda({
      clientOrderId: params.clientOrderId,
      localNumber: record.localNumber,
      localSeq: record.localSeq,
      tableNumber: request.tableNumber ?? null,
      fulfillmentType: request.fulfillmentType || 'IN_STORE',
      // NOT NULL + INSERT OR IGNORE: un valor faltante descartaría la venta en silencio.
    paymentMethod: request.paymentMethod || 'desconocido',
      paymentStatus: 'paid',
      customerName: params.customerName ?? customerSnapshot?.name ?? null,
      items: buildLocalComandaItems(params.lines),
    });
  } catch (error) {
    // La comanda LAN es un extra: la venta ya quedó a salvo en el outbox.
    if (__DEV__) {
      console.warn('[registerOrderLocally] insertLocalComanda failed', error);
    }
  }

  return { localNumber: record.localNumber, request };
}
