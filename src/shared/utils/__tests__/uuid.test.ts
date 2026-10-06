import { generateUuidV4, isUuidV4 } from '../uuid';

describe('generateUuidV4', () => {
  it('genera uuid v4 válidos y distintos', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateUuidV4()));
    expect(ids.size).toBe(200);
    for (const id of ids) {
      expect(isUuidV4(id)).toBe(true);
    }
  });

  it('isUuidV4 rechaza lo que no es uuid v4', () => {
    expect(isUuidV4('no-es-un-uuid')).toBe(false);
    expect(isUuidV4('3f1c2a4e-9b7d-1c1e-8a2b-6d5e4f3a2b1c')).toBe(false);
    expect(isUuidV4(undefined)).toBe(false);
  });
});
