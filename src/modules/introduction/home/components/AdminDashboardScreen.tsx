import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  buildSettlementFromEcr,
  createKioskApiClient,
  isSettlementApprovedPlainText,
  loadAccessToken,
  loadLastPosSerial,
  salvageSettlementDataForPrint,
  saveLastPosSerial,
  toPersistableSettlementRequest,
} from '@shared/api/kiosk';
import { KioskApiError } from '@shared/api/kiosk/errors';
import { formatUserFacingError } from '@shared/api/kiosk/friendlySettlementError';
import type { KioskSettlementData } from '@shared/api/kiosk/types';
import { shouldPrintFiscalZ } from '@shared/api/kiosk/utils/invoicingType';
import { KioskConfirmModal, KioskScreenLayout } from '@shared/components';
import { shouldSendSettlementExcelMail } from '@shared/config';
import {
  generateSettlementExcelDocument,
  sendSettlementExcelDocument,
} from '@shared/mail';
import {
  clearFailedPayments,
  clearSuccessfulPosTransactions,
  listSuccessfulPosTransactions,
} from '@shared/persistence';
import { useEcrConnection } from '@shared/peripherals/ecr';
import { createFiscalClient } from '@shared/peripherals/fiscal';
import {
  createPrinterClient,
  formatSettlementTicketText,
  sanitizePrinterText,
} from '@shared/peripherals/printer';
import { useKioskAppearance, useKioskOrganization } from '@shared/session';
import { displayTextStyle, bodyTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { runFiscalZClose } from '../services/runFiscalZClose';
import {
  buildCloseSteps,
  type CloseStep,
  type CloseStepId,
  type CloseStepLabels,
  type StepState,
} from './buildCloseSteps';

export type AdminDashboardScreenProps = {
  onBack: () => void;
  onOpenFailedPayments?: () => void;
};

type StatusTone = 'neutral' | 'success' | 'error';

function isPosCancelledOrFailedMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('cancel') ||
    lower.includes('timeout') ||
    lower.includes('rechaz') ||
    lower.includes('reject') ||
    lower.includes('abort')
  );
}

export function AdminDashboardScreen({
  onBack,
  onOpenFailedPayments,
}: AdminDashboardScreenProps) {
  const { t } = useTranslation('introduction');
  const colors = useKioskScreenColors();
  const appearance = useKioskAppearance();
  const organization = useKioskOrganization();
  const printsFiscalZ = shouldPrintFiscalZ(organization?.effectiveInvoicingType);
  const excelMailEnabled = shouldSendSettlementExcelMail();
  const closeStepLabels = useMemo<CloseStepLabels>(
    () => ({
      waiting_pos: t('adminDashboard.steps.waitingPos'),
      fiscal_z: t('adminDashboard.steps.fiscalZ'),
      printing: t('adminDashboard.steps.printing'),
      generating_doc: t('adminDashboard.steps.generatingDoc'),
      sending_doc: t('adminDashboard.steps.sendingDoc'),
    }),
    [t],
  );
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<StatusTone>('neutral');
  const [closeSteps, setCloseSteps] = useState<CloseStep[]>(() =>
    buildCloseSteps(excelMailEnabled, closeStepLabels),
  );
  const [showCloseProgress, setShowCloseProgress] = useState(false);
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);

  const showStatus = (text: string, tone: StatusTone) => {
    setMessage(text);
    setMessageTone(tone);
  };

  const resetCloseProgress = () => {
    setCloseSteps(buildCloseSteps(excelMailEnabled, closeStepLabels));
    setShowCloseProgress(true);
  };

  const setStepState = (
    id: CloseStepId,
    state: StepState,
    detail?: string,
  ) => {
    setCloseSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              state,
              detail: detail ?? (state === 'active' || state === 'pending' ? undefined : step.detail),
            }
          : step,
      ),
    );
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          paddingHorizontal: kioskScale(40),
          paddingVertical: kioskScale(40),
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScale(32),
        },
        card: {
          width: '100%',
          maxWidth: kioskScale(640),
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(3),
          borderColor: colors.productDetailBorder,
          padding: kioskScale(48),
          alignItems: 'center',
          gap: kioskScale(32),
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(48),
          lineHeight: kioskScale(56),
          color: colors.title,
          textAlign: 'center',
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScale(24),
          lineHeight: kioskScale(32),
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
        button: {
          width: '100%',
          height: kioskScale(112),
          borderRadius: kioskScale(20),
          backgroundColor: colors.priceAccent,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: kioskScale(16),
        },
        buttonDisabled: {
          opacity: 0.6,
        },
        buttonText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(32),
          color: colors.title,
        },
        statusMessage: {
          ...bodyTextStyle(),
          fontSize: kioskScale(24),
          lineHeight: kioskScale(32),
          textAlign: 'center',
          marginTop: kioskScale(16),
        },
        statusNeutral: {
          color: colors.title,
        },
        statusSuccess: {
          color: colors.priceAccent,
        },
        statusError: {
          color: '#B42318',
        },
        progressBox: {
          width: '100%',
          gap: kioskScale(16),
          marginTop: kioskScale(8),
        },
        progressTitle: {
          ...bodyTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(26),
          color: colors.title,
          textAlign: 'center',
        },
        stepRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: kioskScale(16),
        },
        stepMarker: {
          width: kioskScale(36),
          height: kioskScale(36),
          borderRadius: kioskScale(18),
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: kioskScale(2),
        },
        stepMarkerPending: {
          backgroundColor: colors.productDetailBorder,
        },
        stepMarkerActive: {
          backgroundColor: colors.priceAccent,
        },
        stepMarkerDone: {
          backgroundColor: '#1B7F4E',
        },
        stepMarkerError: {
          backgroundColor: '#B42318',
        },
        stepMarkerSkipped: {
          backgroundColor: colors.menuSectionMuted,
        },
        stepMarkerText: {
          ...bodyTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(18),
          color: colors.title,
        },
        stepMarkerTextOnAccent: {
          color: '#FFFFFF',
        },
        stepTextCol: {
          flex: 1,
          gap: kioskScale(4),
        },
        stepLabel: {
          ...bodyTextStyle(),
          fontSize: kioskScale(24),
          lineHeight: kioskScale(30),
          color: colors.title,
        },
        stepLabelMuted: {
          color: colors.menuSectionMuted,
        },
        stepDetail: {
          ...bodyTextStyle(),
          fontSize: kioskScale(20),
          lineHeight: kioskScale(26),
          color: colors.menuSectionMuted,
        },
        stepDetailError: {
          color: '#B42318',
        },
      }),
    [colors],
  );

  const ecr = useEcrConnection();

  const requestClosePos = useCallback(() => {
    if (loading) {
      return;
    }
    setConfirmCloseVisible(true);
  }, [loading]);

  const handleClosePos = async () => {
    setConfirmCloseVisible(false);
    setLoading(true);
    setMessage(null);
    setMessageTone('neutral');
    resetCloseProgress();

    let mailSent = false;
    let mailError: string | null = null;
    let docError: string | null = null;
    let printSuccess = false;
    let excelFile: { path: string; fileName: string } | null = null;

    try {
      let connected = ecr.isConnected;
      if (!connected) {
        try {
          await ecr.initialize();
          await ecr.connect();
          // connect() already succeeded; ecr.isConnected is React state and
          // stays stale until the next render, so do not read it here.
          connected = true;
        } catch (connErr) {
          console.warn('[AdminDashboard] Error al intentar conectar con el POS:', connErr);
        }
      }

      if (!connected) {
        setStepState('waiting_pos', 'error', 'POS no conectado');
        setStepState('fiscal_z', 'skipped');
        setStepState('printing', 'skipped');
        setStepState('generating_doc', 'skipped');
        setStepState('sending_doc', 'skipped');
        showStatus(
          formatUserFacingError(
            'El punto de venta no está conectado. Verifica el cable USB e intenta de nuevo.',
          ),
          'error',
        );
        return;
      }

      setStepState('waiting_pos', 'active');

      let response: string;
      try {
        response = await ecr.performSettlement();
      } catch (posErr) {
        const errMsg = posErr instanceof Error ? posErr.message : String(posErr);
        const cancelled = isPosCancelledOrFailedMessage(errMsg);
        setStepState(
          'waiting_pos',
          'error',
          cancelled ? 'Cierre cancelado o sin respuesta del POS' : errMsg,
        );
        setStepState('fiscal_z', 'skipped');
        setStepState('printing', 'skipped');
        setStepState('generating_doc', 'skipped');
        setStepState('sending_doc', 'skipped');
        showStatus(
          formatUserFacingError(
            cancelled
              ? 'El cierre de lote fue cancelado o no confirmado en el datáfono.'
              : 'No se pudo obtener la confirmación del datáfono. Intenta de nuevo.',
          ),
          'error',
        );
        return;
      }

      console.log('[AdminDashboard] Respuesta completa del POS (JSON):', response);

      const posSerialFallback = await loadLastPosSerial();
      const settlementResult = buildSettlementFromEcr(response, { posSerialFallback });
      const settlementRequest = settlementResult.request;

      const plainApproved =
        !settlementResult.ok && isSettlementApprovedPlainText(response);
      const salvaged = plainApproved
        ? salvageSettlementDataForPrint(response, { posSerialFallback })
        : null;

      if (salvaged) {
        console.warn(
          '[AdminDashboard] JSON de cierre corrupto; continuando con campos recuperados del texto POS',
        );
      }

      const printSettlementData: KioskSettlementData | undefined =
        settlementRequest?.settlementData ?? salvaged?.settlementData;
      const printReferenceNo =
        settlementRequest?.settlementId ?? salvaged?.referenceNo;

      if (printSettlementData?.deviceSerial) {
        void saveLastPosSerial(printSettlementData.deviceSerial);
      } else if (settlementRequest?.posSerial) {
        void saveLastPosSerial(settlementRequest.posSerial);
      }

      const shouldComplete =
        (settlementResult.ok && Boolean(printSettlementData)) || Boolean(salvaged);

      if (!shouldComplete || !printSettlementData) {
        setStepState(
          'waiting_pos',
          'error',
          settlementResult.ok
            ? 'Respuesta incompleta del POS'
            : 'Cierre rechazado o cancelado en el POS',
        );
        setStepState('fiscal_z', 'skipped');
        setStepState('printing', 'skipped');
        setStepState('generating_doc', 'skipped');
        setStepState('sending_doc', 'skipped');
        showStatus(
          formatUserFacingError(
            'El datáfono no confirmó el cierre de lote. Verifica el equipo e intenta de nuevo.',
          ),
          'error',
        );
        return;
      }

      setStepState('waiting_pos', 'done');

      if (printsFiscalZ) {
        setStepState('fiscal_z', 'active');
        try {
          const token = await loadAccessToken();
          const zResult = await runFiscalZClose({
            effectiveInvoicingType: organization?.effectiveInvoicingType,
            fiscal: createFiscalClient(),
            kiosk: createKioskApiClient(token ?? undefined),
          });
          if (zResult.persisted) {
            setStepState('fiscal_z', 'done');
          } else {
            setStepState(
              'fiscal_z',
              'error',
              zResult.warning ?? 'No se pudo completar el reporte Z',
            );
          }
        } catch (zErr) {
          const zMsg = zErr instanceof Error ? zErr.message : String(zErr);
          console.warn('[AdminDashboard] Error inesperado en reporte Z:', zErr);
          setStepState('fiscal_z', 'error', zMsg);
        }
      } else {
        setStepState('fiscal_z', 'skipped', 'La organización no usa máquina fiscal');
      }

      const persistSettlementRequest = toPersistableSettlementRequest(
        settlementResult,
        salvaged,
      );
      if (persistSettlementRequest) {
        try {
          const token = await loadAccessToken();
          await createKioskApiClient(token ?? undefined).submitSettlement(
            persistSettlementRequest,
          );
        } catch (settleErr) {
          if (!(settleErr instanceof KioskApiError && settleErr.statusCode === 409)) {
            console.warn('[AdminDashboard] Error al registrar el cierre POS:', settleErr);
          }
        }
      }

      let localTransactions: Awaited<
        ReturnType<typeof listSuccessfulPosTransactions>
      > = [];
      try {
        localTransactions = await listSuccessfulPosTransactions();
      } catch (listErr) {
        console.warn(
          '[AdminDashboard] Error al listar transacciones POS locales:',
          listErr,
        );
      }

      // 1) Print first — never block the ticket behind Excel/mail.
      setStepState('printing', 'active');
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      const ticketText = formatSettlementTicketText({
        settlementData: printSettlementData,
        referenceNo: printReferenceNo,
        approved: true,
        transactions: localTransactions.map((tx) => ({
          posReference: tx.posReference,
          createdAt: tx.createdAt,
          amountDisplay: tx.amountDisplay,
          posDateTime: tx.posDateTime,
        })),
      });
      const sanitizedTicketText = sanitizePrinterText(ticketText);
      const printer = createPrinterClient();
      try {
        await printer.connect();
        await printer.printText(sanitizedTicketText, 'CIERRE DE LOTE');
        printSuccess = true;
        setStepState('printing', 'done');
      } catch (printErr) {
        const printError =
          printErr instanceof Error ? printErr.message : String(printErr);
        console.warn('[AdminDashboard] Error al imprimir el ticket de cierre:', printErr);
        setStepState('printing', 'error', printError);
      } finally {
        try {
          await printer.disconnect();
        } catch {}
      }

      try {
        await clearSuccessfulPosTransactions();
        await clearFailedPayments();
      } catch (clearErr) {
        console.warn(
          '[AdminDashboard] Error al limpiar transacciones locales (exitosas/fallidas):',
          clearErr,
        );
      }

      // Excel + mail are opt-in (`KIOSK_SETTLEMENT_EXCEL_MAIL=true`).
      // When off, those steps are omitted from the wizard (not shown as skipped).
      if (excelMailEnabled) {
        setStepState('generating_doc', 'active');
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        try {
          console.log('[AdminDashboard] Generando Excel de cierre…');
          excelFile = await generateSettlementExcelDocument({
            settlementData: printSettlementData,
            referenceNo: printReferenceNo,
            approved: true,
            transactions: localTransactions,
            headerColor: appearance?.primaryColor,
          });
          console.log('[AdminDashboard] Excel listo:', excelFile.fileName);
          setStepState('generating_doc', 'done', excelFile.fileName);
        } catch (genErr) {
          docError = genErr instanceof Error ? genErr.message : String(genErr);
          console.warn('[AdminDashboard] Error al generar Excel de cierre:', genErr);
          setStepState('generating_doc', 'error', docError);
        }

        setStepState('sending_doc', 'active');
        if (excelFile) {
          try {
            const mailResult = await sendSettlementExcelDocument({
              settlementData: printSettlementData,
              referenceNo: printReferenceNo,
              approved: true,
              transactions: localTransactions,
              headerColor: appearance?.primaryColor,
              path: excelFile.path,
              fileName: excelFile.fileName,
            });
            mailSent = true;
            setStepState('sending_doc', 'done', mailResult.to);
            console.log('[AdminDashboard] Cierre enviado por correo:', mailResult);
          } catch (mailErr) {
            mailError = mailErr instanceof Error ? mailErr.message : String(mailErr);
            console.warn('[AdminDashboard] Error al enviar correo de cierre:', mailErr);
            setStepState('sending_doc', 'error', mailError);
          }
        } else {
          setStepState('sending_doc', 'skipped', 'Sin documento para enviar');
        }
      }

      if (!excelMailEnabled) {
        if (printSuccess) {
          showStatus('Cierre de lote realizado e impreso con éxito.', 'success');
        } else {
          showStatus(
            formatUserFacingError(
              'El cierre se confirmó en el datáfono, pero no se pudo imprimir el ticket. Revisa la impresora.',
            ),
            'error',
          );
        }
      } else if (mailSent && printSuccess) {
        showStatus('Cierre de lote realizado, enviado por correo e impreso con éxito.', 'success');
      } else if (printSuccess && !mailSent) {
        showStatus(
          formatUserFacingError(
            mailError ??
              docError ??
              'El ticket se imprimió, pero no se pudo enviar el correo del cierre.',
          ),
          'error',
        );
      } else if (mailSent && !printSuccess) {
        showStatus(
          formatUserFacingError(
            'El cierre se envió por correo, pero no se pudo imprimir el ticket. Revisa la impresora.',
          ),
          'error',
        );
      } else {
        showStatus(
          formatUserFacingError(
            mailError ??
              docError ??
              'El cierre se confirmó en el datáfono, pero falló el correo y la impresión.',
          ),
          'error',
        );
      }
    } catch (err) {
      console.error('[AdminDashboard] Error durante el proceso de cierre:', err);
      showStatus(
        formatUserFacingError(
          'No se pudo completar el cierre de lote. Verifica el datáfono e intenta de nuevo.',
        ),
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepMarker = (step: CloseStep, index: number) => {
    const markerStyle = [
      styles.stepMarker,
      step.state === 'active'
        ? styles.stepMarkerActive
        : step.state === 'done'
          ? styles.stepMarkerDone
          : step.state === 'error'
            ? styles.stepMarkerError
            : step.state === 'skipped'
              ? styles.stepMarkerSkipped
              : styles.stepMarkerPending,
    ];
    const onAccent =
      step.state === 'active' ||
      step.state === 'done' ||
      step.state === 'error' ||
      step.state === 'skipped';

    return (
      <View style={markerStyle}>
        {step.state === 'active' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[styles.stepMarkerText, onAccent && styles.stepMarkerTextOnAccent]}>
            {step.state === 'done' ? '✓' : step.state === 'error' ? '!' : String(index + 1)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KioskScreenLayout
      testID="admin-dashboard-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="admin-dashboard-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Panel de Superusuario</Text>
          <Text style={styles.subtitle}>
            Desde esta seccion puedes realizar operaciones administrativas en el kiosco.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={requestClosePos}
            disabled={loading}
            testID="admin-close-lote-button">
            {loading ? <ActivityIndicator size="small" color={colors.title} /> : null}
            <Text style={styles.buttonText}>
              {loading ? 'Procesando Cierre...' : 'Realizar Cierre de Lote'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onOpenFailedPayments}
            disabled={loading || !onOpenFailedPayments}
            testID="admin-failed-payments-button">
            <Text style={styles.buttonText}>Ver pagos fallidos</Text>
          </TouchableOpacity>

          {showCloseProgress ? (
            <View style={styles.progressBox} testID="admin-close-progress">
              <Text style={styles.progressTitle}>{t('adminDashboard.progressTitle')}</Text>
              {closeSteps.map((step, index) => (
                <View key={step.id} style={styles.stepRow} testID={`admin-close-step-${step.id}`}>
                  {renderStepMarker(step, index)}
                  <View style={styles.stepTextCol}>
                    <Text
                      style={[
                        styles.stepLabel,
                        (step.state === 'pending' || step.state === 'skipped') &&
                          styles.stepLabelMuted,
                      ]}>
                      {step.label}
                    </Text>
                    {step.detail ? (
                      <Text
                        style={[
                          styles.stepDetail,
                          step.state === 'error' && styles.stepDetailError,
                        ]}
                        numberOfLines={3}>
                        {step.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {message ? (
            <Text
              style={[
                styles.statusMessage,
                messageTone === 'success'
                  ? styles.statusSuccess
                  : messageTone === 'error'
                    ? styles.statusError
                    : styles.statusNeutral,
              ]}
              testID="admin-dashboard-status">
              {message}
            </Text>
          ) : null}
        </View>
      </View>

      <KioskConfirmModal
        visible={confirmCloseVisible}
        title={t('adminDashboard.confirmTitle')}
        message={
          printsFiscalZ
            ? excelMailEnabled
              ? t('adminDashboard.confirmFiscalWithMail')
              : t('adminDashboard.confirmFiscal')
            : excelMailEnabled
              ? t('adminDashboard.confirmWithMail')
              : t('adminDashboard.confirm')
        }
        confirmLabel={loading ? t('adminDashboard.confirmProcessing') : t('adminDashboard.confirmButton')}
        busy={loading}
        onCancel={() => setConfirmCloseVisible(false)}
        onConfirm={() => {
          void handleClosePos();
        }}
        titleTestID="admin-close-confirm-title"
        messageTestID="admin-close-confirm-message"
        confirmTestID="admin-close-confirm-button"
        cancelTestID="admin-close-cancel-button"
      />
    </KioskScreenLayout>
  );
}
