import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, View } from 'react-native';

import { getDemoInactivityMs } from '@shared/config';
import type { KioskFlowStep } from '@shared/navigation/kioskSession';
import { InactivityWarningScreen } from './InactivityWarningScreen';

type KioskInactivityContextValue = {
  registerActivity: () => void;
  pauseInactivity: () => void;
  resumeInactivity: () => void;
};

const KioskInactivityContext = createContext<KioskInactivityContextValue | null>(
  null,
);

export function useKioskInactivity(): KioskInactivityContextValue {
  const ctx = useContext(KioskInactivityContext);
  if (!ctx) {
    throw new Error('useKioskInactivity must be used within KioskInactivityProvider');
  }
  return ctx;
}

export type KioskInactivityProviderProps = {
  flowStep: KioskFlowStep;
  enabled?: boolean;
  onSessionExpire: () => void;
  children: ReactNode;
};

const inactivityMs = getDemoInactivityMs();

/** P16 · timer global de inactividad (ordering + payment). */
export function KioskInactivityProvider({
  flowStep,
  enabled = true,
  onSessionExpire,
  children,
}: KioskInactivityProviderProps) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.ceil(inactivityMs.graceMs / 1000),
  );
  const pausedRef = useRef(false);
  const expiredRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const isActiveSession = enabled && flowStep !== 'introduction';

  const registerActivity = useCallback(() => {
    if (!isActiveSession || pausedRef.current) {
      return;
    }
    lastActivityRef.current = Date.now();
    if (warningVisible) {
      setWarningVisible(false);
      setSecondsRemaining(Math.ceil(inactivityMs.graceMs / 1000));
    }
  }, [isActiveSession, warningVisible]);

  const pauseInactivity = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeInactivity = useCallback(() => {
    pausedRef.current = false;
    lastActivityRef.current = Date.now();
  }, []);

  const handleContinue = useCallback(() => {
    expiredRef.current = false;
    setWarningVisible(false);
    setSecondsRemaining(Math.ceil(inactivityMs.graceMs / 1000));
    lastActivityRef.current = Date.now();
  }, []);

  /** Introduction does not tick idle; reset clock when ordering/payment starts. */
  useEffect(() => {
    if (!isActiveSession) {
      setWarningVisible(false);
      return;
    }
    lastActivityRef.current = Date.now();
    expiredRef.current = false;
    setWarningVisible(false);
    setSecondsRemaining(Math.ceil(inactivityMs.graceMs / 1000));
  }, [isActiveSession, flowStep]);

  useEffect(() => {
    if (!isActiveSession) {
      return;
    }

    const tick = setInterval(() => {
      if (pausedRef.current) {
        return;
      }

      if (warningVisible) {
        return;
      }

      if (Date.now() - lastActivityRef.current >= inactivityMs.idleMs) {
        expiredRef.current = false;
        setWarningVisible(true);
        setSecondsRemaining(Math.ceil(inactivityMs.graceMs / 1000));
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [isActiveSession, warningVisible]);

  useEffect(() => {
    if (!warningVisible) {
      return;
    }

    const graceTick = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(graceTick);
  }, [warningVisible]);

  useEffect(() => {
    if (warningVisible && secondsRemaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      setWarningVisible(false);
      onSessionExpire();
    }
  }, [warningVisible, secondsRemaining, onSessionExpire]);

  const contextValue: KioskInactivityContextValue = {
    registerActivity,
    pauseInactivity,
    resumeInactivity,
  };

  return (
    <KioskInactivityContext.Provider value={contextValue}>
      <View
        style={{ flex: 1 }}
        onTouchStart={registerActivity}
        onTouchEnd={registerActivity}>
        {children}
      </View>
      <Modal
        visible={warningVisible}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={handleContinue}>
        <InactivityWarningScreen
          secondsRemaining={secondsRemaining}
          onContinue={handleContinue}
        />
      </Modal>
    </KioskInactivityContext.Provider>
  );
}
