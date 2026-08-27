import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { OrderType } from '@modules/introduction/types';

import type { KioskOrderTypeChoice, KioskRuntimeConfig } from '@shared/api/kiosk';
import { fulfillmentToOrderType } from '@shared/api/kiosk';
import { syncMockCatalogFromMenuMocks } from '@shared/api/kiosk/mock/buildMockFixtures';
import { kioskScreenColors, kioskScreenLayout } from '@shared/theme';
import { displayTextStyle } from '@shared/theme';

import { shouldUseMockApi } from '@shared/config/api';
import { useSessionLocale } from '@shared/i18n';
import { resolveKioskLanguagePolicy } from '@shared/i18n/resolveKioskLanguagePolicy';

import { bootstrapKioskSession } from './bootstrapKioskSession';
import { KioskBootstrapLoadingScreen } from './KioskBootstrapLoadingScreen';
import { startKioskCatalogSync, type KioskCatalogSyncController } from './kioskCatalogSync';
import type { KioskBootstrapPhase, KioskBootstrapSnapshot } from './kioskBootstrapState';
import type { ImageSyncProgress } from '@shared/images/kioskImageTypes';

export type KioskSessionStatus = 'loading' | 'ready' | 'auth_error';

export type KioskSessionContextValue = {
  status: KioskSessionStatus;
  runtimeConfig: KioskRuntimeConfig | null;
  bootstrapSnapshot: KioskBootstrapSnapshot | null;
  bootstrapPhase: KioskBootstrapPhase | null;
  orderType: OrderType | undefined;
  setOrderType: (orderType: OrderType) => void;
  /**
   * Opción de tipo de pedido efectivamente elegida (o auto-aplicada cuando hay una
   * sola). Es la fuente del `fulfillmentType` que viaja en la orden; `orderType` se
   * mantiene derivado para no romper lo ya persistido en pagos fallidos.
   */
  orderSelection: KioskOrderTypeChoice | undefined;
  setOrderSelection: (choice: KioskOrderTypeChoice | undefined) => void;
  tableNumber: string | undefined;
  setTableNumber: (value: string | undefined) => void;
  deviceSerial: string | null;
  retryBootstrap: () => void;
  authErrorMessage: string | null;
  /** Tras una compra exitosa: refetch de productos y reinicio del polling de 60s. */
  refreshCatalogAfterPurchase: () => Promise<void>;
};

const KioskSessionContext = createContext<KioskSessionContextValue | null>(null);

type KioskSessionProviderProps = {
  children: ReactNode;
};

export function KioskSessionProvider({ children }: KioskSessionProviderProps) {
  const { t } = useTranslation('session');
  const { applyLanguagePolicy } = useSessionLocale();
  const [status, setStatus] = useState<KioskSessionStatus>('loading');
  const [runtimeConfig, setRuntimeConfig] = useState<KioskRuntimeConfig | null>(null);
  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<KioskBootstrapSnapshot | null>(
    null,
  );
  const [bootstrapPhase, setBootstrapPhase] = useState<KioskBootstrapPhase | null>(null);
  const [imageProgress, setImageProgress] = useState<ImageSyncProgress | null>(null);
  const [orderType, setOrderType] = useState<OrderType | undefined>();
  const [orderSelection, setOrderSelectionState] = useState<KioskOrderTypeChoice | undefined>();

  /** Guardar la opción mantiene `orderType` en sincronía para el código legado. */
  const setOrderSelection = useCallback((choice: KioskOrderTypeChoice | undefined) => {
    setOrderSelectionState(choice);
    setOrderType(choice ? fulfillmentToOrderType(choice.fulfillment) : undefined);
  }, []);
  const [tableNumber, setTableNumber] = useState<string | undefined>();
  const [deviceSerial, setDeviceSerial] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [bootstrapKey, setBootstrapKey] = useState(0);
  const catalogSyncRef = useRef<KioskCatalogSyncController | null>(null);

  const refreshCatalogAfterPurchase = useCallback(async () => {
    if (shouldUseMockApi()) {
      syncMockCatalogFromMenuMocks();
      return;
    }
    await catalogSyncRef.current?.refreshProductsNow();
  }, []);

  const runBootstrap = useCallback(async () => {
    setStatus('loading');
    setAuthErrorMessage(null);
    setBootstrapPhase('login');
    setImageProgress(null);
    const result = await bootstrapKioskSession({
      onPhase: (phase) => {
        setBootstrapPhase(phase);
        if (phase !== 'images') {
          setImageProgress(null);
        }
      },
      onImageProgress: (progress) => setImageProgress(progress),
    });
    if (result.status === 'ready') {
      setRuntimeConfig(result.runtimeConfig);
      setBootstrapSnapshot(result.bootstrapSnapshot);
      setDeviceSerial(result.deviceSerial);
      setBootstrapPhase(null);
      setImageProgress(null);
      setStatus('ready');
      const languagePolicy = resolveKioskLanguagePolicy(
        result.runtimeConfig.raw.appearance.languages,
      );
      await applyLanguagePolicy(languagePolicy);
      return;
    }
    setBootstrapPhase(null);
    setImageProgress(null);
    setAuthErrorMessage(result.message);
    setStatus('auth_error');
  }, [applyLanguagePolicy]);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap, bootstrapKey]);

  useEffect(() => {
    if (status !== 'ready' || shouldUseMockApi() || !deviceSerial) {
      catalogSyncRef.current = null;
      return;
    }
    const controller = startKioskCatalogSync({
      deviceSerial,
      onConfigUpdated: async ({ runtimeConfig: nextRuntime, bootstrapSnapshot: nextSnapshot }) => {
        setRuntimeConfig(nextRuntime);
        setBootstrapSnapshot(nextSnapshot);
        const languagePolicy = resolveKioskLanguagePolicy(
          nextRuntime.raw.appearance.languages,
        );
        await applyLanguagePolicy(languagePolicy);
      },
    });
    catalogSyncRef.current = controller;
    return () => {
      controller.stop();
      catalogSyncRef.current = null;
    };
  }, [status, deviceSerial, applyLanguagePolicy]);

  const retryBootstrap = useCallback(() => {
    setBootstrapKey((k) => k + 1);
  }, []);

  const value = useMemo(
    (): KioskSessionContextValue => ({
      status,
      runtimeConfig,
      bootstrapSnapshot,
      bootstrapPhase,
      orderType,
      setOrderType,
      orderSelection,
      setOrderSelection,
      tableNumber,
      setTableNumber,
      deviceSerial,
      retryBootstrap,
      authErrorMessage,
      refreshCatalogAfterPurchase,
    }),
    [
      status,
      runtimeConfig,
      bootstrapSnapshot,
      bootstrapPhase,
      orderType,
      orderSelection,
      setOrderSelection,
      tableNumber,
      deviceSerial,
      retryBootstrap,
      authErrorMessage,
      refreshCatalogAfterPurchase,
    ],
  );

  if (status === 'loading') {
    return (
      <KioskBootstrapLoadingScreen phase={bootstrapPhase} imageProgress={imageProgress} />
    );
  }

  if (status === 'auth_error') {
    return (
      <View style={styles.centered} testID="kiosk-session-auth-error">
        <Text style={styles.errorTitle}>{t('bootstrap.authErrorTitle')}</Text>
        <Text style={styles.errorMessage}>{authErrorMessage}</Text>
        <Text style={styles.retryHint} onPress={retryBootstrap}>
          {t('bootstrap.retry')}
        </Text>
      </View>
    );
  }

  return (
    <KioskSessionContext.Provider value={value}>{children}</KioskSessionContext.Provider>
  );
}

export function useKioskSession(): KioskSessionContextValue {
  const ctx = useContext(KioskSessionContext);
  if (!ctx) {
    throw new Error('useKioskSession must be used within KioskSessionProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: kioskScreenColors.screenBackground,
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
    gap: kioskScreenLayout.menuSectionGap,
  },
  errorTitle: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    color: kioskScreenColors.title,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: kioskScreenLayout.searchFontSize,
    color: kioskScreenColors.menuSectionMuted,
    textAlign: 'center',
  },
  retryHint: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    color: kioskScreenColors.priceAccent,
  },
});
