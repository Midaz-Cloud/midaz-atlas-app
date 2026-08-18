export function customerNeedsEmailUpdate(
  customer: { email?: string | null },
  requireCustomerEmail: boolean,
): boolean {
  return requireCustomerEmail && !(customer.email ?? '').trim();
}

export function mapCustomerToRegisterPrefill(customer: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}): {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
} {
  const prefill: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  } = {
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
  if (customer.phone?.trim()) {
    prefill.phone = customer.phone.trim();
  }
  if (customer.email?.trim()) {
    prefill.email = customer.email.trim().toLowerCase();
  }
  return prefill;
}
