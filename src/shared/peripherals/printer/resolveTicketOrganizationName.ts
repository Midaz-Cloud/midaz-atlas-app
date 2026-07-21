/** Organization name for thermal ticket header (kiosk config). */
export function resolveTicketOrganizationName(
  organizationName?: string,
  organizationLegalName?: string,
): string {
  const name = organizationName?.trim();
  if (name) {
    return name;
  }
  const legalName = organizationLegalName?.trim();
  if (legalName) {
    return legalName;
  }
  return '';
}
