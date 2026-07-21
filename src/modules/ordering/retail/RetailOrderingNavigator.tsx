import { ScanCartScreen } from './ScanCartScreen';

export type RetailOrderingNavigatorProps = {
  onExit?: () => void;
  onProceedToPayment: () => void;
};

/** Retail path: scan + cart only (no menu / modifiers). */
export function RetailOrderingNavigator({
  onExit,
  onProceedToPayment,
}: RetailOrderingNavigatorProps) {
  return (
    <ScanCartScreen
      onBack={onExit ?? (() => {})}
      onProceedToPayment={onProceedToPayment}
    />
  );
}
