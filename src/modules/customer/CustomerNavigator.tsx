import { useCallback, useState } from 'react';

import { CustomerLookupScreen } from './customer-lookup/CustomerLookupScreen';
import { CustomerRegisterScreen } from './customer-register/CustomerRegisterScreen';
import type { CustomerRegisterPrefill } from '@shared/api/kiosk';

import type { CustomerLookupStatus } from './customer-register/components/CustomerLookupStatusBanner';

type CustomerRoute =
  | { name: 'lookup'; initialDocumentId?: string }
  | {
      name: 'register';
      documentId: string;
      lookupStatus: CustomerLookupStatus;
      prefill?: CustomerRegisterPrefill;
    };

export type CustomerNavigatorProps = {
  onBackToCart: () => void;
  onCustomerReady: () => void;
};

export function CustomerNavigator({ onBackToCart, onCustomerReady }: CustomerNavigatorProps) {
  const [route, setRoute] = useState<CustomerRoute>({ name: 'lookup' });

  const goToLookup = useCallback((initialDocumentId?: string) => {
    setRoute({ name: 'lookup', initialDocumentId });
  }, []);

  const handleRegisterRequired = useCallback(
    (
      documentId: string,
      options?: { lookupStatus: CustomerLookupStatus; prefill?: CustomerRegisterPrefill },
    ) => {
      setRoute({
        name: 'register',
        documentId,
        lookupStatus: options?.lookupStatus ?? { kind: 'not_found', documentId },
        prefill: options?.prefill,
      });
    },
    [],
  );

  const handleBackFromRegister = useCallback(() => {
    if (route.name === 'register') {
      goToLookup(route.documentId);
    }
  }, [goToLookup, route]);

  if (route.name === 'register') {
    return (
      <CustomerRegisterScreen
        documentId={route.documentId}
        lookupStatus={route.lookupStatus}
        prefill={route.prefill}
        onBack={handleBackFromRegister}
        onCustomerReady={onCustomerReady}
      />
    );
  }

  return (
    <CustomerLookupScreen
      initialDocumentId={route.initialDocumentId}
      onBack={onBackToCart}
      onCustomerReady={onCustomerReady}
      onRegisterRequired={handleRegisterRequired}
    />
  );
}
