import {
  formatModifierPriceSuffix,
  layoutModifierTicketLines,
  padTicketLine,
  TICKET_LINE_WIDTH,
} from '../ticketLineLayout';

describe('ticketLineLayout', () => {
  it('pads left and right within ticket width', () => {
    const line = padTicketLine('+ Queso [Agregados]', 'Gratis');
    expect(line.length).toBe(TICKET_LINE_WIDTH);
    expect(line.endsWith('Gratis')).toBe(true);
    expect(line.startsWith('+ Queso [Agregados]')).toBe(true);
  });

  it('shows USD amount when priceDelta is positive', () => {
    expect(formatModifierPriceSuffix(0.5)).toBe('$0.50');
  });

  it('wraps long descriptions and keeps suffix on the last line', () => {
    const description =
      '+ Extra premium double chocolate chip [Agregados especiales]';
    const lines = layoutModifierTicketLines(description, 1.25);

    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(TICKET_LINE_WIDTH));
    expect(lines[lines.length - 1].endsWith('$1.25')).toBe(true);
    expect(lines[0].length).toBe(TICKET_LINE_WIDTH);
  });

  it('puts free label on its own line when continuation is too long', () => {
    const description = 'X'.repeat(50);
    const lines = layoutModifierTicketLines(`+ ${description}`, 0);

    expect(lines[lines.length - 1].trim()).toMatch(/Gratis|Free$/);
  });
});
