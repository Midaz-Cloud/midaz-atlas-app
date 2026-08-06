import {
  extractEcrErrorCodeFromText,
  extractEcrResponseCodeFromText,
} from './parseEcrPaymentJson';
import { extractLastBalancedJson } from './extractLastBalancedJson';
import { fuzzyExtractRrn } from './fuzzyEcrFieldExtract';
import {
  evaluateEcrApprovalFromPickedFields,
  pickEcrPaymentFields,
} from './pickEcrPaymentFields';
import {
  evaluatePosPaymentSuccessCascade,
  type PosPaymentSuccessFields,
} from './posPaymentSuccessCascade';

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

function readNumberish(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return null;
}

function cascadeFieldsFromJson(json: Record<string, unknown>): PosPaymentSuccessFields {
  const nested =
    json.data != null && typeof json.data === 'object'
      ? (json.data as Record<string, unknown>)
      : undefined;

  const errorCode =
    readNumberish(nested?.errorCode) ?? readNumberish(json.errorCode);
  const result =
    readNumberish(nested?.result) ??
    readNumberish(nested?.resu1lt) ??
    readNumberish(json.result);
  const rrn =
    (typeof nested?.RRN === 'string' && nested.RRN.trim()) ||
    (typeof nested?.rrn === 'string' && nested.rrn.trim()) ||
    (typeof json.RRN === 'string' && json.RRN.trim()) ||
    (typeof json.rrn === 'string' && json.rrn.trim()) ||
    null;
  const responseMessage =
    (typeof nested?.responseMessage === 'string' && nested.responseMessage.trim()) ||
    (typeof nested?.responseMesages === 'string' && nested.responseMesages.trim()) ||
    (typeof json.responseMessage === 'string' && json.responseMessage.trim()) ||
    null;

  return { errorCode, result, rrn, responseMessage };
}

/** Extract the 4 cascade signals from raw USB text (strict pick + fuzzy fallbacks). */
export function extractPosPaymentSuccessFieldsFromRaw(raw: string): PosPaymentSuccessFields {
  const picked = pickEcrPaymentFields(raw);
  return {
    errorCode: picked.errorCode ?? extractEcrErrorCodeFromText(raw),
    result: picked.innerResult ?? picked.result,
    rrn: picked.rrn?.trim() || fuzzyExtractRrn(raw) || null,
    responseMessage: picked.responseMessage ?? readHeuristicMessage(raw) ?? null,
  };
}

export { extractEcrErrorCodeFromText } from './parseEcrPaymentJson';

/** @deprecated Prefer success cascade; kept for tests / logging of legacy signals. */
export function hasEcrPlainTextCompletionSignal(text: string): boolean {
  if (extractEcrResponseCodeFromText(text) === '00') {
    return true;
  }
  return extractEcrErrorCodeFromText(text) === 0;
}

function resultFromCascade(
  fields: PosPaymentSuccessFields,
  statusHint?: string,
  messageHint?: string,
): EcrPaymentParseResult {
  const cascade = evaluatePosPaymentSuccessCascade(fields);
  if (cascade.approved) {
    return {
      approved: true,
      status: statusHint,
      message: messageHint ?? (typeof fields.responseMessage === 'string'
        ? fields.responseMessage
        : undefined),
    };
  }
  return {
    approved: false,
    status: statusHint,
    message:
      ('reason' in cascade ? cascade.reason : undefined) ??
      messageHint ??
      'Transacción rechazada en terminal',
  };
}

/**
 * Parses corrupted / non-standard JSON from USB serial via the success cascade.
 */
export function parseEcrPaymentResponseHeuristic(raw: string): EcrPaymentParseResult | null {
  const text = raw.trim();
  if (!text.includes('{') && !text.includes('success') && !text.includes('result')) {
    return null;
  }

  const fields = extractPosPaymentSuccessFieldsFromRaw(text);
  const hasInput =
    fields.errorCode != null ||
    fields.result != null ||
    Boolean(fields.rrn?.trim()) ||
    Boolean(fields.responseMessage?.trim());
  if (!hasInput) {
    return null;
  }

  const status =
    extractEcrResponseCodeFromText(text) === '00' ? '00' : undefined;
  return resultFromCascade(fields, status, readHeuristicMessage(text));
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
  inner = inner.trim();
  if (inner.endsWith('}')) {
    // ok
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
    const fields = cascadeFieldsFromJson(json);
    const hasCascadeInput =
      fields.errorCode != null ||
      fields.result != null ||
      Boolean(fields.rrn?.trim()) ||
      Boolean(fields.responseMessage?.trim());

    if (hasCascadeInput) {
      const cascadeResult = resultFromCascade(
        fields,
        status === '00' ? '00' : status,
        message,
      );
      return cascadeResult;
    }

    // No cascade fields: reject non-success status / explicit decline flags.
    if (status != null && status !== '00' && status !== 'approved') {
      return { approved: false, status, message };
    }
    if (json.success === false) {
      return { approved: false, status, message };
    }
    if (typeof json.approved === 'boolean') {
      return { approved: json.approved, status, message };
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
  }

  const heuristic = parseEcrPaymentResponseHeuristic(focused);
  if (heuristic) {
    return heuristic;
  }

  // Fuzzy cascade on full raw (handles typo keys not caught by strict pick).
  const fuzzyFields = extractPosPaymentSuccessFieldsFromRaw(focused);
  const fuzzyHasInput =
    fuzzyFields.errorCode != null ||
    fuzzyFields.result != null ||
    Boolean(fuzzyFields.rrn?.trim()) ||
    Boolean(fuzzyFields.responseMessage?.trim());
  if (fuzzyHasInput) {
    const status =
      extractEcrResponseCodeFromText(focused) === '00' ? '00' : undefined;
    return resultFromCascade(fuzzyFields, status, readHeuristicMessage(focused.trim()));
  }

  return { approved: false, message: 'Respuesta del terminal no válida' };
}
