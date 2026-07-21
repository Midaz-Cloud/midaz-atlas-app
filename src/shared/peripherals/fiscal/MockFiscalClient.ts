import type { FiscalClient } from './FiscalClient';
import type {
  EmitFiscalInvoiceRequest,
  EmitFiscalInvoiceResult,
  FiscalHealthOptions,
  FiscalHealthResult,
} from './types';

export class MockFiscalClient implements FiscalClient {
  async getHealth(_options?: FiscalHealthOptions): Promise<FiscalHealthResult> {
    if (__DEV__) {
      console.info('[Fiscal] MockFiscalClient.getHealth');
    }

    return {
      httpStatus: 200,
      envelope: {
        success: true,
        apiVersion: '1',
        serviceVersion: '0.01.0-mock',
        data: {
          healthy: true,
          serviceRunning: true,
          usbConnected: true,
          transport: 'USB',
          printerStatusCode: 4,
          printerReady: true,
          enqOk: false,
        },
        message: 'Mock: servicio fiscal operativo',
        error: null,
      },
    };
  }

  async emitInvoice(request: EmitFiscalInvoiceRequest): Promise<EmitFiscalInvoiceResult> {
    if (__DEV__) {
      console.info('[Fiscal] MockFiscalClient.emitInvoice', request);
    }

    return {
      httpStatus: 200,
      envelope: {
        success: true,
        apiVersion: '1',
        serviceVersion: '0.01.0-mock',
        data: {
          issuedInvoiceNumber: 999,
          lastInvoiceNumber: 998,
          expectedInvoiceNumber: 999,
          traceLog: 'Mock: factura emitida sin impresora',
        },
        message: 'Mock: factura 999 emitida correctamente',
        error: null,
      },
    };
  }
}
