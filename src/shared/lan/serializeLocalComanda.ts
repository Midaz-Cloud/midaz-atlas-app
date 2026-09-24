import type { LocalComandaRecord } from '@shared/persistence';

/**
 * Forma de `GET /lan/v1/comandas` — la misma que devuelve `GET /comandas` del
 * backend para que la Comandera la pinte e imprima sin ramas especiales. El
 * `clientOrderId` es la llave de dedupe: la comanda que el backend cree al
 * sincronizar trae el mismo valor en `order.clientOrderId`.
 */
export type LanComandaDto = {
  id: string;
  source: 'kiosk';
  clientOrderId: string;
  shortCode: string;
  displayOrderNumber: string;
  orderNumber: number;
  orderId: null;
  roundNumber: 1;
  tableNumber: string | null;
  status: LocalComandaRecord['status'];
  paymentStatus: LocalComandaRecord['paymentStatus'];
  itemsSnapshot: LocalComandaRecord['items'];
  items: LocalComandaRecord['items'];
  order: {
    items: LocalComandaRecord['items'];
    tableNumber: string | null;
    paymentMethod: string;
    fulfillmentType: string;
    customerName: string | null;
    paidAt: string;
    clientOrderId: string;
    kioskLocalNumber: string;
  };
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  syncedComandaId: string | null;
};

export function serializeLocalComanda(record: LocalComandaRecord): LanComandaDto {
  return {
    id: record.id,
    source: 'kiosk',
    clientOrderId: record.clientOrderId,
    shortCode: record.shortCode,
    displayOrderNumber: record.localNumber,
    orderNumber: record.localSeq,
    orderId: null,
    roundNumber: 1,
    tableNumber: record.tableNumber,
    status: record.status,
    paymentStatus: record.paymentStatus,
    itemsSnapshot: record.items,
    items: record.items,
    order: {
      items: record.items,
      tableNumber: record.tableNumber,
      paymentMethod: record.paymentMethod,
      fulfillmentType: record.fulfillmentType,
      customerName: record.customerName,
      paidAt: record.createdAt,
      clientOrderId: record.clientOrderId,
      kioskLocalNumber: record.localNumber,
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    readyAt: record.readyAt,
    syncedComandaId: record.syncedComandaId,
  };
}
