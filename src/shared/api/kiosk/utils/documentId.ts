export type CustomerDocumentType = 'V' | 'J' | 'E';

export const CUSTOMER_DOCUMENT_TYPES: CustomerDocumentType[] = ['V', 'J', 'E'];

export const DEFAULT_CUSTOMER_DOCUMENT_TYPE: CustomerDocumentType = 'V';

/** Longitudes del número (solo dígitos, sin prefijo V/J/E). */
export const DOCUMENT_NUMBER_LENGTH: Record<
  CustomerDocumentType,
  { min: number; max: number }
> = {
  /** Cédula venezolana: V + 7 u 8 dígitos (ej. V-12.345.678). */
  V: { min: 7, max: 8 },
  /** Extranjero residente: E + 7 a 9 dígitos (ej. E-81.234.567). */
  E: { min: 7, max: 9 },
  /** RIF jurídico: J + 8 dígitos + dígito verificador (ej. J-12345678-9). */
  J: { min: 9, max: 9 },
};

/** Máximo global (RIF jurídico con dígito verificador). */
export const CUSTOMER_DOCUMENT_NUMBER_MAX_LENGTH = DOCUMENT_NUMBER_LENGTH.J.max;

/** Longitud máxima del documento completo (prefijo + número). */
export const CUSTOMER_DOCUMENT_MAX_LENGTH = 10;

/** Coeficiente del tipo para el dígito verificador RIF (SENIAT). */
const RIF_TYPE_COEFFICIENT: Record<CustomerDocumentType, number> = {
  V: 1,
  E: 8,
  J: 12,
};

const RIF_DIGIT_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2] as const;

export function parseDocumentId(raw: string): {
  type: CustomerDocumentType;
  number: string;
} {
  const cleaned = raw.trim().toUpperCase();
  const typeMatch = cleaned.match(/^([VJE])/);
  if (typeMatch) {
    const type = typeMatch[1] as CustomerDocumentType;
    const number = cleaned.slice(1).replace(/\D/g, '');
    return { type, number };
  }
  return {
    type: DEFAULT_CUSTOMER_DOCUMENT_TYPE,
    number: cleaned.replace(/\D/g, ''),
  };
}

export function composeDocumentId(
  type: CustomerDocumentType,
  number: string,
): string {
  const digits = number.replace(/\D/g, '');
  return `${type}${digits}`;
}

export function normalizeDocumentId(raw: string): string {
  const { type, number } = parseDocumentId(raw);
  return composeDocumentId(type, number);
}

export function getDocumentNumberMaxLength(type: CustomerDocumentType): number {
  return DOCUMENT_NUMBER_LENGTH[type].max;
}

/**
 * Dígito verificador RIF (SENIAT): coeficiente del tipo + 8 dígitos ponderados, mod 11.
 * @param baseDigits Hasta 8 dígitos del número base (se rellena con ceros a la izquierda).
 */
export function calculateRifCheckDigit(
  type: CustomerDocumentType,
  baseDigits: string,
): number {
  const padded = baseDigits.replace(/\D/g, '').padStart(8, '0').slice(-8);
  let sum = RIF_TYPE_COEFFICIENT[type];
  for (let i = 0; i < 8; i++) {
    sum += Number(padded[i]) * RIF_DIGIT_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const digit = 11 - remainder;
  return digit >= 10 ? 0 : digit;
}

function isValidVenezuelanCedulaNumber(digits: string): boolean {
  return digits.length === 7 || digits.length === 8;
}

function isValidForeignResidentNumber(digits: string): boolean {
  const { min, max } = DOCUMENT_NUMBER_LENGTH.E;
  return digits.length >= min && digits.length <= max;
}

function isValidJuridicoRifNumber(digits: string): boolean {
  if (digits.length !== 9) {
    return false;
  }
  const base = digits.slice(0, 8);
  const checkDigit = Number(digits[8]);
  if (!Number.isFinite(checkDigit)) {
    return false;
  }
  return calculateRifCheckDigit('J', base) === checkDigit;
}

export function isValidDocumentNumberForType(
  type: CustomerDocumentType,
  number: string,
): boolean {
  const digits = number.replace(/\D/g, '');
  const { min, max } = DOCUMENT_NUMBER_LENGTH[type];
  if (digits.length < min || digits.length > max) {
    return false;
  }
  switch (type) {
    case 'V':
      return isValidVenezuelanCedulaNumber(digits);
    case 'E':
      return isValidForeignResidentNumber(digits);
    case 'J':
      return isValidJuridicoRifNumber(digits);
    default:
      return false;
  }
}

/** @deprecated Usar {@link isValidDocumentNumberForType} con el tipo de documento. */
export function isValidDocumentNumber(number: string): boolean {
  return isValidDocumentNumberForType(DEFAULT_CUSTOMER_DOCUMENT_TYPE, number);
}

export function isValidDocumentId(raw: string): boolean {
  const { type, number } = parseDocumentId(raw);
  return (
    CUSTOMER_DOCUMENT_TYPES.includes(type) &&
    isValidDocumentNumberForType(type, number)
  );
}

export type DocumentValidationI18nKey =
  | 'validation.documentV'
  | 'validation.documentE'
  | 'validation.documentJ';

export function getDocumentValidationI18nKey(
  type: CustomerDocumentType,
): DocumentValidationI18nKey {
  switch (type) {
    case 'V':
      return 'validation.documentV';
    case 'E':
      return 'validation.documentE';
    case 'J':
      return 'validation.documentJ';
  }
}
