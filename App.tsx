/**
 * @format
 */

import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionLocaleProvider } from '@shared/i18n';
import { KioskCustomerProvider } from '@shared/customer';
import { AppNavigator } from '@shared/navigation';
import { EcrConnectionProvider } from '@shared/peripherals/ecr';
import { KioskSessionProvider, KioskOrderSessionBridge } from '@shared/session';

function App() {
  return (
    <SafeAreaProvider>
      <SessionLocaleProvider>
        <KioskSessionProvider>
          <EcrConnectionProvider>
            <KioskOrderSessionBridge>
              <KioskCustomerProvider>
                <StatusBar barStyle="light-content" />
                <AppNavigator />
              </KioskCustomerProvider>
            </KioskOrderSessionBridge>
          </EcrConnectionProvider>
        </KioskSessionProvider>
      </SessionLocaleProvider>
    </SafeAreaProvider>
  );
}

export default App;
