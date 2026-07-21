/** Body de `POST /customers` según guía kiosco. */
export type CreateCustomerRequestApi = {
  typeIdentification: string;
  identificationNumber: string;
  name: string;
  billingName: string;
  email?: string;
  phoneNumber?: string;
  billingAddressLine1: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  contactPerson?: string;
  notes?: string;
  customerCode?: string;
};
