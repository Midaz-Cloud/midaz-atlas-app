import type { FiscalClient } from './FiscalClient';
import type {
  EmitFiscalInvoiceRequest,
  EmitFiscalInvoiceResult,
  FiscalHealthOptions,
  FiscalHealthResult,
  FiscalZReportData,
  FiscalZReportResult,
} from './types';

function mockZReportData(): FiscalZReportData {
  return {
    fecha: '17/08/2026 14:00:00',
    coo: '2616',
    venta_bruta: '1.160,00',
    descuentos: '0,00',
    notas_credito: '0,00',
    venta_neta: '1.000,00',
    tributados_valor: '1.000,00',
    tributados_impuesto: '160,00',
    exentos_valor: '0,00',
    percibidos_valor: '0,00',
    notas_credito_valor: '0,00',
    notas_credito_impuesto: '0,00',
    suma_valor: '1.000,00',
    suma_impuesto: '160,00',
    'imp_igtf03_00%': '0,00',
    'imp_igtf_03_00%': '0,00',
    base_exentos: '0,00',
    base_percibidos: '0,00',
    base_bi_g: '1.000,00',
    imp_iva_g: '160,00',
    base_bi_r: '0,00',
    imp_iva_r: '0,00',
    base_bi_a: '0,00',
    imp_iva_a: '0,00',
    'nc_imp_igtf03_00%': '0,00',
    'nc_imp_igtf_03_00%': '0,00',
    nc_base_exentos: '0,00',
    nc_base_percibidos: '0,00',
    nc_base_bi_g: '0,00',
    nc_imp_iva_g: '0,00',
    nc_base_bi_r: '0,00',
    nc_imp_iva_r: '0,00',
    nc_base_bi_a: '0,00',
    nc_imp_iva_a: '0,00',
    gran_total: '1.160,00',
    gran_total_iva: '160,00',
    ult_factura_num: '2615',
    ult_factura_fecha: '17/08/2026 13:55:00',
    ult_factura_monto: '0,00',
    ult_nota_credito_num: '0',
    ult_nota_credito_fecha: '17/08/2026 14:00:00',
    ult_nota_credito_monto: '0,00',
    ult_no_fiscal_num: '0',
    ult_no_fiscal_fecha: '17/08/2026 14:00:00',
    ult_no_fiscal_monto: '0,00',
    ult_reporte_z_num: '2616',
    ult_reporte_z_fecha: '17/08/2026 14:00:00',
    fiscalMachineSerial: 'AF910-DEMO-001',
  };
}

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

  async printZReport(): Promise<FiscalZReportResult> {
    if (__DEV__) {
      console.info('[Fiscal] MockFiscalClient.printZReport');
    }
    return this.mockZEnvelope('Mock: reporte Z emitido y leído');
  }

  async readLastZReport(): Promise<FiscalZReportResult> {
    if (__DEV__) {
      console.info('[Fiscal] MockFiscalClient.readLastZReport');
    }
    return this.mockZEnvelope('Mock: lectura Z');
  }

  private mockZEnvelope(message: string): FiscalZReportResult {
    return {
      httpStatus: 200,
      envelope: {
        success: true,
        apiVersion: '1',
        serviceVersion: '0.01.0-mock',
        data: mockZReportData(),
        message,
        error: null,
      },
    };
  }
}
