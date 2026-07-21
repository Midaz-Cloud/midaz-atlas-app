import { MockKioskApiClient } from '../MockKioskApiClient';
import { KioskApiError } from '../../errors';

describe('MockKioskApiClient.createOrder', () => {
  const client = new MockKioskApiClient();

  const baseRequest = {
    items: [],
    fulfillmentType: 'IN_STORE' as const,
    paymentMethod: 'debito' as const,
  };

  it('rejects debito without posResponse', async () => {
    await expect(client.createOrder(baseRequest)).rejects.toBeInstanceOf(KioskApiError);
  });

  it('accepts debito with approved posResponse', async () => {
    const response = await client.createOrder({
      ...baseRequest,
      posResponse: {
        responseCode: '00',
        responseMessage: 'APPROVED',
        referenceNumber: '000008',
        traceNumber: '000027',
        RRN: '614623000027',
        terminalID: '00001001',
        deviceSerial: 'N620W312565',
        merchantID: '0078513748',
        accountType: 1,
        batchNum: '000001',
        amount: '100',
      },
      cardType: 'debito',
      cedula: 'V25504486',
    });
    expect(response.displayOrderNumber).toMatch(/^ORD-DEMO-/);
  });
});
