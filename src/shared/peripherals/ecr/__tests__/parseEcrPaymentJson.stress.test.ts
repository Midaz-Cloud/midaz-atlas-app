import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Stress suite: corrupt many fields like real USB noise, but keep at least one
 * primary completion signal intact (`responseCode` "00" and/or `errorCode`: 0).
 *
 * Goal: measure how many realistic corruptions still yield approval + POS payload.
 */

type Mutation = {
  id: string;
  /** Apply corruption to a clean JSON object string (single-line). */
  apply: (raw: string) => string;
  /** If true, this mutation damages responseCode key/value — keep errorCode:0. */
  damagesResponseCode?: boolean;
  /** If true, this mutation damages errorCode — keep responseCode "00". */
  damagesErrorCode?: boolean;
};

const CLEAN_INNER = {
  success: true,
  type: 'payment',
  result: 0,
  referenceNo: 'REF-1784669999001',
  data: {
    originalDate: '0721',
    timestamp: '2026-07-21T15:40:00.000Z',
    time: '15:40:00',
    transType: 0,
    tipAmount: '',
    terminalID: '00001001',
    result: 0,
    accountType: 2,
    responseCode: '00',
    date: '2026-07-21',
    deviceSerial: 'N620W312565',
    merchantID: '0078513748',
    originalTime: '154000',
    success: true,
    referenceNumber: '000099',
    responseMessage: 'APPROVED',
    traceNumber: '000099',
    batchNum: '000004',
    RRN: '620219000099',
    amount: '737',
    errorCode: 0,
  },
};

function cleanPayload(): string {
  return JSON.stringify(CLEAN_INNER);
}

/** Mutations observed (or styled) from AF910 USB logcat. */
const FIELD_MUTATIONS: Mutation[] = [
  // --- responseCode variants (damages RC → rely on errorCode:0) ---
  {
    id: 'rc:respons,eCode',
    damagesResponseCode: true,
    apply: (r) => r.replace('"responseCode":"00"', '"respons,eCode":"00"'),
  },
  {
    id: 'rc:responseCoe',
    damagesResponseCode: true,
    apply: (r) => r.replace('"responseCode":"00"', 'd"responseCoe":"00"'),
  },
  {
    id: 'rc:responseCdode',
    damagesResponseCode: true,
    apply: (r) => r.replace('"responseCode":"00"', '"responseCdode":"00"'),
  },
  {
    id: 'rc:responCseode',
    damagesResponseCode: true,
    apply: (r) => r.replace('"responseCode":"00"', '"responCseode":"00"'),
  },
  {
    id: 'rc:glued-date',
    damagesResponseCode: true,
    apply: (r) => r.replace('"responseCode":"00","date"', '"responseCode":"00""date"'),
  },
  {
    id: 'rc:missing-key-keep-00-nearby',
    damagesResponseCode: true,
    apply: (r) => r.replace('"responseCode":"00"', '"rspnsCod":"00"'),
  },

  // --- errorCode variants (damages EC → rely on responseCode) ---
  {
    id: 'ec:er"rorCode',
    damagesErrorCode: true,
    apply: (r) => r.replace('"errorCode":0', 'er"rorCode":0'),
  },
  {
    id: 'ec:erroCorde',
    damagesErrorCode: true,
    apply: (r) => r.replace('"errorCode":0', '"erroCorde":0'),
  },
  {
    id: 'ec:spaces',
    damagesErrorCode: true,
    apply: (r) => r.replace('"errorCode":0', '"errorCode" : 0'),
  },

  // --- trace / reference ---
  { id: 'trace:raceNumber', apply: (r) => r.replace('"traceNumber"', '"raceNumber"') },
  { id: 'trace:trceNumber', apply: (r) => r.replace('"traceNumber"', '"trceNumber"') },
  { id: 'trace:traeNumber', apply: (r) => r.replace('"traceNumber"', '"traeNumber"') },
  { id: 'trace:trac0eNumber', apply: (r) => r.replace('"traceNumber"', '"trac0eNumber"') },
  { id: 'trace:trace0Number', apply: (r) => r.replace('"traceNumber"', '"trace0Number"') },
  {
    id: 'ref:referenceNmber',
    apply: (r) => r.replace('"referenceNumber"', '"referenceNmber"'),
  },
  {
    id: 'ref:rbeferenceNumer',
    apply: (r) => r.replace('"referenceNumber"', '"rbeferenceNumer"'),
  },
  {
    id: 'ref:reerenceNumbe,r',
    apply: (r) => r.replace('"referenceNumber"', '"reerenceNumbe,r"'),
  },
  {
    id: 'ref:value-0s09',
    apply: (r) => r.replace('"referenceNumber":"000099"', '"referenceNumber":"0000s99"'),
  },

  // --- RRN ---
  {
    id: 'rrn:split-quote',
    apply: (r) => r.replace('"RRN":"620219000099"', '"RRN":"6"20219000099'),
  },
  {
    id: 'rrn:missing-open-quote',
    apply: (r) => r.replace('"RRN":"620219000099"', 'RRN":620219000099"'),
  },
  {
    id: 'rrn:colon-noise',
    apply: (r) => r.replace('"RRN":"620219000099"', '"RRN":"62021900009:9"'),
  },

  // --- amount / batch / terminal / message ---
  { id: 'amt:amout', apply: (r) => r.replace('"amount"', '"amout"') },
  { id: 'amt:maoutn', apply: (r) => r.replace('"amount"', '"maoutn"') },
  {
    id: 'batch:batc0hNum',
    apply: (r) => r.replace('"batchNum"', '"batc0hNum"'),
  },
  {
    id: 'batch:split-quote',
    apply: (r) => r.replace('"batchNum":"000004"', '"batchNum":"000"004"'),
  },
  {
    id: 'term:term0inalID',
    apply: (r) => r.replace('"terminalID"', '"term0inalID"'),
  },
  {
    id: 'term:teminalID',
    apply: (r) => r.replace('"terminalID"', '"teminalID"'),
  },
  {
    id: 'msg:tAPPROVED',
    apply: (r) => r.replace('"responseMessage":"APPROVED"', '"responeMessage":"tAPPROVED"'),
  },
  {
    id: 'msg:APaPROVED',
    apply: (r) => r.replace('"APPROVED"', '"APaPROVED"'),
  },
  {
    id: 'msg:APPcROVED',
    apply: (r) => r.replace('"APPROVED"', '"APPcROVED"'),
  },

  // --- envelope / boolean / type noise ---
  { id: 'env:truae', apply: (r) => r.replace('"success":true', '"success":truae') },
  { id: 'env:pyment', apply: (r) => r.replace('"type":"payment"', '"type":"pyment"') },
  { id: 'env:paylment', apply: (r) => r.replace('"type":"payment"', '"type":"paylment"') },
  {
    id: 'env:data-missing-colon',
    apply: (r) => r.replace('"data":{', '"data"{'),
  },
  {
    id: 'env:array-prefix-u',
    apply: (r) => `[u${r}]`,
  },
  {
    id: 'env:array-prefix-2',
    apply: (r) => `[2${r}]`,
  },
  {
    id: 'env:accountType-glued',
    apply: (r) => r.replace('"accountType":2', '""accountType:2'),
  },
  {
    id: 'env:ac2countType-empty',
    apply: (r) => r.replace('"accountType":2', '"ac2countType":,'),
  },
];

type StressCase = {
  name: string;
  raw: string;
};

function buildSingleMutationCases(): StressCase[] {
  return FIELD_MUTATIONS.map((m) => {
    let raw = cleanPayload();
    // If mutation damages responseCode, ensure errorCode:0 remains (already in clean).
    // If mutation damages errorCode, ensure responseCode "00" remains.
    raw = m.apply(raw);
    if (m.damagesErrorCode) {
      // re-assert responseCode is still present for primary signal
      if (!raw.includes('"responseCode":"00"') && !/responseCode":"00"/.test(raw)) {
        raw = raw.replace(/"errorCode"\s*:\s*0/, '"responseCode":"00","errorCode":0');
      }
    }
    return { name: `single:${m.id}`, raw };
  });
}

function buildMultiMutationCases(comboSize: number, maxCases: number): StressCase[] {
  const cases: StressCase[] = [];
  const pool = FIELD_MUTATIONS;

  for (let i = 0; i < pool.length && cases.length < maxCases; i += 1) {
    for (let j = i + 1; j < pool.length && cases.length < maxCases; j += 1) {
      const picks = [pool[i]!, pool[j]!];
      if (comboSize >= 3) {
        const k = (j + 1) % pool.length;
        if (k === i || k === j) {
          continue;
        }
        picks.push(pool[k]!);
      }
      if (comboSize >= 4) {
        const n = (j + 3) % pool.length;
        if (picks.some((p) => p.id === pool[n]!.id)) {
          continue;
        }
        picks.push(pool[n]!);
      }

      // Guarantee at least one primary signal: if any pick damages BOTH, skip.
      const damagesRc = picks.some((p) => p.damagesResponseCode);
      const damagesEc = picks.some((p) => p.damagesErrorCode);
      // Always OK: we keep the undamaged primary in clean base unless both are damaged.
      if (damagesRc && damagesEc) {
        // Still OK if we leave one intact — apply damagesErrorCode first then restore RC,
        // or skip restoring EC. Prefer keep errorCode:0 by not applying EC damage when RC damaged.
        const filtered = picks.filter((p) => !(damagesRc && p.damagesErrorCode));
        if (filtered.length < 2) {
          continue;
        }
        let raw = cleanPayload();
        for (const m of filtered) {
          raw = m.apply(raw);
        }
        cases.push({
          name: `x${filtered.length}:${filtered.map((p) => p.id).join('+')}`,
          raw,
        });
        continue;
      }

      let raw = cleanPayload();
      for (const m of picks) {
        raw = m.apply(raw);
      }
      cases.push({
        name: `x${picks.length}:${picks.map((p) => p.id).join('+')}`,
        raw,
      });
    }
  }

  return cases.slice(0, maxCases);
}

/** Real logcat payloads (already known). */
const REAL_LOGCAT_CASES: StressCase[] = [
  {
    name: 'real:2026-07-21-1402',
    raw: String.raw`{"success":truae,"type":"pyment","result":0,"referenceNo":"R1EF-178466052143","data":{"originalDate":"0721","timestamp":"2026-07-21T15:01:58.941Z","time":"15:01:58","transType":0,"tipAmorunt":"","teminalID":"0e0001001","rsult":0,"ac2countType":,"responseCode":"00","date":"2026-07-21","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"150158","success":true,"rbeferenceNumer":"000008","responseMessage":"APaPROVED","trceNumber":"000075","batchNum":"000"004","RRN":620219000075","amount":"737","errorCode":0}}`,
  },
  {
    name: 'real:2026-07-21-1421',
    raw: String.raw`{"success":true,"type":"payment","result":0,"referenceNo":"REF-1784661712348","data":{"originalDate":"07a21","timestmp":"2026-07-21T15:21:54.961Z","time":"15:21:54","transType":0,"tipAmount":"","terminalID":""00001001",result":0,""accountType:2,"respons,eCode":"00""date":"2026-07-21","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"152154","success":true,u"referenceNmber":"0000s09","responeMessage":"tAPPROVED","raceNumber":"000076","batchNum":"000004","RRN":"620219000076","amount":"737","errorCode":0}}`,
  },
  {
    name: 'real:2026-07-21-1429',
    raw: String.raw`{"success":true,"type":"paylment","resut":0,"referFenceNo":"RE-1784662173:736","data"{"originalDate":"0721","timestamp":"2026-07-21T15:29:36.905Z","time":"15:29:36","transType"n:0,"tipAmout":"","term0inalID":"0001001","result":0,"accountType":2,d"responseCoe":"00","da7te":"2026-0-21","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"152936","succesfs":true,"reerenceNumbe,r":"000010""responseMessage":"APPROVED","trac0eNumber":"00077","batc0hNum":"00004","RRN":"6"20219000077,"amount":"737","errorCode":0}}`,
  },
];

function runCase(c: StressCase): {
  name: string;
  approved: boolean;
  flatOk: boolean;
  posOk: boolean;
  reason?: string;
} {
  const approval = parseEcrPaymentResponse(c.raw);
  const flat = parseEcrPaymentJson(c.raw);
  const pos = buildPosPaymentFromEcr({
    rawEcrResponse: c.raw,
    customer: {
      documentId: 'V26728807',
      firstName: 'Stress',
      lastName: 'Test',
      phone: '04140000000',
    },
    payerDocumentId: '26728807',
    paymentMethodId: 'pos',
  });

  return {
    name: c.name,
    approved: approval.approved,
    flatOk: flat != null,
    posOk: pos.ok,
    reason: pos.ok ? undefined : pos.message,
  };
}

describe('ECR USB corruption stress', () => {
  const singles = buildSingleMutationCases();
  const pairs = buildMultiMutationCases(2, 80);
  const triples = buildMultiMutationCases(3, 60);
  const quads = buildMultiMutationCases(4, 40);
  const allCases = [...REAL_LOGCAT_CASES, ...singles, ...pairs, ...triples, ...quads];

  it(`covers ${allCases.length} corrupted payloads with primary signal intact`, () => {
    const results = allCases.map(runCase);

    const approved = results.filter((r) => r.approved);
    const flatOk = results.filter((r) => r.flatOk);
    const posOk = results.filter((r) => r.posOk);
    const fullPass = results.filter((r) => r.approved && r.flatOk && r.posOk);
    const failures = results.filter((r) => !(r.approved && r.flatOk && r.posOk));

    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '===== ECR stress summary =====',
        `total cases:     ${results.length}`,
        `approved:        ${approved.length}/${results.length}`,
        `flat extracted:  ${flatOk.length}/${results.length}`,
        `pos payload ok:  ${posOk.length}/${results.length}`,
        `full pass:       ${fullPass.length}/${results.length} (${((fullPass.length / results.length) * 100).toFixed(1)}%)`,
        failures.length
          ? `failures (${failures.length}):\n${failures
              .slice(0, 25)
              .map((f) => `  - ${f.name} | approved=${f.approved} flat=${f.flatOk} pos=${f.posOk} ${f.reason ?? ''}`)
              .join('\n')}${failures.length > 25 ? `\n  ... +${failures.length - 25} more` : ''}`
          : 'failures: none',
        '==============================',
        '',
      ].join('\n'),
    );

    // Hard gate: real logcat cases must fully pass.
    for (const real of REAL_LOGCAT_CASES) {
      const r = results.find((x) => x.name === real.name);
      expect(r?.approved).toBe(true);
      expect(r?.flatOk).toBe(true);
      expect(r?.posOk).toBe(true);
    }

    // Soft gate for generated stress: at least 85% full pass with primary signal kept.
    const generated = results.filter((r) => !r.name.startsWith('real:'));
    const generatedPass = generated.filter((r) => r.approved && r.flatOk && r.posOk);
    const rate = generatedPass.length / Math.max(1, generated.length);
    expect(rate).toBeGreaterThanOrEqual(0.85);

    // Approval should almost always succeed when errorCode:0 or responseCode 00 remains.
    const approvalRate = approved.length / results.length;
    expect(approvalRate).toBeGreaterThanOrEqual(0.95);
  });

  it.each(REAL_LOGCAT_CASES.map((c) => [c.name, c.raw] as const))(
    'real case %s builds POS payload',
    (_name, raw) => {
      expect(parseEcrPaymentResponse(raw).approved).toBe(true);
      expect(parseEcrPaymentJson(raw)).not.toBeNull();
      expect(
        buildPosPaymentFromEcr({
          rawEcrResponse: raw,
          customer: {
            documentId: 'V26728807',
            firstName: 'Stress',
            lastName: 'Test',
            phone: '04140000000',
          },
          payerDocumentId: '26728807',
        }).ok,
      ).toBe(true);
    },
  );
});
