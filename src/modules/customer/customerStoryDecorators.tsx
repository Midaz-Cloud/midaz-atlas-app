import type { Decorator } from '@storybook/react-native';

import { KioskCustomerProvider } from '@shared/customer';

export const withKioskCustomerProvider: Decorator = (Story) => (
  <KioskCustomerProvider>
    <Story />
  </KioskCustomerProvider>
);
