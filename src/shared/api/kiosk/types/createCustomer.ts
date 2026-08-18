/** Body de `POST /kiosk/customers` (mismo contrato que POST /customers). */
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

/** Body de `PATCH /kiosk/customers/:id` (UpdateCustomerDto). No enviar email vacío. */
export type UpdateCustomerRequestApi = {
  name?: string;
  billingName?: string;
  email?: string;
  phoneNumber?: string;
};
