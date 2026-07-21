import { homeImageStatusLabel } from '../homeImageLoad';

describe('homeImageLoad', () => {
  it('labels error state in Spanish', () => {
    expect(homeImageStatusLabel('error')).toBe('Error al cargar');
    expect(homeImageStatusLabel('missing')).toBe('Sin imagen en config');
  });
});
