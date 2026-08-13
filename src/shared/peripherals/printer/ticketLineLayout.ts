import i18n from '@shared/i18n/i18n';

/** Thermal ticket printable width (chars), including right-aligned suffix. */
export const TICKET_LINE_WIDTH = 31;

/**
 * Max length of `Nx {productName}` before wrapping onto a second ticket line.
 * Kept below {@link TICKET_LINE_WIDTH} so line 1 never collides with the price column.
 */
export const PRODUCT_TICKET_LEFT_MAX = 30;

export function formatTicketUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTicketVes(amount: number): string {
  const [integerPart, decimalPart] = amount.toFixed(2).split('.');
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `Bs. ${withThousands}.${decimalPart}`;
}

function translateOrdering(key: string): string {
  return i18n.t(key, { ns: 'ordering' });
}

/** Right column for modifier rows: price or localized "free". */
export function formatModifierPriceSuffix(priceDelta: number): string {
  if (priceDelta > 0) {
    return formatTicketUsd(priceDelta);
  }
  return translateOrdering('modifiers.free');
}

export function padTicketLine(
  left: string,
  right: string,
  width: number = TICKET_LINE_WIDTH,
): string {
  if (!right) {
    return left.slice(0, width);
  }
  const maxLeft = width - right.length - 1;
  const clippedLeft = left.length > maxLeft ? left.slice(0, Math.max(0, maxLeft)) : left;
  const gap = Math.max(1, width - clippedLeft.length - right.length);
  return `${clippedLeft}${' '.repeat(gap)}${right}`;
}

/**
 * Product row: `Nx name` + right-aligned amount.
 * If the left label exceeds {@link PRODUCT_TICKET_LEFT_MAX}, wraps to two lines and
 * keeps the amount only on the last line (same pattern as modifiers).
 */
export function layoutProductTicketLines(
  quantity: number,
  name: string,
  amountLabel: string,
  width: number = TICKET_LINE_WIDTH,
): string[] {
  const left = `${quantity}x ${name}`;

  if (left.length <= PRODUCT_TICKET_LEFT_MAX) {
    return [padTicketLine(left, amountLabel, width)];
  }

  const first = left.slice(0, PRODUCT_TICKET_LEFT_MAX);
  const rest = left.slice(PRODUCT_TICKET_LEFT_MAX).trimStart();
  return [first, padTicketLine(rest.length > 0 ? rest : ' ', amountLabel, width)];
}

/**
 * Modifier description left, price/free right-aligned. Wraps to multiple lines;
 * suffix is always on the last line, aligned to the right.
 */
export function layoutModifierTicketLines(
  description: string,
  priceDelta: number,
): string[] {
  const suffix = formatModifierPriceSuffix(priceDelta);
  const maxLeftWithSuffix = TICKET_LINE_WIDTH - suffix.length - 1;

  if (description.length <= maxLeftWithSuffix) {
    return [padTicketLine(description, suffix)];
  }

  const result: string[] = [];
  let remainder = description;

  while (remainder.length > maxLeftWithSuffix) {
    result.push(remainder.slice(0, TICKET_LINE_WIDTH));
    remainder = remainder.slice(TICKET_LINE_WIDTH);
  }

  result.push(padTicketLine(remainder, suffix));
  return result;
}
