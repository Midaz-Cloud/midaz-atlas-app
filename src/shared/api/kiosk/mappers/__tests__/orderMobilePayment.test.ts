import { mapCartToCreateOrderRequest } from '../order';
import type { MobilePaymentPayload } from '@shared/kiosk-order/types';

const mobilePayment: MobilePaymentPayload = {
  bankCode: '0102',
  bankName: 'Banco de Venezuela',
  reference: '201135',
  cedula: 'V25504486',
  phone: '04242421042',
  disglobalRef: '000781186926',
};

describe('mapCartToCreateOrderRequest mobile payment', () => {
  it('includes pago_movil fields when payload is set', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'mobile',
      mobilePayment,
    });
    expect(request.paymentMethod).toBe('pago_movil');
    expect(request.bankCode).toBe('0102');
    expect(request.reference).toBe('201135');
    expect(request.cedula).toBe('V25504486');
    expect(request.phone).toBe('04242421042');
  });

  it('omits mobile fields for debito', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'pos',
      mobilePayment,
    });
    expect(request.paymentMethod).toBe('debito');
    expect(request.bankCode).toBeUndefined();
  });
});
