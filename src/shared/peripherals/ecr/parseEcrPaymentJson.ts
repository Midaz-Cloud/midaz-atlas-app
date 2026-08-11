import { logKioskCheckoutPayload } from '@shared/api/kiosk/logKioskCheckoutPayload';

import { extractLastBalancedJson } from './extractLastBalancedJson';
import {
  fuzzyExtractAmount,
  fuzzyExtractReferenceNumber,
  fuzzyExtractResponseCode,
  fuzzyExtractRrn,
  fuzzyExtractTraceNumber,
  resolvePosIdentityFields,
} from './fuzzyEcrFieldExtract';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

/** Normalizes RRN corrupted by USB serial (e.g. `61462300002:8` → `614623000028`). */
export function sanitizeEcrRrn(rrn: string): string {
  const withoutColon = rrn.replace(/:/g, '');
  const digits = withoutColon.replace(/\D/g, '');
  return digits.length >= 8 ? digits : withoutColon;
}

/** Fixes common USB bit errors in trace / reference tokens (`000b013` → `0000013`). */
export function sanitizeEcrNumericToken(value: string): string {
  return value
    .replace(/[oO]/g, '0')
    .replace(/[lL]/g, '1')
    .replace(/b/g, '0')
    .replace(/m/g, '0')
    .replace(/[^0-9A-Za-z]/g, '');
}

/** Normalizes response codes corrupted on USB (`d00`, `:00` → `00`). */
export function normalizeEcrResponseCode(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length >= 2) {
    return digits.slice(-2);
  }
  return digits.padStart(2, '0');
}

function extractEcrResponseCode(text: string): string | undefined {
  const raw = firstMatch(text, [
    /responseCode"+(\d{2})/i,
    /resopnseCod"e:\s*"(\d{2})/i,
    /responseCod"e:\s*"(\d{2})/i,
    /responseCod"e"\s*:\s*"(\d{2})/i,
    /responseCode"\s*:\s*"(\d{2})/i,
    // USB: "respons,eCode":"00""date"
    /respon[a-z]*[,][a-z]*eCode"\s*:\s*"(\d{2})/i,
    /respons,eCode"\s*:\s*"(\d{2})/i,
    // USB: d"responseCoe":"00"
    /d?"responseCoe"\s*:\s*"(\d{2})/i,
    /responseCoe"\s*:\s*"(\d{2})/i,
    /date?seCode"\s*:\s*"?[a-z:]*(\d{2})/i,
    /r[n]?[e]?n?ssp[o0]eCode"\s*:\s*"?[a-z:]*(\d{2})/i,
    /eresponseCoe"\s*:\s*"[a-z:]*(\d{2,})/i,
    /respon[a-z]*[Cc][a-z]*ode"\s*:\s*"?[a-z:]*(\d{2})/i,
    /responseC[a-z0-9]*e"\s*:\s*"[a-z:]*(\d{2,})/i,
    /[a-z]{3,20}oeCode"\s*:\s*"?[a-z:]*(\d{2})/i,
    /responseCd+ode"\s*:\s*"?[a-z:]*(\d{2})/i,
    /responseC[o0]d[e]?\s*"\s*:\s*"?[a-z:]*(\d{2})/i,
    /"responseCode"\s*:\s*"?[a-z:]*(\d{2})/i,
    /response[a-z0-9"._-]{0,16}:\s*"(\d{2})"/i,
    // Fallback: any *eCode / *Code near "00" before date/device
    /[a-z,]{0,8}eCode"\s*:\s*"(\d{2})"/i,
    /[a-z,]{0,8}Coe"\s*:\s*"(\d{2})"/i,
  ]);
  if (!raw) {
    return undefined;
  }
  return normalizeEcrResponseCode(raw);
}

/** @internal Used by approval heuristics — responseCode `00` means terminal approved. */
export function extractEcrResponseCodeFromText(text: string): string | undefined {
  return extractEcrResponseCode(text);
}

/**
 * Plain-text scan for ECR `errorCode` when USB corrupts JSON.
 * Prefers negative matches (failure) over zero.
 */
export function extractEcrErrorCodeFromText(text: string): number | undefined {
  const negative = text.match(
    /(?:er"rorCode|erorrCode|erro[r]?Corde|errorCod[e]?)"?\s*,?\s*:?\s*(-\d+)\b/i,
  );
  if (negative?.[1] != null) {
    return Number(negative[1]);
  }
  const zeroOrPositive = text.match(
    /(?:er"rorCode|erorrCode|erro[r]?Corde|errorCod[e]?)"?\s*,?\s*:?\s*(\d+)\b/i,
  );
  if (zeroOrPositive?.[1] != null) {
    return Number(zeroOrPositive[1]);
  }
  return undefined;
}

function concatEcrDigitTokens(...parts: Array<string | undefined>): string {
  return parts.filter((part) => part != null && part !== '').join('');
}

/** USB often breaks `"61552000014"0` → intended RRN `615520000014`. */
function repairBrokenQuoteRrn(base: string, trailing?: string): string {
  if (trailing === '0' && base.length >= 10 && base.length <= 12) {
    return `${base.slice(0, -2)}0${base.slice(-2)}`;
  }
  return concatEcrDigitTokens(base, trailing);
}

function extractEcrRrnRaw(text: string): string | undefined {
  const structured = text.match(/RRN"\s*:\s*"(\d{8,14})"(\d{1,2})?/i);
  if (structured?.[1]) {
    return repairBrokenQuoteRrn(structured[1], structured[2]);
  }

  // USB: "RRN":"6"20219000077 → 620219000077
  const splitQuote = text.match(/RRN"\s*:\s*"(\d{1,4})"(\d{8,14})/i);
  if (splitQuote?.[1] && splitQuote[2]) {
    return `${splitQuote[1]}${splitQuote[2]}`;
  }

  // USB missing opening quote: RRN":620219000075"
  const missingOpenQuote = text.match(/RRN"\s*:\s*(\d{8,14})"/i);
  if (missingOpenQuote?.[1]) {
    return missingOpenQuote[1];
  }

  const quoted = text.match(/RRN"\s*:\s*"([^",]+)/i);
  if (quoted?.[1]) {
    const normalized = sanitizeEcrRrn(quoted[1]);
    if (normalized.replace(/\D/g, '').length >= 8) {
      return normalized;
    }
  }

  const brokenColon = text.match(/RRN"*,?\s*":\s*"(\d{8,14})/i);
  if (brokenColon) {
    return brokenColon[1];
  }

  const beforeAmount = text.split(/,"amount"|amo"unt"|maoutn"|maount"/i)[0] ?? text;
  const legacy = beforeAmount.match(/RRN(?:[^0-9"]|"[^"]*")*(\d{8,14})/i);
  return legacy?.[1];
}

/**
 * Extracts POS payment fields from corrupted USB JSON when strict parse fails.
 * Plain-text identity first (Conviase); JSON.parse is optional.
 *
 * @param amountSentCents Céntimos enviados al POS (Conviase: no confiar solo en amount USB).
 */
export function parseEcrPaymentJsonHeuristic(
  raw: string,
  amountSentCents?: number,
): Record<string, unknown> | null {
  const text = normalizeEcrJsonEnvelope(raw);
  if (!text.includes('{')) {
    return null;
  }

  const errorCode = extractEcrErrorCodeFromText(text);
  if (errorCode != null && errorCode < 0) {
    return null;
  }

  // Plain-text identity first — tolerate broken keys like t:raceNumber / RRN"2:
  const identity = resolvePosIdentityFields(text, amountSentCents);
  if (identity != null) {
    return buildHeuristicFlat(text, {
      responseCode: identity.responseCode,
      errorCode,
      traceNumber: identity.traceNumber,
      referenceNumber: identity.referenceNumber,
      RRN: identity.RRN,
      amount: identity.amount,
      referenceNo: identity.referenceNo,
    });
  }

  // Legacy typo-list path when identity resolver cannot fill all required refs.
  let responseCode =
    fuzzyExtractResponseCode(text) ?? extractEcrResponseCode(text);
  if (!responseCode && errorCode === 0) {
    responseCode = '00';
  }
  if (!responseCode) {
    return null;
  }

  const traceNumberRaw =
    fuzzyExtractTraceNumber(text) ??
    firstMatch(text, [
      /traceNmberu"\s*:\s*"([^"]+)/i,
      /trace0?Number"\s*:\s*"([^"]+)"/i,
      /trac[a-z]*Num[b]*eer[a-z0-9]*"\s*:\s*"([^",]+)/i,
      /traceNu[m]?er[a-z0-9]*"\s*:\s*"([^"]+)"/i,
      /traceNumber"\s*:\s*"([^"]+)"/i,
      /traceNumber"\s*:\s*(\d+)/i,
      /traeNumber"\s*:\s*"([^"]+)"/i,
      /traeNumber"\s*:\s*(\d+)/i,
      /traceNmber"\s*:\s*"([^"]+)"/i,
      /traceumber"\s*:\s*"([^"]+)"/i,
      /"raceNumber"\s*:\s*"([^"]+)"/i,
      /trceNumber"\s*:\s*"([^"]+)"/i,
    ]);
  const traceNumber = traceNumberRaw
    ? sanitizeEcrNumericToken(traceNumberRaw)
    : undefined;

  const referenceNumberRaw =
    fuzzyExtractReferenceNumber(text) ??
    firstMatch(text, [
      /erfreenceNumber"\s*:\s*"([^"]+)/i,
      /referenceNu[a-z":]*"?([^",}\]]+)/i,
      /refe?renceNumber"+\s*:\s*"?([^",}\]]+)/i,
      /refe"renceNumber\s*:\s*"?([^",}\]]+)/i,
      /referenceNumber"\s*:\s*"([^"]+)"/i,
      /referenceNumber"\s*:\s*(\d+)/i,
    ]);
  const referenceNumber = referenceNumberRaw
    ? sanitizeEcrNumericToken(referenceNumberRaw)
    : undefined;

  const rrnRaw = fuzzyExtractRrn(text) ?? extractEcrRrnRaw(text);
  const amount = fuzzyExtractAmount(text, amountSentCents);

  if (!traceNumber || !rrnRaw || !amount) {
    return null;
  }

  const RRN = sanitizeEcrRrn(rrnRaw);
  if (RRN.replace(/\D/g, '').length < 8) {
    return null;
  }

  return buildHeuristicFlat(text, {
    responseCode,
    errorCode,
    traceNumber,
    referenceNumber: referenceNumber ?? traceNumber,
    RRN,
    amount,
  });
}

function buildHeuristicFlat(
  text: string,
  core: {
    responseCode: string;
    errorCode?: number;
    traceNumber: string;
    referenceNumber: string;
    RRN: string;
    amount: string;
    referenceNo?: string;
  },
): Record<string, unknown> {
  const responseMessage =
    firstMatch(text, [
      /responseMesasge"\s*:\s*"([A-Z]+)/i,
      /sreponseMessage"\s*:\s*"([A-Z]+)/i,
      /responseMessage"+\s*"?([A-Z]+)/i,
      /responseMessage"\s*:\s*"([^"]+)"/i,
      /responseMesages?"\s*:\s*"([^"]+)"/i,
      /respo[a-z0-9]*Me[a-z]*essage"+\s*"?([A-Z:PRVOED]+)/i,
      /respnseMo[a-z]*essage"\s*:\s*"([^"]+)"/i,
      /ensMessge\s*:\s*"?([A-Za-z]+)/i,
      /responeMessage"\s*:\s*"([^"]+)"/i,
    ]) ?? 'APPROVED';

  const accountTypeRaw = firstMatch(text, [
    /accountType"\s*:\s*(\d+)/i,
    /accountTyp"\s*:\s*(\d+)/i,
    /accoultuntTeyp"\s*:\s*(\d+)/i,
    /accountTyp:e"(\d+)/i,
    /a,ccountType"\s*:\s*(\d+)/i,
    /"?accountType:(\d+)/i,
  ]);
  const accountType = accountTypeRaw ? Number.parseInt(accountTypeRaw, 10) : undefined;

  const batchSplit = text.match(/batchNum"\s*:\s*"(\d{1,6})"(\d{1,6})"/i);
  const batchNum =
    (batchSplit?.[1] && batchSplit[2]
      ? `${batchSplit[1]}${batchSplit[2]}`
      : undefined) ??
    firstMatch(text, [
      /Nbatchum"\s*:\s*"(\d+)/i,
      /bachNum"t(\d+)/i,
      /batchNum:\s*"+(\d+)/i,
      /batchNum"\s*:\s*"([^"]+)"/i,
      /batchNum"\s*:\s*(\d+)/i,
      /0abtchuNm"+\s*"?([^",:]+)/i,
      /batc0hNum"\s*:\s*"([^"]+)"/i,
      /batc\d*hNum"\s*:\s*"([^"]+)"/i,
      /b0atchNum"\s*:\s*"([^"]+)"/i,
    ]) ??
    '000001';

  return {
    responseCode: core.responseCode,
    ...(core.errorCode != null ? { errorCode: core.errorCode } : {}),
    responseMessage: responseMessage.replace(/^t(?=APPROVED)/i, ''),
    referenceNumber: core.referenceNumber,
    traceNumber: core.traceNumber,
    RRN: core.RRN,
    terminalID:
      firstMatch(text, [
        /e"trminaIlD"\s*:\s*"(\d{6,})/i,
        /termialID"\s*:\s*n?"(\d{6,})/i,
        /terminalID"+\s*"([^":]+)/i,
        /terminalID"\s*:\s*"([^"]+)"/i,
        /terminalID"\s*:\s*(\d+)/i,
        /termi:nalID"\s*:\s*"([^"]+)"/i,
        /termi:nalID"\s*:\s*(\d+)/i,
        /tinerm"alID[a-z0-9":]*"?(\d{6,})/i,
        /minaDlI"\s*:\s*"(\d{6,})/i,
        /ermtilnaID"\s*:\s*"([^"]+)"/i,
        /ermtilnaID"\s*:\s*(\d+)/i,
        /t"erminalID"\s*:\s*"?(\d+)/i,
        /term0inalID"\s*:\s*"([^"]+)"/i,
        /term\d*inalID"\s*:\s*"([^"]+)"/i,
      ])?.replace(/[^0-9]/g, '') ??
      '00000000',
    deviceSerial:
      firstMatch(text, [
        /d"eviceeSrial"\s*:\s*"([^"]+)/i,
        /deviceSerial"\s*:\s*"([^"]+)"/i,
        /devicerieSa"l:\s*"([^"]+)/i,
        /deviceSerail"\s*:\s*"([^"]+)"/i,
        /deviceSreia"l"\s*:\s*"([^"]+)"/i,
        /d4eviceSreia"l"\s*:\s*"([^"]+)"/i,
      ]) ??
      '00000000',
    merchantID:
      (firstMatch(text, [
        /mrechantDI"\s*:\s*"([^"]+)/i,
        /emrchantDI"\s*:\s*"([^"]+)/i,
        /merchantID"\s*:\s*"([^"]+)"/i,
        /merchantID"\s*:\s*(\d+)/i,
        /mrechantID"\s*:\s*"([^"]+)/i,
        /me"rchantID"\s*:\s*"([^"]+)/i,
        /merantchID"\s*:\s*"([^"]+)/i,
      ]) ?? '0000000000').replace(/[^0-9]/g, '') || '0000000000',
    batchNum,
    amount: core.amount,
    ...(accountType != null && Number.isFinite(accountType) ? { accountType } : {}),
    referenceNo:
      core.referenceNo ??
      firstMatch(text, [
        /referenceNo"+\s*"?([A-Z0-9-]+)/i,
        /referenceNo"\s*:\s*"([^"]+)"/i,
        /reference"No:"\s*([A-Z0-9-]+)/i,
        /refecreneNo"\s*:\s*"([^"]+)/i,
        /referenceNo[a-z"A-Z:]*"?([A-Z0-9-]+)/i,
        /refencereNo"\s*:\s*"?([A-Z0-9-]+)/i,
        /referFenceNo"\s*:\s*"([^"]+)"/i,
        /(REF-\d{10,})/i,
      ]),
  };
}

function normalizeEcrJsonEnvelope(raw: string): string {
  const balanced = extractLastBalancedJson(raw);
  let trimmed = (balanced ?? raw).trim();
  if (trimmed.startsWith('[')) {
    const objectStart = trimmed.indexOf('{');
    if (objectStart > 0) {
      let inner = trimmed.slice(objectStart);
      trimmed = inner;
    }
  }
  // Strip any leading corrupted characters before the first '{' (like 'u{')
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace > 0) {
    trimmed = trimmed.slice(firstBrace);
  }
  // Strip any trailing corrupted characters after the last '}' (like '}]' or '}]}]')
  const lastBrace = trimmed.lastIndexOf('}');
  if (lastBrace >= 0) {
    trimmed = trimmed.slice(0, lastBrace + 1);
  }
  return trimmed;
}

function repairCorruptedJsonQuotes(raw: string): string {
  // Replace patterns like "timestamp":"2026-06-12T15:49:27."740Z" with "timestamp":"2026-06-12T15:49:27.740Z"
  // (unmatched quotes inside values or missing quotes around keys/values)
  let cleaned = raw;
  
  // Fix the specific timestamp corruption: "timestamp":"2026-06-12T15:49:27."740Z"
  cleaned = cleaned.replace(/"timestamp"\s*:\s*"([^"]+)"([^"]+)"/g, '"timestamp":"$1$2"');
  
  // Fix "time:"15:49:27" where key is missing closing quote: "time:"
  cleaned = cleaned.replace(/"time:(\s*)"/g, '"time":$1"');
  cleaned = cleaned.replace(/"time:"([^"]+)"/g, '"time":"$1"');
  cleaned = cleaned.replace(/"time:([^"]+)"/g, '"time":"$1"');

  // Fix "sccess":truey where truey is corrupted boolean/value
  cleaned = cleaned.replace(/:\s*truey\b/g, ':true');
  cleaned = cleaned.replace(/:\s*falsey\b/g, ':false');

  // Fix "sccess":truey where key is missing closing quote
  cleaned = cleaned.replace(/"sccess":/g, '"success":');

  // Fix "sccess":truey
  cleaned = cleaned.replace(/sccess/g, 'success');

  // Fix "pament"
  cleaned = cleaned.replace(/"pament"/g, '"payment"');

  // Fix "terinalID"
  cleaned = cleaned.replace(/"terinalID"/g, '"terminalID"');

  // Fix "reult"
  cleaned = cleaned.replace(/"reult"/g, '"result"');

  // Fix "succes"
  cleaned = cleaned.replace(/"succes"/g, '"success"');

  // Fix "reeferenceNumbr"
  cleaned = cleaned.replace(/"reeferenceNumbr"/g, '"referenceNumber"');

  // Fix "traeNumber"
  cleaned = cleaned.replace(/"traeNumber"/g, '"traceNumber"');

  // Fix "traceumber" (dropped N) — logcat 2026-07-23
  cleaned = cleaned.replace(/"traceumber"/g, '"traceNumber"');
  // Fix "traceNmber" (dropped u)
  cleaned = cleaned.replace(/"traceNmber"/g, '"traceNumber"');
  // Fix "8amount" / digit-prefixed amount keys
  cleaned = cleaned.replace(/"\d+amount"/g, '"amount"');

  return cleaned;
}

function parseEcrPaymentJsonStrict(raw: string): Record<string, unknown> | null {
  const trimmed = normalizeEcrJsonEnvelope(raw);
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      parsed = parsed[0];
    }
    const root = asRecord(parsed);
    if (!root) {
      return null;
    }
    const data = asRecord(root.data);
    if (data) {
      return { ...root, ...data };
    }
    return root;
  } catch {
    // Try repairing quotes and parsing again
    try {
      const repaired = repairCorruptedJsonQuotes(trimmed);
      let parsed: unknown = JSON.parse(repaired);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }
      const root = asRecord(parsed);
      if (!root) {
        return null;
      }
      const data = asRecord(root.data);
      if (data) {
        return { ...root, ...data };
      }
      return root;
    } catch {
      return null;
    }
  }
}

function flatHasRequiredPosFields(flat: Record<string, unknown>): boolean {
  const responseCodeRaw =
    typeof flat.responseCode === 'string' ? flat.responseCode : undefined;
  const normalized =
    responseCodeRaw != null ? normalizeEcrResponseCode(responseCodeRaw) : undefined;
  // Strict path needs canonical responseCode "00". errorCode-only cases go through heuristic.
  return Boolean(
    normalized === '00' && flat.traceNumber && (flat.RRN ?? flat.rrn) && flat.amount,
  );
}

export type ParseEcrPaymentJsonOptions = {
  /** Céntimos enviados al POS — fallback si el amount USB viene corrupto (Conviase). */
  amountSentCents?: number;
};

/** Parses POS JSON (strict), then heuristic fallback for corrupted USB payloads. */
export function parseEcrPaymentJson(
  raw: string,
  options?: ParseEcrPaymentJsonOptions,
): Record<string, unknown> | null {
  const focused = extractLastBalancedJson(raw) ?? raw;
  const strict = parseEcrPaymentJsonStrict(focused);
  // Valid JSON with renamed keys (e.g. raceNumber, respons,eCode) must still use heuristic.
  const heuristic =
    strict == null || !flatHasRequiredPosFields(strict)
      ? parseEcrPaymentJsonHeuristic(focused, options?.amountSentCents)
      : null;
  let flat =
    strict != null && flatHasRequiredPosFields(strict)
      ? strict
      : (heuristic ?? strict);

  // Conviase: if USB amount missing/corrupt but we know what we charged, fill it.
  if (
    flat != null &&
    (flat.amount == null || flat.amount === '') &&
    options?.amountSentCents != null &&
    options.amountSentCents > 0
  ) {
    flat = { ...flat, amount: String(options.amountSentCents) };
  }

  logKioskCheckoutPayload('POS JSON parse', {
    strictJsonValid: strict != null,
    flat,
    raw: focused,
  });
  return flat;
}
