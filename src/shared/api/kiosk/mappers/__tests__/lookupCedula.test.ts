import {
  documentIdToLookupQuery,
  formatCnePersonName,
  isCneLookupResponse,
  isOrgCustomerLookupResponse,
  mapCneToRegisterPrefill,
  mapOrgCustomerToKioskCustomer,
  mapOrgCustomerToRegisterPrefill,
} from '../lookupCedula';

describe('lookupCedula mappers', () => {
  it('documentIdToLookupQuery splits type and number', () => {
    expect(documentIdToLookupQuery('V26396697')).toEqual({
      nacionalidad: 'V',
      cedula: '26396697',
    });
  });

  it('formatCnePersonName title-cases CNE uppercase', () => {
    expect(formatCnePersonName('ALEXANDER', 'JOSE')).toBe('Alexander Jose');
    expect(formatCnePersonName('ROMERO', 'SALAZAR')).toBe('Romero Salazar');
  });

  it('isOrgCustomerLookupResponse detects org payload', () => {
    expect(isOrgCustomerLookupResponse({ id: 1, name: 'A' })).toBe(true);
    expect(isOrgCustomerLookupResponse({ primer_nombre: 'A' })).toBe(false);
  });

  it('isCneLookupResponse detects CNE payload', () => {
    expect(
      isCneLookupResponse({
        primer_nombre: 'A',
        primer_apellido: 'B',
        nacionalidad: 'V',
        cedula: 1,
      }),
    ).toBe(true);
    expect(isCneLookupResponse({ id: 1 })).toBe(false);
    expect(
      isCneLookupResponse({
        id: null,
        primer_nombre: 'A',
        primer_apellido: 'B',
        nacionalidad: 'V',
        cedula: 1,
      }),
    ).toBe(true);
  });

  it('mapCneToRegisterPrefill maps names', () => {
    expect(
      mapCneToRegisterPrefill({
        nacionalidad: 'V',
        cedula: 26396697,
        primer_nombre: 'JUAN',
        segundo_nombre: 'CARLOS',
        primer_apellido: 'PEREZ',
        segundo_apellido: 'LOPEZ',
      }),
    ).toEqual({
      firstName: 'Juan Carlos',
      lastName: 'Perez Lopez',
    });
  });

  it('mapOrgCustomerToKioskCustomer maps org customer', () => {
    const customer = mapOrgCustomerToKioskCustomer({
      id: 42,
      name: 'Victor Daniel',
      billingName: 'Tafuri Vidal',
      typeIdentification: 'V',
      identificationNumber: '25504486',
      email: 'v@example.com',
      phoneNumber: '04141234567',
    });
    expect(customer).toMatchObject({
      id: 42,
      documentId: 'V25504486',
      firstName: 'Victor Daniel',
      lastName: 'Tafuri Vidal',
      email: 'v@example.com',
      phone: '04141234567',
    });
  });

  it('mapOrgCustomerToKioskCustomer splits full name when name includes apellidos', () => {
    const customer = mapOrgCustomerToKioskCustomer({
      id: 43,
      name: 'Victor Daniel Tafuri Vidal',
      billingName: 'Tafuri Vidal',
      typeIdentification: 'V',
      identificationNumber: '25504486',
    });
    expect(customer.firstName).toBe('Victor Daniel');
    expect(customer.lastName).toBe('Tafuri Vidal');
  });

  it('mapOrgCustomerToKioskCustomer uses company name only for juridico documents', () => {
    const customer = mapOrgCustomerToKioskCustomer({
      id: 44,
      name: 'Acme C.A.',
      billingName: 'Legacy Billing',
      typeIdentification: 'J',
      identificationNumber: '123456784',
    });
    expect(customer).toMatchObject({
      documentId: 'J123456784',
      firstName: 'Acme C.A.',
      lastName: '',
    });
  });

  it('mapOrgCustomerToRegisterPrefill clears last name for juridico documents', () => {
    expect(
      mapOrgCustomerToRegisterPrefill({
        id: 44,
        name: 'Acme C.A.',
        billingName: 'Legacy Billing',
        typeIdentification: 'J',
        identificationNumber: '123456784',
        phoneNumber: '04141234567',
      }),
    ).toEqual({
      firstName: 'Acme C.A.',
      lastName: '',
      phone: '04141234567',
    });
  });
});
