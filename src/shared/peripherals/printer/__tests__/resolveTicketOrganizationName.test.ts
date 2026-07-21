import { resolveTicketOrganizationName } from '../resolveTicketOrganizationName';

describe('resolveTicketOrganizationName', () => {
  it('prefers commercial name over legal name', () => {
    expect(
      resolveTicketOrganizationName('Cochi Crunch', 'Cochi Crunch C.A.'),
    ).toBe('Cochi Crunch');
  });

  it('falls back to legal name', () => {
    expect(resolveTicketOrganizationName('', 'Cochi Crunch C.A.')).toBe(
      'Cochi Crunch C.A.',
    );
  });

  it('returns empty when both missing', () => {
    expect(resolveTicketOrganizationName()).toBe('');
  });
});
