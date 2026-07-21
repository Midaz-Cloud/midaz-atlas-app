import { ecrErrorFromPaymentResponse } from '../ecrTransactionError';
import {
  parseEcrPaymentResponse,
  parseEcrPaymentResponseHeuristic,
} from '../parseEcrPaymentResponse';

/** Sample from logcat — corrupted USB JSON with failure in nested `data`. */
const CORRUPTED_TERMINAL_FAILURE = String.raw`{"success":teur"typ,e":"paymet,"result":0,"rfe"nrenceNo":e"REF-1779833607950","data":{"originalDat":"1e80434","timestamp":"2026-05-26T18:04:34.094Z","time":"18:04:34","transType":0,"tipAmount":"","terminalID":"0000100","resu1lt":-1,"countaTcype":2,"responseCode""03":,"date":"2026-05-26","deviceSerail":"N620W322141","merchantID:""0010000017","originalTime":"0526","success"fals:e,"referenceNumber":"000003","responseMesages":"Failed","traceNumber":"000003","batchNum":"000001","RRN":"614622000003","amount":"1","errorCode":-12}}`;

/** Logcat 2026-06-04 — pago aprobado en terminal, app marcó error por JSON corrupto USB. */
const USER_REPORT_CORRUPTED = String.raw`[2{"ssucces":true",type":"paymet",e"rsult":0,"refencereNo":F"RE-1780599875085","danta":{"roiginalDate"6:"00i4","tmestamp":"2026-06-04T1:504:6.717Z","time":"154:4:045","trnsaType":0,"tipAmoun"t"","termi:nalID":"0000110","resu0lt":0,"accnoutTpey",:4e"rnsspoeCode":"00",dat"e":"2026-05-06"",d4eviceSreia"l"N602W322:114","merchantID":"0076549728","originaliTm"e:"150445","scucess":true,"reernecefNumber:"000008","respo"ensMessge:""APaPROVED","traceNumber":"00008","0abtchuNm""000001:","RRN":6"15519000008,""amount":"100","errorCode":0}}]`;

/** Logcat 2026-06-12 — pago aprobado en terminal, JSON corrupto con prefijo 'u{' y comillas rotas. */
const USER_REPORT_CORRUPTED_V7 = String.raw`[u{"sccess":truey,"type":"pament","result":0,"referenceNo":"RE2F-178129376836","data":{"originalDate":"0612","timestamp":"2026-06-12T15:49:27."740Z","time:"15:49:27","transType":0,"tipAmoumnt":"","terinalID":"00s001001","reult":0,"accountType":2,"responseCode":"00","date":"2026-06-12","deviceSerial":"N620W322141","merchantID":"0087654729","originalTime":"154s927","succes":true,"reeferenceNumbr":"000001","responseMessage":"APPcROVED","traeNumber":"000027","batchNum":"000002","RRN":"616319000027","amount":"100","errorCode":0}}]`;

describe('parseEcrPaymentResponse', () => {
  it('approves status approved', () => {
    expect(parseEcrPaymentResponse(JSON.stringify({ status: 'approved' })).approved).toBe(
      true,
    );
  });

  it('approves status 00', () => {
    expect(parseEcrPaymentResponse(JSON.stringify({ status: '00' })).approved).toBe(true);
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

  it('treats benign non-json as approved', () => {
    expect(parseEcrPaymentResponse('OK').approved).toBe(true);
  });

  it('rejects corrupted terminal failure payload from logcat', () => {
    expect(parseEcrPaymentResponse(CORRUPTED_TERMINAL_FAILURE).approved).toBe(false);
  });

  it('approves corrupted APPROVED USB payload from 2026-06-04 logcat', () => {
    const result = parseEcrPaymentResponse(USER_REPORT_CORRUPTED);
    expect(result.approved).toBe(true);
  });

  it('approves corrupted APPROVED USB payload from 2026-06-12 logcat', () => {
    const result = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V7);
    expect(result.approved).toBe(true);
  });
});

describe('parseEcrPaymentResponseHeuristic', () => {
  it('detects failure in corrupted usb json', () => {
    const result = parseEcrPaymentResponseHeuristic(CORRUPTED_TERMINAL_FAILURE);
    expect(result?.approved).toBe(false);
    expect(result?.message).toBeTruthy();
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
});
