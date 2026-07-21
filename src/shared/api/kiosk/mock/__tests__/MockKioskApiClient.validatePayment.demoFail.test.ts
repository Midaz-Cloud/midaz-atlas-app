jest.mock('@shared/config', () => ({
  getDemoReferenceCode: () => '123456',
  getDemoReferenceVerifyDelayMs: () => 0,
  getDemoScenario: () => 'payment_fail',
  isKioskDemoMode: true,
}));

import { MockKioskApiClient } from '../MockKioskApiClient';

describe('MockKioskApiClient.validateMobilePayment demo payment_fail', () => {
  it('rejects when demo scenario is payment_fail', async () => {
    const client = new MockKioskApiClient();
    await expect(
      client.validateMobilePayment({
        bankCode: '0134',
        reference: '123456',
        cedula: 'V25504486',
        phone: '04242421042',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
