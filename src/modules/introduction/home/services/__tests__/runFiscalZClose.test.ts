import { KioskApiError } from '@shared/api/kiosk/errors';
import type { KioskApiClient } from '@shared/api/kiosk/client';
import type { FiscalClient } from '@shared/peripherals/fiscal/FiscalClient';
import { FiscalServiceError } from '@shared/peripherals/fiscal/FiscalServiceError';
import type { FiscalZReportData, FiscalZReportResult } from '@shared/peripherals/fiscal/types';

import { runFiscalZClose } from '../runFiscalZClose';

jest.mock('@shared/config', () => ({
  isKioskDemoMode: false,
}));

function zData(overrides: Partial<FiscalZReportData> = {}): FiscalZReportData {
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
    fiscalMachineSerial: 'AF910-LIVE-001',
    ...overrides,
  };
}

function zResult(data: FiscalZReportData | null): FiscalZReportResult {
  return {
    httpStatus: 200,
    envelope: {
      success: true,
      apiVersion: '1',
      serviceVersion: '0.01.0',
      data,
      message: 'OK',
      error: null,
    },
  };
}

function makeFiscal(overrides: Partial<FiscalClient> = {}): FiscalClient {
  return {
    getHealth: jest.fn(),
    emitInvoice: jest.fn(),
    printZReport: jest.fn().mockResolvedValue(zResult(zData())),
    readLastZReport: jest.fn(),
    ...overrides,
  };
}

function makeKiosk(submitZReport = jest.fn().mockResolvedValue({ id: 'z-1' })) {
  return { submitZReport } as unknown as KioskApiClient;
}

describe('runFiscalZClose', () => {
  it('skips digital invoicing without calling I0Z/HkaApp or Midaz', async () => {
    const fiscal = makeFiscal();
    const kiosk = makeKiosk();
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'digital_invoicing',
      fiscal,
      kiosk,
    });
    expect(result).toEqual({ attempted: false, printed: false, persisted: false });
    expect(fiscal.printZReport).not.toHaveBeenCalled();
    expect(fiscal.readLastZReport).not.toHaveBeenCalled();
    expect(kiosk.submitZReport).not.toHaveBeenCalled();
  });

  it('prints and persists on success, serial as sibling of data', async () => {
    const kiosk = makeKiosk();
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'fiscal_machine',
      fiscal: makeFiscal(),
      kiosk,
    });
    expect(result).toEqual({ attempted: true, printed: true, persisted: true });
    expect(kiosk.submitZReport).toHaveBeenCalledWith(
      expect.objectContaining({
        fiscalMachineSerial: 'AF910-LIVE-001',
        data: expect.not.objectContaining({ fiscalMachineSerial: expect.anything() }),
      }),
    );
    expect(kiosk.submitZReport).toHaveBeenCalledTimes(1);
  });

  it('does not persist or retry I0Z on 503 print failure', async () => {
    const fiscal = makeFiscal({
      printZReport: jest
        .fn()
        .mockRejectedValue(new FiscalServiceError('printer busy', 503)),
      readLastZReport: jest.fn(),
    });
    const kiosk = makeKiosk();
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'fiscal_machine',
      fiscal,
      kiosk,
    });
    expect(result.attempted).toBe(true);
    expect(result.printed).toBe(false);
    expect(result.persisted).toBe(false);
    expect(fiscal.printZReport).toHaveBeenCalledTimes(1);
    expect(fiscal.readLastZReport).not.toHaveBeenCalled();
    expect(kiosk.submitZReport).not.toHaveBeenCalled();
  });

  it('on 500 reads U0Z once and persists without a second I0Z', async () => {
    const fiscal = makeFiscal({
      printZReport: jest
        .fn()
        .mockRejectedValue(new FiscalServiceError('U0Z failed', 500)),
      readLastZReport: jest.fn().mockResolvedValue(zResult(zData({ coo: '2700' }))),
    });
    const kiosk = makeKiosk();
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'fiscal_machine',
      fiscal,
      kiosk,
      u0zRetryDelaysMs: [0],
    });
    expect(result).toEqual({ attempted: true, printed: true, persisted: true });
    expect(fiscal.printZReport).toHaveBeenCalledTimes(1);
    expect(fiscal.readLastZReport).toHaveBeenCalledTimes(1);
    expect(kiosk.submitZReport).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coo: '2700' }) }),
    );
  });

  it('retries U0Z after 500 until data arrives, without a second I0Z', async () => {
    const fiscal = makeFiscal({
      printZReport: jest
        .fn()
        .mockRejectedValue(new FiscalServiceError('Z impreso, pero U0Z no devolvió datos', 500)),
      readLastZReport: jest
        .fn()
        .mockRejectedValueOnce(new FiscalServiceError('U0Z no devolvió datos', 500))
        .mockResolvedValueOnce(zResult(zData({ coo: '2701' }))),
    });
    const kiosk = makeKiosk();
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'fiscal_machine',
      fiscal,
      kiosk,
      u0zRetryDelaysMs: [0, 0],
    });
    expect(result).toEqual({ attempted: true, printed: true, persisted: true });
    expect(fiscal.printZReport).toHaveBeenCalledTimes(1);
    expect(fiscal.readLastZReport).toHaveBeenCalledTimes(2);
    expect(kiosk.submitZReport).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coo: '2701' }) }),
    );
  });

  it('treats duplicate 400 as persisted', async () => {
    const kiosk = makeKiosk(
      jest
        .fn()
        .mockRejectedValue(new KioskApiError('Ya existe un reporte Z para esta máquina', 400)),
    );
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'fiscal_machine',
      fiscal: makeFiscal(),
      kiosk,
    });
    expect(result.persisted).toBe(true);
    expect(kiosk.submitZReport).toHaveBeenCalledTimes(1);
  });

  it('retries persist once with the same payload, never a second I0Z', async () => {
    const submitZReport = jest
      .fn()
      .mockRejectedValueOnce(new KioskApiError('timeout', 500))
      .mockResolvedValueOnce({ id: 'z-2' });
    const fiscal = makeFiscal();
    const result = await runFiscalZClose({
      effectiveInvoicingType: 'fiscal_machine',
      fiscal,
      kiosk: makeKiosk(submitZReport),
    });
    expect(result.persisted).toBe(true);
    expect(fiscal.printZReport).toHaveBeenCalledTimes(1);
    expect(submitZReport).toHaveBeenCalledTimes(2);
    expect(submitZReport.mock.calls[0][0]).toEqual(submitZReport.mock.calls[1][0]);
  });
});
