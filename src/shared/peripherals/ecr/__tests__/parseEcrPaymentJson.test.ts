import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import {
  parseEcrPaymentJson,
  parseEcrPaymentJsonHeuristic,
  sanitizeEcrRrn,
} from '../parseEcrPaymentJson';

/** Logcat 2026-05-26 — strict JSON.parse fails on USB corruption. */
const CORRUPTED_APPROVED_USB = String.raw`[{"success":true,"type":"pauyment","reslt":0,"referenceNo":"REF-1779839855199","data":{"originalDate":"0526p","timestam":"2026-05-.26T19:57:38734Z","time"":"19:57:38,"transType":0,"tipAmount":"","terminalID":"00001001","result":0,"accountType":2,"responseCdode":"00","ate":"2026-05-26","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"195738","success":true,"referenceNumber":"000009","responseMessage":"APPROVED","traceNumber":"000028","batchNum":"000001","RRN":"61462300002:8","amount""100","errorCode":0}}]`;

describe('parseEcrPaymentJsonHeuristic', () => {
  it('parses corrupted approved terminal payload from logcat', () => {
    expect(parseEcrPaymentJsonStrictFails(CORRUPTED_APPROVED_USB)).toBe(true);

    const flat = parseEcrPaymentJsonHeuristic(CORRUPTED_APPROVED_USB);
    expect(flat?.responseCode).toBe('00');
    expect(flat?.responseMessage).toBe('APPROVED');
    expect(flat?.traceNumber).toBe('000028');
    expect(flat?.referenceNumber).toBe('000009');
    expect(flat?.RRN).toBe('614623000028');
    expect(flat?.amount).toBe('100');
    expect(flat?.terminalID).toBe('00001001');
    expect(flat?.accountType).toBe(2);
  });

  it('parseEcrPaymentJson falls back to heuristic', () => {
    const flat = parseEcrPaymentJson(CORRUPTED_APPROVED_USB);
    expect(flat?.responseCode).toBe('00');
    expect(flat?.RRN).toBe('614623000028');
  });

  it('sanitizeEcrRrn removes colon corruption', () => {
    expect(sanitizeEcrRrn('61462300002:8')).toBe('614623000028');
  });
});

describe('buildPosPaymentFromEcr with corrupted USB', () => {
  it('builds posResponse for POST /kiosk/orders', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: CORRUPTED_APPROVED_USB,
      customer: {
        documentId: 'V25504486',
        firstName: 'Juan',
        lastName: 'Perez',
        phone: '04121234567',
      },
      payerDocumentId: 'V25504486',
      paymentMethodId: 'pos',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.payload.posResponse.responseCode).toBe('00');
    expect(result.payload.posResponse.RRN).toBe('614623000028');
    expect(result.payload.posResponse.amount).toBe('100');
    expect(result.payload.posReference).toBe('614623000028');
  });
});

/** Logcat 2026-05-27 — approved but strict JSON fails (refrenceNumber"", trace0Number). */
const CORRUPTED_APPROVED_USB_V3 = String.raw`[{"success":true,"type":"payment","result":0,"referenceNo":"REF-1779895636803","data":{"originalDate":"0527","timestamp":"2026-05-27T11:27:19.869Z","time":""11:27:19",transType":0,"tipAmount":"","terminalID":"00001001","resuult":0,"accontType":2,"responseCode":"00","date":"2026-05-27","deviceSerial":"N620W312565","merchantID":"0078513748","original1Time":"11279","successe":true,"refrenceNumber"":"000026",responseMessage":"APPROVED","trace0Number":"00045","batchNum":"000001","RRN":"614715000045","amount":"100","errorCode":0}}]`;

describe('parseEcrPaymentJsonHeuristic with 2026-05-27 logcat variant', () => {
  it('extracts fields from refrenceNumber / trace0Number corruption', () => {
    expect(parseEcrPaymentJsonStrictFails(CORRUPTED_APPROVED_USB_V3)).toBe(true);

    const flat = parseEcrPaymentJson(CORRUPTED_APPROVED_USB_V3);
    expect(flat?.responseCode).toBe('00');
    expect(flat?.responseMessage).toBe('APPROVED');
    expect(flat?.referenceNumber).toBe('000026');
    expect(flat?.traceNumber).toBe('00045');
    expect(flat?.RRN).toBe('614715000045');
    expect(flat?.amount).toBe('100');
  });

  it('builds order payload after approved POS with corrupted JSON', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: CORRUPTED_APPROVED_USB_V3,
      customer: {
        documentId: 'V26728807',
        firstName: 'Test',
        lastName: 'User',
        phone: '04121234567',
      },
      payerDocumentId: 'V26728807',
      paymentMethodId: 'pos',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.payload.posResponse.traceNumber).toBe('00045');
    expect(result.payload.posResponse.referenceNumber).toBe('000026');
  });
});

describe('parseEcrPaymentJsonHeuristic with newest corruption variant', () => {
  const CORRUPTED_APPROVED_USB_V2 = String.raw`[t{"success":rue,"type":"payment","result":0,"referenceNo":"REF-1779846172881","data":{"originalDate":"0526","timestamp":"2026-05-26T21:4256.820Z","time":"21:42:,"56"transType"::0,"tipAmount":"","ermtilnaID":"00001001","result":0,"accountType":2,"respon","dateseCode":"00":"2026-05-26","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"214256","success":true,"referenceNumber":"000020","responseMessage":"APPROVED","traceNumber":"000039","batchNum":"000001","RRN":"61470100n0039","amout":"100","errorCode":0}}]`;

  it('extracts minimum required approved fields', () => {
    const flat = parseEcrPaymentJson(CORRUPTED_APPROVED_USB_V2);
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('000039');
    expect(flat?.referenceNumber).toBe('000020');
    expect(flat?.amount).toBe('100');
    expect(flat?.terminalID).toBe('00001001');
    expect(flat?.RRN).toBe('614701000039');
  });

  it('builds pos payload from newest corruption variant', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: CORRUPTED_APPROVED_USB_V2,
      customer: {
        documentId: 'V26396697',
        firstName: 'Alex',
        lastName: 'Romero',
        phone: '04121234567',
      },
      payerDocumentId: 'V26396697',
      paymentMethodId: 'pos',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.payload.posResponse.responseCode).toBe('00');
    expect(result.payload.posResponse.amount).toBe('100');
    expect(result.payload.posResponse.traceNumber).toBe('000039');
    expect(result.payload.posResponse.terminalID).toBe('00001001');
  });
});

function parseEcrPaymentJsonStrictFails(raw: string): boolean {
  try {
    JSON.parse(raw.trim());
    return false;
  } catch {
    return true;
  }
}
