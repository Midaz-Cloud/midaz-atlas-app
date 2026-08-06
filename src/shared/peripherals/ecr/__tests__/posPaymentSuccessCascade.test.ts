import {
  evaluatePosPaymentSuccessCascade,
  isApprovedResponseMessage,
  normalizePosZero,
} from '../posPaymentSuccessCascade';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

describe('normalizePosZero', () => {
  it('accepts 0 / "0" / "00"', () => {
    expect(normalizePosZero(0)).toBe(true);
    expect(normalizePosZero('0')).toBe(true);
    expect(normalizePosZero('00')).toBe(true);
  });

  it('rejects non-zero', () => {
    expect(normalizePosZero(-1)).toBe(false);
    expect(normalizePosZero(12)).toBe(false);
    expect(normalizePosZero('03')).toBe(false);
  });

  it('returns null when undeciphered', () => {
    expect(normalizePosZero(null)).toBeNull();
    expect(normalizePosZero(undefined)).toBeNull();
    expect(normalizePosZero('')).toBeNull();
    expect(normalizePosZero('abc')).toBeNull();
  });
});

describe('evaluatePosPaymentSuccessCascade', () => {
  it('approves on errorCode 0 alone', () => {
    expect(
      evaluatePosPaymentSuccessCascade({ errorCode: 0 }).approved,
    ).toBe(true);
  });

  it('approves on result 0 when errorCode undeciphered', () => {
    expect(
      evaluatePosPaymentSuccessCascade({ result: 0 }).approved,
    ).toBe(true);
  });

  it('approves on RRN when prior signals undeciphered', () => {
    expect(
      evaluatePosPaymentSuccessCascade({ rrn: '62130000243' }).approved,
    ).toBe(true);
  });

  it('approves on APPROVED message when prior signals undeciphered', () => {
    expect(
      evaluatePosPaymentSuccessCascade({ responseMessage: 'APPROVED' }).approved,
    ).toBe(true);
  });

  it('hard-fails on errorCode -1 and does not fall through to APPROVED', () => {
    const result = evaluatePosPaymentSuccessCascade({
      errorCode: -1,
      rrn: '62130000243',
      responseMessage: 'APPROVED',
    });
    expect(result.approved).toBe(false);
    if (!result.approved) {
      expect(result.matched).toBe('errorCode');
    }
  });

  it('hard-fails on result -1 before RRN', () => {
    const result = evaluatePosPaymentSuccessCascade({
      result: -1,
      rrn: '62130000243',
    });
    expect(result.approved).toBe(false);
    if (!result.approved) {
      expect(result.matched).toBe('result');
    }
  });

  it('rejects when no cascade signals are present', () => {
    expect(evaluatePosPaymentSuccessCascade({}).approved).toBe(false);
  });

  it('rejects non-APPROVED deciphered message', () => {
    expect(
      evaluatePosPaymentSuccessCascade({ responseMessage: 'DECLINED' }).approved,
    ).toBe(false);
  });

  it('requires exact APPROVED for message signal', () => {
    expect(isApprovedResponseMessage('APPROVED')).toBe(true);
    expect(isApprovedResponseMessage('approved')).toBe(true);
    expect(isApprovedResponseMessage('APaPROVED')).toBe(false);
    expect(isApprovedResponseMessage('APPROV')).toBe(false);
  });
});

describe('parseEcrPaymentResponse cascade integration', () => {
  it('approves malformed JSON with only errorCode 0', () => {
    const raw = String.raw`{"success":truae,"data":{"errorCode":0}}`;
    expect(parseEcrPaymentResponse(raw).approved).toBe(true);
  });

  it('approves malformed JSON with only result 0', () => {
    const raw = `{"data":{"result":0}}`;
    expect(parseEcrPaymentResponse(raw).approved).toBe(true);
  });

  it('approves malformed JSON with only RRN', () => {
    const raw = String.raw`{"zzz":true,"RRN":"62130000243"}`;
    expect(parseEcrPaymentResponse(raw).approved).toBe(true);
  });

  it('approves malformed JSON with only responseMessage APPROVED', () => {
    const raw = String.raw`{"foo":1,"responseMessage":"APPROVED"}`;
    expect(parseEcrPaymentResponse(raw).approved).toBe(true);
  });

  it('rejects errorCode -1 even if APPROVED appears later', () => {
    const raw = String.raw`{"errorCode":-1,"responseMessage":"APPROVED","RRN":"62130000243"}`;
    expect(parseEcrPaymentResponse(raw).approved).toBe(false);
  });

  it('rejects when none of the four signals are present', () => {
    expect(parseEcrPaymentResponse('OK').approved).toBe(false);
    expect(
      parseEcrPaymentResponse(JSON.stringify({ status: '00' })).approved,
    ).toBe(false);
  });
});
