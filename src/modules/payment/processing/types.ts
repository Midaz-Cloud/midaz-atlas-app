/** Fases P13: fiscal → ticket → backend. */
export type OrderProcessingPhase = 'fiscal' | 'printing' | 'registering';

export type ProcessKioskOrderResult =
  | { status: 'ok'; orderId: string; fiscalInvoiceNumber?: number }
  | {
      status: 'fiscal_error';
      orderId: string;
      fiscalInvoiceNumber?: number;
      message?: string;
    }
  | { status: 'failed'; message?: string; rawJson?: string }
  | { status: 'reservation_expired' }
  | {
      status: 'order_registration_failed';
      posReference?: string;
      mobileReference?: string;
      fiscalInvoiceNumber?: number;
      message?: string;
      rawJson?: string;
    };
