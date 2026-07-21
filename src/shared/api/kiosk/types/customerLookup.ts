/** Cliente existente en la organización (response con `id`). */
export type CedulaLookupOrgCustomerApi = {
  id: number;
  organizationId?: string;
  name: string;
  billingName: string;
  typeIdentification: string;
  identificationNumber: string;
  email?: string;
  phoneNumber?: string;
  billingAddressLine1?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  contactPerson?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Datos CNE/SAIME para pre-fill (response sin `id`). */
export type CedulaLookupCneApi = {
  nacionalidad: string;
  cedula: number;
  fecha_nac?: string;
  rif?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  primer_nombre: string;
  segundo_nombre?: string;
  request_date?: string;
};

export type CustomerRegisterPrefill = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
};
