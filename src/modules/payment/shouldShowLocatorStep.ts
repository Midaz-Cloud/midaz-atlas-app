/** UPDATE-8 · localizador/mesa solo si `tableFieldEnabled` en config. */
export function shouldShowLocatorStep(
  tableFieldEnabled: boolean,
  locatorStepComplete: boolean,
): boolean {
  return tableFieldEnabled && !locatorStepComplete;
}
