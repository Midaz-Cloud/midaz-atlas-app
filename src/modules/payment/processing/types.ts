/** Fases P13: fiscal → ticket → backend. */
export type OrderProcessingPhase = 'fiscal' | 'printing' | 'registering';

export type ProcessKioskOrderResult =
  | {
      status: 'ok';
      orderId: string;
      fiscalInvoiceNumber?: number;
      /** Sin backend: quedó en la cola del kiosko con número local; se sincroniza sola. */
      registeredLocally?: true;
    }
  | {
      status: 'fiscal_error';
      orderId: string;
      fiscalInvoiceNumber?: number;
      message?: string;
    }
  | {
      /** Order + payment (+ fiscal if emitted) succeeded; customer ticket print did not. */
      status: 'ticket_print_failed';
      orderId: string;
      shortCode?: string | null;
      fiscalInvoiceNumber?: number;
      message?: string;
      registeredLocally?: true;
    }
  | {
      /** Último recurso: ni el backend ni el kiosko pudieron guardar la venta. */
      status: 'failed';
      message?: string;
      rawJson?: string;
      fiscalInvoiceNumber?: number;
    };
