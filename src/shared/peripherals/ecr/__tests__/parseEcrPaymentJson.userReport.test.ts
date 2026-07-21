import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';
import {
  parseEcrPaymentJson,
  parseEcrPaymentJsonHeuristic,
} from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** Logcat 2026-06-04 — pago aprobado en terminal, app marcó error. */
const USER_REPORT_CORRUPTED = String.raw`[2{"ssucces":true",type":"paymet",e"rsult":0,"refencereNo":F"RE-1780599875085","danta":{"roiginalDate"6:"00i4","tmestamp":"2026-06-04T1:504:6.717Z","time":"154:4:045","trnsaType":0,"tipAmoun"t"","termi:nalID":"0000110","resu0lt":0,"accnoutTpey",:4e"rnsspoeCode":"00",dat"e":"2026-05-06"",d4eviceSreia"l"N602W322:114","merchantID":"0076549728","originaliTm"e:"150445","scucess":true,"reernecefNumber:"000008","respo"ensMessge:""APaPROVED","traceNumber":"00008","0abtchuNm""000001:","RRN":6"15519000008,""amount":"100","errorCode":0}}]`;

/** Logcat 2026-06-04 16:32 — responCseode, traceNumer, referenceNu":er. */
const USER_REPORT_CORRUPTED_V2 = String.raw`{"success":true,typ"e":"payment","result0":,"referenceNo"R:"EF-1780605127407","data":o{"riginalDate":"0460","tiestamp"m6-06-:"20204T16:3.2:18201Z","time":"163:2:17","ansTytrpe":0,"tipAmount":"","tinerm"alID0:"0001001","result":0,"accountType":4,"responCseode":"00","date":"206-062-04","deviceSerail":"N620W321241","merantchID":"00876547"29,"originalTime":1"16327","successtrue,"referenceNu":er":"0mb00013","respnseMoessage":"APROVEDP","traceNumer":"000b013","batchNum":"000001","RRN":"615520000013","amount":"100","errorCode":0}}`;

describe('user report 2026-06-04 corrupted APPROVED USB payload', () => {
  it('parses approval and builds posResponse for order registration', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED);
    const heuristic = parseEcrPaymentJsonHeuristic(USER_REPORT_CORRUPTED);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED,
      customer: {
        documentId: 'V12345678',
        firstName: 'Test',
        lastName: 'User',
        phone: '04121234567',
      },
      payerDocumentId: 'V12345678',
    });

    expect(approval.approved).toBe(true);
    expect(heuristic?.responseCode).toBe('00');
    expect(flat?.responseCode).toBe('00');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.responseMessage).toMatch(/APPROVED/i);
      expect(pos.payload.posResponse.traceNumber).toBe('00008');
      expect(pos.payload.posResponse.RRN).toBe('15519000008');
    }
  });

  it('parses responCseode / traceNumer variant and builds posResponse', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V2);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_V2);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_V2,
      customer: {
        documentId: 'V12345678',
        firstName: 'Test',
        lastName: 'User',
        phone: '04121234567',
      },
      payerDocumentId: 'V12345678',
    });

    expect(approval.approved).toBe(true);
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('0000013');
    expect(flat?.referenceNumber).toBe('00000013');
    expect(flat?.RRN).toBe('615520000013');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.traceNumber).toBe('0000013');
      expect(pos.payload.posResponse.RRN).toBe('615520000013');
    }
  });
});
