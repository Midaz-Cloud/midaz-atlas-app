import { formatAssociatedDocumentDisplay } from '../formatAssociatedDocument';

describe('formatAssociatedDocumentDisplay', () => {
  it('formats V cédula like Figma sample', () => {
    expect(formatAssociatedDocumentDisplay('V19301293')).toBe('V 19.301.293');
  });

  it('formats prefixed document id', () => {
    expect(formatAssociatedDocumentDisplay('V-19301293')).toBe('V 19.301.293');
  });
});
