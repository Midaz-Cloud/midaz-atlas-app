/**
 * Fuzzy / plain-text field extraction for USB-corrupted POS payloads.
 * Prefer value anchors over perfect JSON keys (Conviase approach).
 * Keys often gain/lose characters; values may grow trailing junk.
 */

function sanitizeNumericToken(value: string): string {
  return value
    .replace(/[oO]/g, '0')
    .replace(/[lL]/g, '1')
    .replace(/b/g, '0')
    .replace(/m/g, '0')
    .replace(/[^0-9A-Za-z]/g, '');
}

function sanitizeRrn(rrn: string): string {
  const withoutColon = rrn.replace(/:/g, '');
  const digits = withoutColon.replace(/\D/g, '');
  return digits.length >= 8 ? digits : withoutColon;
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

/** responseCode — tolerate minor key typos when value is clearly "00". */
export function fuzzyExtractResponseCode(text: string): string | undefined {
  const raw = firstMatch(text, [
    /"responseCode"\s*:\s*"([^"]+)"/i,
    /responseCd+ode"\s*:\s*"([^"]+)"/i,
    /responseCod[a-z0-9"]{0,6}\s*:\s*"([^"]+)"/i,
    /respon[a-z0-9,]{0,10}eCode"\s*:\s*"([^"]+)"/i,
    /dateseCode"\s*:\s*"([^"]+)"/i,
    /responCseode"\s*:\s*"([^"]+)"/i,
    /eresponseCoe"\s*:\s*"([^"]+)"/i,
    /[a-z,]{0,8}eCode"\s*:\s*"(\d{2})"/i,
  ]);
  if (!raw) {
    return undefined;
  }
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length >= 2) {
    return digits.slice(-2);
  }
  return digits.padStart(2, '0');
}

/**
 * traceNumber — tolerate broken keys like `t:raceNumber""000216`, `traceNu5mber`, `traceNumer`.
 * Anchor on (trace|race|trac)+Number-ish then nearby digits.
 */
export function fuzzyExtractTraceNumber(text: string): string | undefined {
  const raw = firstMatch(text, [
    /"traceNumber"\s*:\s*"([^"]+)"/i,
    /"trac[a-z0-9]{0,16}mber"\s*:\s*"([^"]+)"/i,
    /trac[a-z0-9]{0,16}mber"\s*:\s*"([^"]+)"/i,
    // USB: traceNumer / tracNumbeer / traceNu5mber
    /trac[a-z0-9]{0,16}(?:number|nmber|umber|mber|numer|beer)"?\s*:?\s*"?([0-9A-Za-z]{4,})/i,
    /"raceNumber"\s*:\s*"([^"]+)"/i,
    /raceNumber"\s*:\s*"?([^",}\]]+)/i,
    // USB: "t:raceNumber""000216" (colon in key, missing : between key/value)
    /t[:."]{0,3}raceNumber["\s:]{0,6}"?(\d{4,})/i,
    /(?:trace|trce|trae|trac|race)[a-z0-9:."]{0,12}(?:number|nmber|umber|mber|numer)["\s:]{0,6}"?([0-9A-Za-z]{4,})/i,
    /(?:trace|race)[^0-9]{0,16}(\d{4,8})/i,
  ]);
  return raw ? sanitizeNumericToken(raw) : undefined;
}

/**
 * RRN — 8+ digits; tolerate colon/letter junk inside value and
 * `RRN"2:"62122000016` (stray digit between key and value).
 */
export function fuzzyExtractRrn(text: string): string | undefined {
  // Prefer full quoted token so colon/letter corruption can be sanitized
  // e.g. "61462300002:8" → 614623000028, "61470100n0039" → 614701000039
  const quotedWithTrail = text.match(/RRN"\s*:\s*"([^"]+)"(\d{1,2})?/i);
  if (quotedWithTrail?.[1]) {
    const base = quotedWithTrail[1];
    const trailing = quotedWithTrail[2];
    // Avoid matching RRN"2:"… as a quoted value (base would be "2:")
    if (!/^\d{1,2}:$/.test(base) && /[0-9]/.test(base)) {
      let candidate = sanitizeRrn(base);
      if (
        trailing === '0' &&
        candidate.replace(/\D/g, '').length >= 10 &&
        candidate.replace(/\D/g, '').length <= 12
      ) {
        const digits = candidate.replace(/\D/g, '');
        candidate = `${digits.slice(0, -2)}0${digits.slice(-2)}`;
      }
      const digitsOnly = candidate.replace(/\D/g, '');
      if (digitsOnly.length >= 8) {
        return digitsOnly;
      }
    }
  }

  // USB: RRN"2:"62122000016 — junk digit between key and value
  const junkThenValue = firstMatch(text, [
    /RRN"\d:"(\d{8,14})/i,
    /RRN"\d?:?"(\d{8,14})/i,
  ]);
  if (junkThenValue) {
    return sanitizeRrn(junkThenValue);
  }

  const missingOpenQuote = text.match(/RRN"\s*:\s*(\d{8,14})"/i);
  if (missingOpenQuote?.[1]) {
    return sanitizeRrn(missingOpenQuote[1]);
  }

  const splitQuote = text.match(/RRN"\s*:\s*"(\d{1,4})"(\d{8,14})/i);
  if (splitQuote?.[1] && splitQuote[2]) {
    return sanitizeRrn(`${splitQuote[1]}${splitQuote[2]}`);
  }

  const raw = firstMatch(text, [
    /RRN"\s*:\s*"([^"]+)"/i,
    /RRN"\s*:\s*(\d{8,14})/i,
  ]);
  if (!raw) {
    return undefined;
  }
  const sanitized = sanitizeRrn(raw);
  return sanitized.replace(/\D/g, '').length >= 8 ? sanitized : undefined;
}

/**
 * amount — take leading digits from value; tolerate key/value corruption.
 * If USB amount is unusable, fall back to cents we sent to the terminal (Conviase).
 */
export function fuzzyExtractAmount(
  text: string,
  amountSentCents?: number,
): string | undefined {
  const raw = firstMatch(text, [
    /"amount"\s*:\s*"(\d+)/i,
    /"amount"\s*:\s*(\d+)/i,
    // USB: amount""100 (missing colon between key/value)
    /(?<![a-zA-Z])amount"+(\d+)/i,
    /"\d+amount"\s*:\s*"?(\d+)/i,
    /\d"amount"\s*:\s*"?(\d+)/i,
    /(?<![a-zA-Z])amount"\s*:\s*"?(\d+)/i,
    /maount"\s*:\s*"(\d+)/i,
    /maoutn"\s*:\s*"(\d+)/i,
    /amo"unt"\s*:\s*"?(\d+)/i,
    /amo"unt":(\d+)/i,
    /amout"\s*:\s*"?(\d+)/i,
  ]);
  if (raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length > 0) {
      return digits;
    }
  }
  if (amountSentCents != null && amountSentCents > 0) {
    return String(amountSentCents);
  }
  return undefined;
}

export function fuzzyExtractReferenceNumber(text: string): string | undefined {
  const raw = firstMatch(text, [
    /"referenceNumber"\s*:\s*"([^"]+)"/i,
    // USB: refrenceNumber"":"000026"
    /refe?renceNumber"+?\s*:?\s*"?([0-9A-Za-z]{3,})/i,
    // USB: referenceNu":er":"0mb00013" — skip junk, anchor on digits
    /referenceNu[^0-9]{0,16}([0-9A-Za-z]{4,})/i,
    /refe"?renceNumber"?\s*:\s*"?([0-9A-Za-z]+)/i,
    /erfreenceNumber"\s*:\s*"([^"]+)/i,
  ]);
  if (!raw) {
    return undefined;
  }
  const sanitized = sanitizeNumericToken(raw);
  // Reject garbage captures like "er"
  if (sanitized.replace(/\D/g, '').length < 3) {
    return undefined;
  }
  return sanitized;
}

/** Client/terminal reference like REF-1785529985025 (may appear corrupted). */
export function fuzzyExtractReferenceNo(text: string): string | undefined {
  return firstMatch(text, [
    /"referenceNo"\s*:\s*"([^"]+)"/i,
    /referenceNo"\s*:\s*"?([A-Z0-9-]+)/i,
    /(REF-\d{10,})/i,
  ]);
}

/**
 * Build a usable POS reference set when USB corrupts some keys.
 * Requires approval signal + amount; fills missing trace/RRN from siblings / REF.
 */
export function resolvePosIdentityFields(
  text: string,
  amountSentCents?: number,
): {
  responseCode: string;
  traceNumber: string;
  RRN: string;
  referenceNumber: string;
  amount: string;
  referenceNo?: string;
} | null {
  const responseCode = fuzzyExtractResponseCode(text);
  if (responseCode !== '00') {
    return null;
  }

  const amount = fuzzyExtractAmount(text, amountSentCents);
  if (!amount) {
    return null;
  }

  let traceNumber = fuzzyExtractTraceNumber(text);
  let RRN = fuzzyExtractRrn(text);
  let referenceNumber = fuzzyExtractReferenceNumber(text);
  const referenceNo = fuzzyExtractReferenceNo(text);

  if (!traceNumber && referenceNumber) {
    traceNumber = referenceNumber;
  }
  if (!referenceNumber && traceNumber) {
    referenceNumber = traceNumber;
  }

  if (!RRN && traceNumber) {
    const digits = traceNumber.replace(/\D/g, '');
    if (digits.length >= 8) {
      RRN = digits;
    }
  }

  if (!traceNumber && RRN) {
    traceNumber = RRN.replace(/\D/g, '').slice(-6).padStart(6, '0');
  }

  if (!referenceNumber && referenceNo) {
    const digits = referenceNo.replace(/\D/g, '');
    if (digits.length > 0) {
      referenceNumber = digits.slice(-6).padStart(6, '0');
      if (!traceNumber) {
        traceNumber = referenceNumber;
      }
    }
  }

  if (!RRN && referenceNo) {
    const digits = referenceNo.replace(/\D/g, '');
    if (digits.length >= 8) {
      RRN = digits.slice(-12).padStart(12, '0');
    }
  }

  if (!traceNumber || !RRN || !referenceNumber || !amount) {
    return null;
  }

  if (RRN.replace(/\D/g, '').length < 8) {
    return null;
  }

  return {
    responseCode: '00',
    traceNumber,
    RRN,
    referenceNumber,
    amount,
    ...(referenceNo ? { referenceNo } : {}),
  };
}
