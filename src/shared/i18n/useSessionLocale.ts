import { useContext } from 'react';

import { SessionLocaleContext } from './SessionLocaleProvider';

export function useSessionLocale() {
  const context = useContext(SessionLocaleContext);

  if (!context) {
    throw new Error('useSessionLocale must be used within SessionLocaleProvider');
  }

  return context;
}
