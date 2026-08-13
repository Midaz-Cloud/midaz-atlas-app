import {
  formatModifierPriceSuffix,
  layoutModifierTicketLines,
  layoutProductTicketLines,
  padTicketLine,
  PRODUCT_TICKET_LEFT_MAX,
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

  describe('layoutProductTicketLines', () => {
    it('keeps short names on one line with right-aligned price', () => {
      const lines = layoutProductTicketLines(2, 'Cafe', '$12.00');
      expect(lines).toHaveLength(1);
      expect(lines[0].length).toBe(TICKET_LINE_WIDTH);
      expect(lines[0].startsWith('2x Cafe')).toBe(true);
      expect(lines[0].endsWith('$12.00')).toBe(true);
    });

    it('wraps long names to two lines and keeps price on the last line', () => {
      const longName = 'A'.repeat(PRODUCT_TICKET_LEFT_MAX); // "1x " + name > 30
      const lines = layoutProductTicketLines(1, longName, 'Bs. 10.00');

      expect(lines).toHaveLength(2);
      expect(lines[0].length).toBe(PRODUCT_TICKET_LEFT_MAX);
      expect(lines[0].startsWith('1x ')).toBe(true);
      expect(lines[0].includes('Bs.')).toBe(false);
      expect(lines[1].length).toBe(TICKET_LINE_WIDTH);
      expect(lines[1].endsWith('Bs. 10.00')).toBe(true);
    });

    it('does not exceed ticket width on either wrapped line', () => {
      const lines = layoutProductTicketLines(
        3,
        'Hamburguesa doble con queso cheddar y tocino ahumado premium',
        'Bs. 1,250.00',
      );
      expect(lines.length).toBe(2);
      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(TICKET_LINE_WIDTH);
      });
    });
  });
});
