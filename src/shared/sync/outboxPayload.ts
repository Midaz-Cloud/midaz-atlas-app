import type { CreateKioskOrderRequest } from '@shared/api/kiosk';
import type { FormatOrderTicketParams } from '@shared/peripherals/printer/formatOrderTicketText';

/**
 * Lo que guarda `order_outbox.payload_json`: el request de POST /kiosk/orders tal
 * cual se reenvía al sincronizar, más lo necesario para reimprimir el ticket.
 */
export type OutboxOrderPayload = {
  version: 1;
  request: CreateKioskOrderRequest;
  ticket: Omit<FormatOrderTicketParams, 'footerNote'>;
};

export function parseOutboxOrderPayload(raw: unknown): OutboxOrderPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const payload = raw as Partial<OutboxOrderPayload>;
  if (payload.version !== 1 || !payload.request || !Array.isArray(payload.request.items)) {
    return null;
  }
  return payload as OutboxOrderPayload;
}
