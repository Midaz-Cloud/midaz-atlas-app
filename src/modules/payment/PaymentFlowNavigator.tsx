import { useCallback, useState } from 'react';

import { CustomerNavigator } from '@modules/customer/CustomerNavigator';
import { LocatorEntryScreen } from '@modules/locator/LocatorEntryScreen';
import { isValidLocatorCode, LOCATOR_CODE_LENGTH } from '@modules/locator/types';
import { useKioskCustomer } from '@shared/customer';
import { useKioskSession } from '@shared/session';

import { PaymentNavigator } from './PaymentNavigator';
import { shouldShowLocatorStep } from './shouldShowLocatorStep';

export type PaymentFlowNavigatorProps = {
  onBackToCart: () => void;
  onSessionComplete: () => void;
};

export function PaymentFlowNavigator({
  onBackToCart,
  onSessionComplete,
}: PaymentFlowNavigatorProps) {
  const { customer } = useKioskCustomer();
  const { runtimeConfig, setTableNumber } = useKioskSession();
  const tableFieldEnabled = runtimeConfig?.tableFieldEnabled ?? false;
  const [customerStepComplete, setCustomerStepComplete] = useState(customer != null);
  const [locatorStepComplete, setLocatorStepComplete] = useState(false);
  const [locatorCode, setLocatorCode] = useState('');

  const handleCustomerReady = useCallback(() => {
    setLocatorCode('');
    setTableNumber(undefined);
    setLocatorStepComplete(false);
    setCustomerStepComplete(true);
  }, [setTableNumber]);

  const handleLocatorValidate = useCallback(() => {
    if (!isValidLocatorCode(locatorCode)) {
      return;
    }
    setTableNumber(locatorCode);
    setLocatorStepComplete(true);
  }, [locatorCode, setTableNumber]);

  const handleLocatorBack = useCallback(() => {
    setLocatorCode('');
    setTableNumber(undefined);
    setLocatorStepComplete(false);
    setCustomerStepComplete(false);
  }, [setTableNumber]);

  if (!customerStepComplete) {
    return (
      <CustomerNavigator
        onBackToCart={onBackToCart}
        onCustomerReady={handleCustomerReady}
      />
    );
  }

  if (shouldShowLocatorStep(tableFieldEnabled, locatorStepComplete)) {
    return (
      <LocatorEntryScreen
        locatorCode={locatorCode}
        onBack={handleLocatorBack}
        onLocatorCodeChange={setLocatorCode}
        onValidate={handleLocatorValidate}
      />
    );
  }

  return (
    <PaymentNavigator
      onBackToCart={onBackToCart}
      onSessionComplete={onSessionComplete}
    />
  );
}

export { LOCATOR_CODE_LENGTH, isValidLocatorCode };
