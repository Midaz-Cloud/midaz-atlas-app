import { buildCreateCustomerRequestFromForm } from '../createCustomer';

describe('buildCreateCustomerRequestFromForm', () => {
  it('maps form fields to POST /kiosk/customers body with defaults', () => {
    expect(
      buildCreateCustomerRequestFromForm({
        documentId: 'V26728807',
        firstName: 'Alexander',
        lastName: 'Romero',
        phone: '04141234567',
        email: 'alex@example.com',
      }),
    ).toMatchObject({
      typeIdentification: 'V',
      identificationNumber: '26728807',
      name: 'Alexander Romero',
      billingName: 'Romero',
      email: 'alex@example.com',
      phoneNumber: '04141234567',
      billingAddressLine1: 'direccion por default',
      notes: 'Cliente creado desde kiosco',
    });
  });

  it('uses full name in name when form has nombres y apellidos from CNE prefill', () => {
    expect(
      buildCreateCustomerRequestFromForm({
        documentId: 'V26728807',
        firstName: 'Alexander Jose',
        lastName: 'Romero Salazar',
        phone: '04141234567',
        email: 'alex@example.com',
      }),
    ).toMatchObject({
      name: 'Alexander Jose Romero Salazar',
      billingName: 'Romero Salazar',
    });
  });

  it('maps juridico document to name only with empty billingName', () => {
    expect(
      buildCreateCustomerRequestFromForm({
        documentId: 'J123456784',
        firstName: 'Acme C.A.',
        lastName: '',
        phone: '04141234567',
      }),
    ).toMatchObject({
      typeIdentification: 'J',
      identificationNumber: '123456784',
      name: 'Acme C.A.',
      billingName: '',
      phoneNumber: '04141234567',
    });
    expect(
      buildCreateCustomerRequestFromForm({
        documentId: 'J123456784',
        firstName: 'Acme C.A.',
        lastName: '',
        phone: '04141234567',
      }).email,
    ).toBeUndefined();
  });
});
