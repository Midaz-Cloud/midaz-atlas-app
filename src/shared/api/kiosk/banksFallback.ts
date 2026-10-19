import type { KioskBank } from './types';

/**
 * Catálogo de respaldo: el mismo que siembra el backend (organization-service `banks.service.ts`).
 * Se usa solo si `/kiosk/banks` falla o llega vacío y no hay una lista guardada, para que el
 * validador de pago móvil nunca quede sin bancos que elegir.
 */
export const FALLBACK_BANKS: KioskBank[] = [
  { code: '0156', name: '100% Banco' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0166', name: 'Banco Agrícola de Venezuela' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0146', name: 'Banco de la Gente Emprendedora (Bangente)' },
  { code: '0177', name: 'Banco de la Fuerza Armada Nacional Bolivariana' },
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0149', name: 'Banco del Pueblo Soberano' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0175', name: 'Banco Digital de los Trabajadores (BDT)' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0173', name: 'Banco Internacional de Desarrollo' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0191', name: 'Banco Nacional de Crédito' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0108', name: 'Banco Provincial' },
  { code: '0137', name: 'Banco Sofitasa' },
  { code: '0134', name: 'Banesco' },
  { code: '0174', name: 'Banplus' },
  { code: '0151', name: 'BFC Banco Fondo Común' },
  { code: '0157', name: 'DelSur Banco' },
  { code: '0100', name: 'Disglobal' },
  { code: '0169', name: 'R4 Banco Microfinanciero' },
  { code: '0104', name: 'Venezolano de Crédito' },
];
