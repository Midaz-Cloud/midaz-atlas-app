import { parseFiscalApiEnvelope } from './parseFiscalHealthResponse';
import type { FiscalZReportData } from './types';

const ZERO = '0,00';

const STRING_KEYS: readonly (keyof Omit<FiscalZReportData, 'fiscalMachineSerial'>)[] = [
  'fecha',
  'coo',
  'venta_bruta',
  'descuentos',
  'notas_credito',
  'venta_neta',
  'tributados_valor',
  'tributados_impuesto',
  'exentos_valor',
  'percibidos_valor',
  'notas_credito_valor',
  'notas_credito_impuesto',
  'suma_valor',
  'suma_impuesto',
  'imp_igtf03_00%',
  'imp_igtf_03_00%',
  'base_exentos',
  'base_percibidos',
  'base_bi_g',
  'imp_iva_g',
  'base_bi_r',
  'imp_iva_r',
  'base_bi_a',
  'imp_iva_a',
  'nc_imp_igtf03_00%',
  'nc_imp_igtf_03_00%',
  'nc_base_exentos',
  'nc_base_percibidos',
  'nc_base_bi_g',
  'nc_imp_iva_g',
  'nc_base_bi_r',
  'nc_imp_iva_r',
  'nc_base_bi_a',
  'nc_imp_iva_a',
  'gran_total',
  'gran_total_iva',
  'ult_factura_num',
  'ult_factura_fecha',
  'ult_factura_monto',
  'ult_nota_credito_num',
  'ult_nota_credito_fecha',
  'ult_nota_credito_monto',
  'ult_no_fiscal_num',
  'ult_no_fiscal_fecha',
  'ult_no_fiscal_monto',
  'ult_reporte_z_num',
  'ult_reporte_z_fecha',
];

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function parseFiscalZReportData(raw: unknown): FiscalZReportData | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Record<string, unknown>;
  const parsed = {} as FiscalZReportData;
  for (const key of STRING_KEYS) {
    const fallback = key.includes('fecha') || key.endsWith('_num') || key === 'coo' ? '' : ZERO;
    parsed[key] = readString(data[key], fallback);
  }
  parsed.fiscalMachineSerial = readString(data.fiscalMachineSerial).trim();
  if (!parsed.coo && parsed.ult_reporte_z_num) {
    parsed.coo = parsed.ult_reporte_z_num;
  }
  if (!parsed.ult_reporte_z_num && parsed.coo) {
    parsed.ult_reporte_z_num = parsed.coo;
  }
  if (!parsed.coo || !parsed.fiscalMachineSerial) {
    return null;
  }
  return parsed;
}

export function parseFiscalZReportEnvelope(body: unknown) {
  return parseFiscalApiEnvelope(body, parseFiscalZReportData);
}

export function toKioskZReportBody(data: FiscalZReportData): {
  data: Omit<FiscalZReportData, 'fiscalMachineSerial'>;
  fiscalMachineSerial: string;
} {
  const { fiscalMachineSerial, ...audit } = data;
  return { data: audit, fiscalMachineSerial };
}
