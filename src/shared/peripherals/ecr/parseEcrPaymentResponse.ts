import { extractEcrResponseCodeFromText } from './parseEcrPaymentJson';

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

/**
 * Parses corrupted / non-standard JSON from USB serial (bit errors, nested `data`).
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
    /errorCode"\s*:\s*-\d+/i,
    /resu0?1lt"\s*:\s*-1/i,
    /"result"\s*:\s*-1/,
    /responseCode""(?!00)\d{2}"\s*:\s*,/,
  ];

  if (failureSignals.some((re) => re.test(text))) {
    return {
      approved: false,
      message: readHeuristicMessage(text) ?? 'Transacción rechazada en terminal',
    };
  }

  if (extractEcrResponseCodeFromText(text) === '00') {
    return { approved: true, status: '00', message: readHeuristicMessage(text) };
  }

  const approvedSignals: RegExp[] = [
    /success["\s:f.]*true/i,
    /success:\s*tru/i,
    /successr["\s:f.]*tue/i,
    /success":\s*ture/i,
    /(?:ssucces|scucess|successtrue|usccess)/i,
    /(?:er"rorCode|erorrCode|erro[r]?Corde|errorCode)"?\s*:?\s*0\b/i,
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
  const candidate = unwrapEcrPayload(raw);

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

    if (
      status === '00' ||
      status === 'approved' ||
      topSuccess === true ||
      nestedSuccess === true
    ) {
      return { approved: true, status, message };
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
    const heuristic = parseEcrPaymentResponseHeuristic(raw);
    if (heuristic) {
      return heuristic;
    }

    const trimmed = raw.trim();
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

  const heuristic = parseEcrPaymentResponseHeuristic(raw);
  if (heuristic) {
    return heuristic;
  }

  if (extractEcrResponseCodeFromText(raw) === '00') {
    return { approved: true, status: '00', message: readHeuristicMessage(raw.trim()) };
  }

  return { approved: true };
}
