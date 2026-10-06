import AsyncStorage from '@react-native-async-storage/async-storage';

import { findLocalCustomer } from '@shared/persistence';

import { mapSyncRowToLocalCustomer, syncKioskCustomers } from '../syncKioskCustomers';

const mockSyncCustomers = jest.fn();

jest.mock('@shared/api/kiosk', () => ({
  withKioskAuth: (run: (client: unknown) => unknown) =>
    run({ syncCustomers: (...args: unknown[]) => mockSyncCustomers(...args) }),
}));

jest.mock('@shared/config/api', () => ({
  ...jest.requireActual('@shared/config/api'),
  shouldUseMockApi: () => false,
}));

const row = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  typeIdentification: 'V',
  identificationNumber: String(26396690 + id),
  name: 'Keiver Pacheco',
  billingName: null,
  phoneNumber: '04141848823',
  email: 'KP@MAIL.COM',
  updatedAt: `2026-09-24T1${id}:00:00.000Z`,
  ...overrides,
});

describe('syncKioskCustomers', () => {
  beforeEach(async () => {
    mockSyncCustomers.mockReset();
    await AsyncStorage.clear();
  });

  it('mapea al caché local con el id del backend; sin documento se descarta', () => {
    expect(mapSyncRowToLocalCustomer(row(7))).toEqual({
      documentId: 'V26396697',
      firstName: expect.any(String),
      lastName: expect.any(String),
      phone: '04141848823',
      email: 'kp@mail.com',
      backendId: 7,
    });
    expect(mapSyncRowToLocalCustomer(row(8, { identificationNumber: null }))).toBeNull();
  });

  it('pagina con el cursor, guarda los clientes y retoma desde el último cursor', async () => {
    mockSyncCustomers
      .mockResolvedValueOnce({ data: [row(1)], nextCursor: '2026-09-24T11:00:00.000Z|1' })
      .mockResolvedValueOnce({ data: [row(2)], nextCursor: null });

    await expect(syncKioskCustomers()).resolves.toBe(2);

    expect(mockSyncCustomers.mock.calls.map((c) => c[0])).toEqual([null, '2026-09-24T11:00:00.000Z|1']);
    expect(await findLocalCustomer('V26396692')).toMatchObject({ backendId: 2, phone: '04141848823' });

    mockSyncCustomers.mockResolvedValueOnce({ data: [], nextCursor: null });
    await syncKioskCustomers();
    expect(mockSyncCustomers).toHaveBeenLastCalledWith('2026-09-24T12:00:00.000Z|2');
  });

  it('un error de red no rompe nada (devuelve 0)', async () => {
    mockSyncCustomers.mockRejectedValueOnce(new Error('network'));
    await expect(syncKioskCustomers()).resolves.toBe(0);
  });
});
