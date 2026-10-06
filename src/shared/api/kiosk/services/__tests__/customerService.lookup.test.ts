const mockLookupLive = jest.fn();
const mockFindLocal = jest.fn();
const mockUpsertLocal = jest.fn();

jest.mock('@shared/config', () => ({ shouldUseMockApi: () => false }));
jest.mock('@shared/connectivity', () => ({ isKioskOffline: () => false }));
jest.mock('@shared/persistence', () => ({
  findLocalCustomer: (...args: unknown[]) => mockFindLocal(...args),
  upsertLocalCustomer: (...args: unknown[]) => mockUpsertLocal(...args),
}));
jest.mock('../../http/customerLookup', () => ({
  lookupCustomerByCedulaLive: (...args: unknown[]) => mockLookupLive(...args),
}));
jest.mock('../../http/customerCreate', () => ({ createCustomerLive: jest.fn() }));
jest.mock('../../http/customerUpdate', () => ({ updateCustomerLive: jest.fn() }));

import { CUSTOMER_LOOKUP_DEADLINE_MS, lookupCustomerByDocument } from '../customerService';

const localRow = {
  documentId: 'V12345678',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '04141234567',
  email: 'ana@example.com',
  backendId: 77,
};

describe('lookupCustomerByDocument (flujo de cédula ≤ 10 s)', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockLookupLive.mockReset();
    mockFindLocal.mockReset().mockResolvedValue(null);
    mockUpsertLocal.mockReset().mockResolvedValue(undefined);
  });

  it('cliente ya conocido por el kiosko: responde al instante sin esperar al backend', async () => {
    mockFindLocal.mockResolvedValue(localRow);
    mockLookupLive.mockReturnValue(new Promise(() => undefined)); // backend colgado

    const result = await lookupCustomerByDocument('V-12345678');

    expect(result).toMatchObject({ status: 'found', customer: { id: 77, firstName: 'Ana' } });
    expect(mockLookupLive).toHaveBeenCalledTimes(1); // refresco en segundo plano
  });

  it('registrado sin red (sin backendId) no cuenta como conocido: consulta en vivo', async () => {
    mockFindLocal.mockResolvedValue({ ...localRow, backendId: null });
    mockLookupLive.mockResolvedValue({ status: 'not_found', documentId: 'V12345678' });

    const result = await lookupCustomerByDocument('V12345678');

    expect(result).toEqual({ status: 'not_found', documentId: 'V12345678' });
  });

  it('backend colgado: al vencer el tope sale a registro, nunca espera más', async () => {
    jest.useFakeTimers();
    mockLookupLive.mockReturnValue(new Promise(() => undefined));

    const pending = lookupCustomerByDocument('V87654321');
    await jest.advanceTimersByTimeAsync(CUSTOMER_LOOKUP_DEADLINE_MS);
    const result = await pending;

    expect(CUSTOMER_LOOKUP_DEADLINE_MS).toBeLessThanOrEqual(9_000);
    expect(result).toMatchObject({ status: 'not_found', documentId: 'V87654321', offline: true });
  });

  it('CNE devuelve datos: va a registro con los datos precargados', async () => {
    mockLookupLive.mockResolvedValue({
      status: 'register',
      documentId: 'V20123456',
      prefill: { firstName: 'Luis', lastName: 'Gómez' },
      source: 'cne',
    });

    const result = await lookupCustomerByDocument('V20123456');

    expect(result).toMatchObject({ status: 'register', lookupSource: 'cne', prefill: { firstName: 'Luis' } });
  });
});
