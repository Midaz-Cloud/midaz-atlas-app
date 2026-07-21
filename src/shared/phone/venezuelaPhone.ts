/** Códigos de operadora móvil (3 dígitos, sin el 0 inicial). */
export const VENEZUELA_MOBILE_OPERATOR_CODES = [
  '412',
  '414',
  '424',
  '416',
  '426',
] as const;

export type VenezuelaMobileOperatorCode =
  (typeof VENEZUELA_MOBILE_OPERATOR_CODES)[number];

export const DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE: VenezuelaMobileOperatorCode =
  '414';

/** Número de suscriptor (7 dígitos). */
export const VENEZUELA_SUBSCRIBER_NUMBER_LENGTH = 7;

/** Formato nacional: 0 + operadora (3) + suscriptor (7) = 11 dígitos. */
export const VENEZUELA_NATIONAL_PHONE_LENGTH = 11;

const OPERATOR_CODE_SET = new Set<string>(VENEZUELA_MOBILE_OPERATOR_CODES);

export function isVenezuelaMobileOperatorCode(
  code: string,
): code is VenezuelaMobileOperatorCode {
  return OPERATOR_CODE_SET.has(code);
}

export function parseVenezuelaPhone(raw: string): {
  operatorCode: VenezuelaMobileOperatorCode;
  subscriberNumber: string;
} {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('58')) {
    const operatorCode = digits.slice(2, 5);
    const subscriberNumber = digits.slice(5);
    return resolvePhoneParts(operatorCode, subscriberNumber);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    const operatorCode = digits.slice(1, 4);
    const subscriberNumber = digits.slice(4);
    return resolvePhoneParts(operatorCode, subscriberNumber);
  }

  if (digits.length === 10) {
    const operatorCode = digits.slice(0, 3);
    const subscriberNumber = digits.slice(3);
    return resolvePhoneParts(operatorCode, subscriberNumber);
  }

  if (digits.length <= VENEZUELA_SUBSCRIBER_NUMBER_LENGTH) {
    return {
      operatorCode: DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
      subscriberNumber: digits,
    };
  }

  return {
    operatorCode: DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE,
    subscriberNumber: digits.slice(-VENEZUELA_SUBSCRIBER_NUMBER_LENGTH),
  };
}

function resolvePhoneParts(
  operatorCode: string,
  subscriberNumber: string,
): {
  operatorCode: VenezuelaMobileOperatorCode;
  subscriberNumber: string;
} {
  const subscriber = subscriberNumber.replace(/\D/g, '').slice(0, VENEZUELA_SUBSCRIBER_NUMBER_LENGTH);
  const code = isVenezuelaMobileOperatorCode(operatorCode)
    ? operatorCode
    : DEFAULT_VENEZUELA_MOBILE_OPERATOR_CODE;
  return { operatorCode: code, subscriberNumber: subscriber };
}

export function composeVenezuelaPhone(
  operatorCode: VenezuelaMobileOperatorCode,
  subscriberNumber: string,
): string {
  const subscriber = subscriberNumber
    .replace(/\D/g, '')
    .slice(0, VENEZUELA_SUBSCRIBER_NUMBER_LENGTH);
  return `0${operatorCode}${subscriber}`;
}

export function normalizeVenezuelaPhone(raw: string): string {
  const { operatorCode, subscriberNumber } = parseVenezuelaPhone(raw);
  return composeVenezuelaPhone(operatorCode, subscriberNumber);
}

export function isValidSubscriberNumber(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  return digits.length === VENEZUELA_SUBSCRIBER_NUMBER_LENGTH;
}

export function isValidVenezuelaPhoneParts(
  operatorCode: string,
  subscriberNumber: string,
): boolean {
  return (
    isVenezuelaMobileOperatorCode(operatorCode) &&
    isValidSubscriberNumber(subscriberNumber)
  );
}

export function isValidVenezuelaPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === VENEZUELA_NATIONAL_PHONE_LENGTH && digits.startsWith('0')) {
    const operatorCode = digits.slice(1, 4);
    const subscriberNumber = digits.slice(4);
    return isValidVenezuelaPhoneParts(operatorCode, subscriberNumber);
  }
  if (digits.length === 10) {
    return isValidVenezuelaPhoneParts(digits.slice(0, 3), digits.slice(3));
  }
  if (digits.length === 12 && digits.startsWith('58')) {
    return isValidVenezuelaPhoneParts(digits.slice(2, 5), digits.slice(5));
  }
  return false;
}
