import { extractLastBalancedJson } from '../extractLastBalancedJson';
import { isTransientEcrResponse } from '../isTransientEcrResponse';
import {
  evaluateEcrApprovalFromPickedFields,
  pickEcrPaymentFields,
} from '../pickEcrPaymentFields';
import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';
import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

const CUSTOMER = {
  documentId: 'V12345678',
  firstName: 'Test',
  lastName: 'User',
  phone: '04141234567',
};

/** Doc example: noise prefix before the real payment object. */
const DOC_NOISE_PREFIX =
  '[:true,"type":"payment",{"success":true,"errorCode":0,"result":0,"responseCode":"00","responseMessage":"APPROVED","traceNumber":"000099","RRN":"620219000099","amount":1500,"referenceNumber":"REF-1"}';

const CLEAN_APPROVED = JSON.stringify({
  success: true,
  errorCode: 0,
  result: 0,
  responseCode: '00',
  responseMessage: 'APPROVED',
  traceNumber: '000088',
  RRN: '620219000088',
  amount: 2500,
  referenceNumber: 'REF-CLEAN',
});

describe('extractLastBalancedJson', () => {
  it('extracts the payment object from Conviase-style leading noise', () => {
    const extracted = extractLastBalancedJson(DOC_NOISE_PREFIX);
    expect(extracted).not.toBeNull();
    expect(extracted).toContain('"responseCode":"00"');
    expect(extracted).toContain('"RRN":"620219000099"');
    expect(extracted?.startsWith('{')).toBe(true);
    expect(extracted?.endsWith('}')).toBe(true);
  });

  it('returns the longest balanced object when multiple braces exist', () => {
    const raw = 'noise{small:1} junk {"success":true,"responseCode":"00","amount":100}';
    const extracted = extractLastBalancedJson(raw);
    expect(extracted).toContain('"amount":100');
    expect(extracted).not.toContain('small');
  });

  it('returns null when there is no balanced object', () => {
    expect(extractLastBalancedJson('no braces here')).toBeNull();
    expect(extractLastBalancedJson('{unclosed')).toBeNull();
  });
});

describe('isTransientEcrResponse', () => {
  it('detects device busy and result -97', () => {
    expect(isTransientEcrResponse('{"result":-97,"message":"Device is busy"}')).toBe(
      true,
    );
    expect(isTransientEcrResponse('POS busy processing previous request')).toBe(true);
    expect(isTransientEcrResponse('{"result": -97}')).toBe(true);
  });

  it('does not treat approved payment as transient', () => {
    expect(isTransientEcrResponse(CLEAN_APPROVED)).toBe(false);
  });
});

describe('damaged USB payment bytes (end-to-end)', () => {
  it('approves and maps POS payment when noise precedes a valid object', () => {
    const approval = parseEcrPaymentResponse(DOC_NOISE_PREFIX);
    expect(approval.approved).toBe(true);

    const flat = parseEcrPaymentJson(DOC_NOISE_PREFIX);
    expect(flat).not.toBeNull();
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('000099');
    expect(String(flat?.RRN ?? flat?.rrn)).toContain('620219000099');

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: DOC_NOISE_PREFIX,
      customer: CUSTOMER,
      payerDocumentId: CUSTOMER.documentId,
      paymentMethodId: 'pos',
    });
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
    }
  });

  it('approves corrupted keys after extracting the balanced object', () => {
    const corrupted =
      'xxgarbage[[' +
      '{"success":true,"errorCode":0,"responseCode":"00","responseMessage":"APPROVED",' +
      '"traceNumber":"000077","RRN":"614623000028","amount":1000}' +
      'trailing!!!';

    expect(parseEcrPaymentResponse(corrupted).approved).toBe(true);
    const flat = parseEcrPaymentJson(corrupted);
    expect(flat).not.toBeNull();
    expect(flatHasAmountAndTrace(flat!)).toBe(true);

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: corrupted,
      customer: CUSTOMER,
      payerDocumentId: CUSTOMER.documentId,
    });
    expect(pos.ok).toBe(true);
  });

  it('uses Conviase multi-field rule on clean structured payloads', () => {
    const fields = pickEcrPaymentFields(CLEAN_APPROVED);
    const decision = evaluateEcrApprovalFromPickedFields(fields, CLEAN_APPROVED);
    expect(decision?.approved).toBe(true);
    expect(parseEcrPaymentResponse(CLEAN_APPROVED).approved).toBe(true);
  });

  it('rejects clear declines via picked fields', () => {
    const declined = JSON.stringify({
      success: false,
      errorCode: -1,
      result: -1,
      responseCode: '05',
      responseMessage: 'DECLINED',
    });
    expect(parseEcrPaymentResponse(declined).approved).toBe(false);
  });

  it('still recovers classic USB bit-flip corruption (heuristic path)', () => {
    const classic =
      '{"success":true,"er"rorCode":0,"respons,eCode":"00","traceNumber":"000013",' +
      '"RRN":"6"14623000028,"amount":1500,"responseMessage":"APPROVED"}';
    expect(parseEcrPaymentResponse(classic).approved).toBe(true);
    const flat = parseEcrPaymentJson(classic);
    expect(flat).not.toBeNull();
  });
});

function flatHasAmountAndTrace(flat: Record<string, unknown>): boolean {
  return Boolean(flat.traceNumber && (flat.RRN ?? flat.rrn) && flat.amount);
}
