import { MockKioskApiClient } from '../MockKioskApiClient';
import { resetMockCustomersForTests } from '../mockCustomers';

describe('MockKioskApiClient customers', () => {
  beforeEach(() => {
    resetMockCustomersForTests();
  });

  const client = new MockKioskApiClient();

  it('finds seed customer by document', async () => {
    const customer = await client.findCustomerByDocument('v-12345678');
    expect(customer.documentId).toBe('V12345678');
    expect(customer.firstName).toBe('María');
  });

  it('returns 404 for unknown document', async () => {
    await expect(client.findCustomerByDocument('99999999')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('registers new customer', async () => {
    const created = await client.registerCustomer({
      documentId: 'V11111111',
      firstName: 'Ana',
      lastName: 'López',
      phone: '04140001111',
      email: 'ana.lopez@correo.com',
    });
    expect(created.id).toBeGreaterThan(1);
    const found = await client.findCustomerByDocument('V11111111');
    expect(found.firstName).toBe('Ana');
  });
});
