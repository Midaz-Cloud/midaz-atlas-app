const mockLookupCedula = jest.fn();

jest.mock('@shared/config/api', () => ({
  getKioskApiKey: () => 'test-key',
  getKioskApiUrl: (path: string) => `http://gw${path}`,
}));
jest.mock('@shared/device', () => ({
  getKioskDeviceProfile: jest.fn(async () => ({ serialNumber: 'AF910S1' })),
}));
jest.mock('../../withKioskAuth', () => ({
  withKioskAuth: (run: (client: { lookupCedula: typeof mockLookupCedula }) => Promise<unknown>) =>
    run({ lookupCedula: mockLookupCedula }),
}));

import { KioskApiError, KioskNetworkError } from '../../errors';
import { __resetCustomerLookupForTests, lookupCustomerByCedulaLive } from '../customerLookup';

const orgCustomer = {
  id: 77,
  typeIdentification: 'V',
  identificationNumber: '12345678',
  name: 'Ana Pérez',
  billingName: 'Ana Pérez',
  phoneNumber: '04141234567',
  email: 'ana@example.com',
};

describe('lookupCustomerByCedulaLive (ruta autenticada con respaldo público)', () => {
  beforeEach(() => {
    __resetCustomerLookupForTests();
    mockLookupCedula.mockReset();
    global.fetch = jest.fn();
  });

  it('usa el token del kiosko y no manda la API key por la URL', async () => {
    mockLookupCedula.mockResolvedValue(orgCustomer);

    const result = await lookupCustomerByCedulaLive('V12345678');

    expect(result).toMatchObject({ status: 'found', source: 'org', customer: { id: 77 } });
    expect(mockLookupCedula).toHaveBeenCalledWith('V', '12345678');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404 de cédula inexistente por la ruta autenticada = not_found (sin caer a la pública)', async () => {
    mockLookupCedula.mockRejectedValue(new KioskApiError('Cédula no encontrada', 404));

    const result = await lookupCustomerByCedulaLive('V99999999');

    expect(result).toEqual({ status: 'not_found', documentId: 'V99999999' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('gateway sin la ruta (404 "Cannot GET") → respaldo por la ruta pública con apiKey + serial', async () => {
    mockLookupCedula.mockRejectedValue(
      new KioskApiError('Cannot GET /kiosk/customers/lookup-cedula (/kiosk/customers/lookup-cedula)', 404),
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => orgCustomer,
    });

    const result = await lookupCustomerByCedulaLive('V12345678');

    expect(result).toMatchObject({ status: 'found', customer: { id: 77 } });
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/customers/lookup-cedula?');
    expect(url).toContain('apiKey=test-key');
    expect(url).toContain('serialNumber=AF910S1');
  });

  it('sin red en la ruta autenticada → error de red (customerService cae al caché local)', async () => {
    mockLookupCedula.mockRejectedValue(new KioskNetworkError('timeout', '/kiosk/customers/lookup-cedula'));

    const result = await lookupCustomerByCedulaLive('V12345678');

    expect(result).toMatchObject({ status: 'error', networkError: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
