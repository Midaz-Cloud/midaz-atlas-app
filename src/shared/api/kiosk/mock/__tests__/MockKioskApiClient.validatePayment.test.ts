jest.mock('@shared/config', () => ({
  getDemoReferenceCode: () => '123456',
  getDemoReferenceVerifyDelayMs: () => 0,
  getDemoScenario: () => 'default',
  isKioskDemoMode: false,
}));

import { MockKioskApiClient } from '../MockKioskApiClient';

describe('MockKioskApiClient.validateMobilePayment', () => {
  const client = new MockKioskApiClient();

  it('accepts demo reference code', async () => {
    const result = await client.validateMobilePayment({
      bankCode: '0134',
      reference: '123456',
      cedula: 'V25504486',
      phone: '04242421042',
    });
    expect(result.status).toBe('00');
    expect(result.success).toBe(true);
  });

  it('rejects unknown reference', async () => {
    await expect(
      client.validateMobilePayment({
        bankCode: '0134',
        reference: '000000',
        cedula: 'V25504486',
        phone: '04242421042',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
