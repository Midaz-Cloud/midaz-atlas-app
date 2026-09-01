import {
  extractEcrErrorCodeFromText,
  extractEcrResponseCodeFromText,
} from './parseEcrPaymentJson';
import { extractLastBalancedJson } from './extractLastBalancedJson';
import {
  evaluateEcrApprovalFromPickedFields,
  pickEcrPaymentFields,
} from './pickEcrPaymentFields';

export type EcrPaymentParseResult = {
  approved: boolean;
  status?: string;
  message?: string;
};

function readEcrMessage(json: Record<string, unknown>): string | undefined {
  for (const key of [
    'message',
    'responseMessage',
    'responseMesages',
    'errorMessage',
    'description',
    'error',
  ]) {
    const value = json[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const data = json.data;
  if (data != null && typeof data === 'object') {
    return readEcrMessage(data as Record<string, unknown>);
  }

  return undefined;
}

function readHeuristicMessage(text: string): string | undefined {
  const patterns = [
    /responseMesasge"\s*:\s*"([A-Z]+)/i,
    /sreponseMessage"\s*:\s*"([A-Z]+)/i,
    /responseMessage"+\s*"?([A-Z]+)/i,
    /responseMesages?"\s*:\s*"([^"]+)"/i,
    /responseMessage"\s*:\s*"([^"]+)"/i,
    /respo[a-z0-9]*Me[a-z]*essage"+\s*"?([A-Z:PRVOED]+)/i,
    /ensMessge\s*:\s*"?([A-Za-z]+)/i,
    /responeMessage"\s*:\s*"([^"]+)"/i,
    /er"rorCode"?\s*:?\s*(-\d+)/i,
    /erro[r]?Corde"\s*:\s*(-\d+)/i,
    /errorCode"\s*:\s*(-\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
}

export { extractEcrErrorCodeFromText } from './parseEcrPaymentJson';

/** Primary completion signals in corrupted payloads: responseCode 00 and/or errorCode 0. */
export function hasEcrPlainTextCompletionSignal(text: string): boolean {
  if (extractEcrResponseCodeFromText(text) === '00') {
    return true;
  }
  return extractEcrErrorCodeFromText(text) === 0;
}

/**
 * Parses corrupted / non-standard JSON from USB serial (bit errors, nested `data`).
 * When strict JSON fails, completion is decided by plain-text:
 * `responseCode === "00"` and/or `errorCode === 0`.
 */
export function parseEcrPaymentResponseHeuristic(raw: string): EcrPaymentParseResult | null {
  const text = raw.trim();
  if (!text.includes('{') && !text.includes('success') && !text.includes('result')) {
    return null;
  }

  const failureSignals: RegExp[] = [
    /success["\s:f.]*false/i,
    /(?:ssucces|scucess)["\s:f.]*false/i,
    /responseMesages?"\s*:\s*"Failed"/i,
    /errorCode"\s*,?\s*:\s*-\d+/i,
    /(?:er"rorCode|erorrCode|erro[r]?Corde|errorCod[e]?)"?\s*,?\s*:?\s*-\d+/i,
    /resu0?1lt"\s*:\s*-1/i,
    /"result"\s*:\s*-1/,
    /responseCode""(?!00)\d{2}"\s*:\s*,/,
  ];

  const errorCode = extractEcrErrorCodeFromText(text);
  if (errorCode != null && errorCode < 0) {
    return {
      approved: false,
      message: readHeuristicMessage(text) ?? 'Transacción rechazada en terminal',
    };
  }

  if (failureSignals.some((re) => re.test(text))) {
    return {
      approved: false,
      message: readHeuristicMessage(text) ?? 'Transacción rechazada en terminal',
    };
  }

  // Same-level primary signals: responseCode 00 and/or errorCode 0.
  if (hasEcrPlainTextCompletionSignal(text)) {
    const status =
      extractEcrResponseCodeFromText(text) === '00'
        ? '00'
        : errorCode === 0
          ? 'errorCode:0'
          : undefined;
    return {
      approved: true,
      status,
      message: readHeuristicMessage(text),
    };
  }

  const approvedSignals: RegExp[] = [
    /success["\s:f.]*true/i,
    /success:\s*tru/i,
    /successr["\s:f.]*tue/i,
    /success":\s*ture/i,
    /(?:ssucces|scucess|successtrue|usccess)/i,
    /resopnseCod"e:\s*"00/i,
    /(?:responseCode|rnsspoeCode|rnnsspoeCode|dateseCode|responCseode|eresponseCoe)[^0-9]{0,12}"?[a-z:]*0{2}"?/i,
    /respon[a-z]*[Cc][a-z]*ode"\s*:\s*"?[a-z:]*0{2}"?/i,
    /APPROVED/i,
    /APROV[ED]+/i,
    /PRVOED/i,
  ];

  if (approvedSignals.some((re) => re.test(text)) && !failureSignals.some((re) => re.test(text))) {
    return { approved: true, message: readHeuristicMessage(text) };
  }

  return null;
}

function stripCorruptedArrayPrefix(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[')) {
    return trimmed;
  }
  const objectStart = trimmed.indexOf('{');
  if (objectStart <= 0) {
    return trimmed;
  }
  let inner = trimmed.slice(objectStart);
  if (inner.endsWith(']')) {
    inner = inner.replace(/\]\s*$/, '');
  }
  // If we have a trailing bracket but it's preceded by non-JSON noise or brackets, clean it up
  inner = inner.trim();
  if (inner.endsWith('}')) {
    // Perfectly fine, nothing to strip
  } else if (inner.endsWith('}]')) {
    inner = inner.slice(0, -2);
  } else if (inner.endsWith('}]}') || inner.endsWith('}]}]')) {
    inner = inner.replace(/\]+$/, '');
  }
  return inner;
}

function unwrapEcrPayload(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[')) {
    return trimmed;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      return typeof first === 'string' ? first : JSON.stringify(first);
    }
  } catch {
    return stripCorruptedArrayPrefix(trimmed);
  }
  return stripCorruptedArrayPrefix(trimmed);
}

/** Interprets JSON payload from UsbSerialModule / mock ECR. */
export function parseEcrPaymentResponse(raw: string): EcrPaymentParseResult {
  const focused = extractLastBalancedJson(raw) ?? raw;
  const candidate = unwrapEcrPayload(focused);

  // Conviase-style multi-field approval when structured fields are readable.
  const picked = evaluateEcrApprovalFromPickedFields(
    pickEcrPaymentFields(focused),
    focused,
  );
  if (picked) {
    return picked;
  }

  try {
    const json = JSON.parse(candidate) as Record<string, unknown>;
    const status = typeof json.status === 'string' ? json.status : undefined;
    const message = readEcrMessage(json);
    const nested = json.data;
    const nestedRecord =
      nested != null && typeof nested === 'object'
        ? (nested as Record<string, unknown>)
        : undefined;

    const nestedSuccess = nestedRecord?.success;
    const topSuccess = json.success;
    const nestedErrorCode = nestedRecord?.errorCode;
    const topErrorCode = json.errorCode;
    const errorCodeZero =
      nestedErrorCode === 0 ||
      topErrorCode === 0 ||
      nestedErrorCode === '0' ||
      topErrorCode === '0';

    if (topSuccess === true || nestedSuccess === true || errorCodeZero) {
      return { approved: true, status, message };
    }

    if (
      (typeof nestedErrorCode === 'number' && nestedErrorCode < 0) ||
      (typeof topErrorCode === 'number' && topErrorCode < 0)
    ) {
      return {
        approved: false,
        status,
        message: message ?? 'Transacción rechazada en terminal',
      };
    }

    if (
      (status != null && status !== '00') ||
      topSuccess === false ||
      nestedSuccess === false ||
      json.success === false
    ) {
      return { approved: false, status, message };
    }

    if (typeof json.approved === 'boolean') {
      return { approved: json.approved, status, message };
    }

    if (typeof json.result === 'number' && json.result < 0) {
      return { approved: false, status, message: message ?? `result ${json.result}` };
    }

    if (nestedRecord != null) {
      const nestedResult = nestedRecord.result ?? nestedRecord.resu1lt;
      if (typeof nestedResult === 'number' && nestedResult < 0) {
        return {
          approved: false,
          status,
          message: readEcrMessage(nestedRecord) ?? `result ${nestedResult}`,
        };
      }
    }
  } catch {
    const heuristic = parseEcrPaymentResponseHeuristic(focused);
    if (heuristic) {
      return heuristic;
    }

    const trimmed = focused.trim();
    if (/^ERROR:/i.test(trimmed)) {
      return { approved: false, message: trimmed };
    }
    if (
      /errorCode"\s*:\s*-\d+/i.test(trimmed) ||
      /\berrorMessage"\s*:\s*"/i.test(trimmed) ||
      /rechaz|deneg|\bfail(ed)?\b/i.test(trimmed)
    ) {
      return { approved: false, message: trimmed };
    }
  }

  const heuristic = parseEcrPaymentResponseHeuristic(focused);
  if (heuristic) {
    return heuristic;
  }

  if (hasEcrPlainTextCompletionSignal(focused)) {
    return {
      approved: true,
      status:
        extractEcrResponseCodeFromText(focused) === '00'
          ? '00'
          : extractEcrErrorCodeFromText(focused) === 0
            ? 'errorCode:0'
            : undefined,
      message: readHeuristicMessage(focused.trim()),
    };
  }

  return { approved: false, message: 'Respuesta de terminal no reconocida' };
}
