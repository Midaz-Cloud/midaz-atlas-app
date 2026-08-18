import {
  parseFiscalZReportData,
  parseFiscalZReportEnvelope,
  toKioskZReportBody,
} from '../parseFiscalZReportResponse';

const RAW_Z = {
  fecha: '17/08/2026 14:00:00',
  coo: '2616',
  venta_bruta: '1.160,00',
  fiscalMachineSerial: 'AF910-DEMO-001',
};

describe('parseFiscalZReportData', () => {
  it('requires coo and fiscalMachineSerial', () => {
    expect(parseFiscalZReportData({ coo: '1' })).toBeNull();
    expect(parseFiscalZReportData({ fiscalMachineSerial: 'S1' })).toBeNull();
    expect(parseFiscalZReportData(RAW_Z)?.coo).toBe('2616');
  });

  it('fills coo from ult_reporte_z_num when missing', () => {
    const parsed = parseFiscalZReportData({
      ult_reporte_z_num: '99',
      fiscalMachineSerial: 'SN',
    });
    expect(parsed?.coo).toBe('99');
    expect(parsed?.ult_reporte_z_num).toBe('99');
  });
});

describe('parseFiscalZReportEnvelope / toKioskZReportBody', () => {
  it('parses envelope and puts serial as sibling of audit data', () => {
    const envelope = parseFiscalZReportEnvelope({
      success: true,
      apiVersion: '1',
      serviceVersion: '0.01.0',
      data: RAW_Z,
      message: 'OK',
      error: null,
    });
    expect(envelope.data?.fiscalMachineSerial).toBe('AF910-DEMO-001');

    const body = toKioskZReportBody(envelope.data!);
    expect(body.fiscalMachineSerial).toBe('AF910-DEMO-001');
    expect(body.data).not.toHaveProperty('fiscalMachineSerial');
    expect(body.data.coo).toBe('2616');
  });
});
