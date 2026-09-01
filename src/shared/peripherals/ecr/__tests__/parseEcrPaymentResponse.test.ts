import { ecrErrorFromPaymentResponse } from '../ecrTransactionError';
import {
  extractEcrErrorCodeFromText,
  hasEcrPlainTextCompletionSignal,
  parseEcrPaymentResponse,
  parseEcrPaymentResponseHeuristic,
} from '../parseEcrPaymentResponse';
import { extractEcrResponseCodeFromText } from '../parseEcrPaymentJson';

/** Sample from logcat — corrupted USB JSON with failure in nested `data`. */
const CORRUPTED_TERMINAL_FAILURE = String.raw`{"success":teur"typ,e":"paymet,"result":0,"rfe"nrenceNo":e"REF-1779833607950","data":{"originalDat":"1e80434","timestamp":"2026-05-26T18:04:34.094Z","time":"18:04:34","transType":0,"tipAmount":"","terminalID":"0000100","resu1lt":-1,"countaTcype":2,"responseCode""03":,"date":"2026-05-26","deviceSerail":"N620W322141","merchantID:""0010000017","originalTime":"0526","success"fals:e,"referenceNumber":"000003","responseMesages":"Failed","traceNumber":"000003","batchNum":"000001","RRN":"614622000003","amount":"1","errorCode":-12}}`;

/** Logcat 2026-06-04 — pago aprobado en terminal, app marcó error por JSON corrupto USB. */
const USER_REPORT_CORRUPTED = String.raw`[2{"ssucces":true",type":"paymet",e"rsult":0,"refencereNo":F"RE-1780599875085","danta":{"roiginalDate"6:"00i4","tmestamp":"2026-06-04T1:504:6.717Z","time":"154:4:045","trnsaType":0,"tipAmoun"t"","termi:nalID":"0000110","resu0lt":0,"accnoutTpey",:4e"rnsspoeCode":"00",dat"e":"2026-05-06"",d4eviceSreia"l"N602W322:114","merchantID":"0076549728","originaliTm"e:"150445","scucess":true,"reernecefNumber:"000008","respo"ensMessge:""APaPROVED","traceNumber":"00008","0abtchuNm""000001:","RRN":6"15519000008,""amount":"100","errorCode":0}}]`;

/** Logcat 2026-06-12 — pago aprobado en terminal, JSON corrupto con prefijo 'u{' y comillas rotas. */
const USER_REPORT_CORRUPTED_V7 = String.raw`[u{"sccess":truey,"type":"pament","result":0,"referenceNo":"RE2F-178129376836","data":{"originalDate":"0612","timestamp":"2026-06-12T15:49:27."740Z","time:"15:49:27","transType":0,"tipAmoumnt":"","terinalID":"00s001001","reult":0,"accountType":2,"responseCode":"00","date":"2026-06-12","deviceSerial":"N620W322141","merchantID":"0087654729","originalTime":"154s927","succes":true,"reeferenceNumbr":"000001","responseMessage":"APPcROVED","traeNumber":"000027","batchNum":"000002","RRN":"616319000027","amount":"100","errorCode":0}}]`;

/**
 * Logcat 2026-07-21 14:02 — pago real aprobado (737), JSON inválido por USB
 * (`ac2countType":,`, `batchNum":"000"004"`, `truae`, etc.).
 */
const USER_REPORT_CORRUPTED_2026_07_21 = String.raw`{"success":truae,"type":"pyment","result":0,"referenceNo":"R1EF-178466052143","data":{"originalDate":"0721","timestamp":"2026-07-21T15:01:58.941Z","time":"15:01:58","transType":0,"tipAmorunt":"","teminalID":"0e0001001","rsult":0,"ac2countType":,"responseCode":"00","date":"2026-07-21","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"150158","success":true,"rbeferenceNumer":"000008","responseMessage":"APaPROVED","trceNumber":"000075","batchNum":"000"004","RRN":620219000075","amount":"737","errorCode":0}}`;

/** Corrupted JSON with errorCode 0 but no usable responseCode — plain-text completion. */
const CORRUPTED_ERROR_CODE_ZERO_ONLY = String.raw`{"success":truae,"type":"pyment","data":{"amout":"100","errorCode":0}}`;

/**
 * Real incident 2026-08-31 (AF910 hardware test): PKUSB's trimmed response format
 * (post SDK v3 rework) has no `errorCode`, so the outer envelope's always-`true`/`0`
 * `success`/`result` (which only mean "PKUSB delivered a response", not "approved")
 * were being read as the approval signal instead of the real outcome in `data`.
 * This declined payment was persisted to the order as an approved one.
 */
const NEW_FORMAT_DECLINED_NO_CARD_PRESENTED =
  '{"success":true,"type":"payment","result":0,"referenceNo":"REF-1788202208084",' +
  '"data":{"datetime":"2026-08-31T14:50:27","responseMessage":"Failed","success":false}}';

const NEW_FORMAT_APPROVED = String.raw`{"success":true,"type":"payment","result":0,"referenceNo":"REF-1756642891",
"data":{"success":true,"responseMessage":"APPROVED","datetime":"2026-08-31T12:21:31","amount":"200",
"authCode":"997009","RRN":"624316000383","traceNumber":"000383","referenceNumber":"000008",
"batchNum":"000004","terminalID":"00001001","deviceSerial":"N620W306171","merchantID":"0087654729"}}`;

describe('parseEcrPaymentResponse', () => {
  it('does not approve status alone without cascade signals', () => {
    expect(parseEcrPaymentResponse(JSON.stringify({ status: 'approved' })).approved).toBe(
      false,
    );
    expect(parseEcrPaymentResponse(JSON.stringify({ status: '00' })).approved).toBe(false);
  });

  it('rejects non-00 status codes', () => {
    const result = parseEcrPaymentResponse(
      JSON.stringify({ status: '51', message: 'Documento inválido' }),
    );
    expect(result.approved).toBe(false);
    expect(result.message).toBe('Documento inválido');
  });

  it('rejects declined', () => {
    expect(parseEcrPaymentResponse(JSON.stringify({ status: 'declined' })).approved).toBe(
      false,
    );
  });

  it('rejects plain-text error lines', () => {
    expect(parseEcrPaymentResponse('ERROR: invalid document').approved).toBe(false);
  });

  it('rejects benign non-json without cascade signals', () => {
    expect(parseEcrPaymentResponse('OK').approved).toBe(false);
  });

  it('rejects corrupted terminal failure payload from logcat', () => {
    expect(parseEcrPaymentResponse(CORRUPTED_TERMINAL_FAILURE).approved).toBe(false);
  });

  it('rejects a declined new-format payment instead of reading the outer envelope as approved (2026-08-31 incident)', () => {
    const result = parseEcrPaymentResponse(NEW_FORMAT_DECLINED_NO_CARD_PRESENTED);
    expect(result.approved).toBe(false);
    expect(result.message).toBe('Failed');
  });

  it('still approves a clean new-format approved payment', () => {
    expect(parseEcrPaymentResponse(NEW_FORMAT_APPROVED).approved).toBe(true);
  });

  it('approves corrupted APPROVED USB payload from 2026-06-04 logcat', () => {
    const result = parseEcrPaymentResponse(USER_REPORT_CORRUPTED);
    expect(result.approved).toBe(true);
  });

  it('approves corrupted APPROVED USB payload from 2026-06-12 logcat', () => {
    const result = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V7);
    expect(result.approved).toBe(true);
  });

  it('approves 2026-07-21 corrupted POS payload via plain-text responseCode 00 and/or errorCode 0', () => {
    expect(() => JSON.parse(USER_REPORT_CORRUPTED_2026_07_21)).toThrow();

    expect(extractEcrResponseCodeFromText(USER_REPORT_CORRUPTED_2026_07_21)).toBe('00');
    expect(extractEcrErrorCodeFromText(USER_REPORT_CORRUPTED_2026_07_21)).toBe(0);
    expect(hasEcrPlainTextCompletionSignal(USER_REPORT_CORRUPTED_2026_07_21)).toBe(true);

    const result = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_2026_07_21);
    expect(result.approved).toBe(true);
    expect(result.status).toBe('00');
  });

  it('approves corrupted payload with errorCode 0 even without responseCode', () => {
    expect(() => JSON.parse(CORRUPTED_ERROR_CODE_ZERO_ONLY)).toThrow();
    expect(extractEcrErrorCodeFromText(CORRUPTED_ERROR_CODE_ZERO_ONLY)).toBe(0);
    expect(hasEcrPlainTextCompletionSignal(CORRUPTED_ERROR_CODE_ZERO_ONLY)).toBe(true);

    const result = parseEcrPaymentResponse(CORRUPTED_ERROR_CODE_ZERO_ONLY);
    expect(result.approved).toBe(true);
  });
});

describe('parseEcrPaymentResponseHeuristic', () => {
  it('detects failure in corrupted usb json', () => {
    const result = parseEcrPaymentResponseHeuristic(CORRUPTED_TERMINAL_FAILURE);
    expect(result?.approved).toBe(false);
    expect(result?.message).toBeTruthy();
  });

  it('treats responseCode 00 and errorCode 0 as same-level completion on 2026-07-21 payload', () => {
    const result = parseEcrPaymentResponseHeuristic(USER_REPORT_CORRUPTED_2026_07_21);
    expect(result?.approved).toBe(true);
    expect(hasEcrPlainTextCompletionSignal(USER_REPORT_CORRUPTED_2026_07_21)).toBe(true);
  });
});

describe('ecrErrorFromPaymentResponse', () => {
  it('returns error for declined payload', () => {
    const err = ecrErrorFromPaymentResponse(JSON.stringify({ status: '99' }));
    expect(err?.message).toMatch(/rechazado/i);
  });

  it('returns error for corrupted terminal failure', () => {
    const err = ecrErrorFromPaymentResponse(CORRUPTED_TERMINAL_FAILURE);
    expect(err?.message).toMatch(/rechazado|Failed/i);
  });

  it('returns null for 2026-07-21 corrupted approved POS payload', () => {
    expect(ecrErrorFromPaymentResponse(USER_REPORT_CORRUPTED_2026_07_21)).toBeNull();
  });
});
