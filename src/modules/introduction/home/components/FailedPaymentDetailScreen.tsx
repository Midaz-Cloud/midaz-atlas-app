import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  canRetryFailedPaymentOrder,
  classifyRetryDuplicateRisk,
  retryFailedPaymentOrder,
} from '@modules/payment/recovery';
import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';
import { KioskConfirmModal, KioskScreenLayout } from '@shared/components';
import { defaultOrderFiscalConfig } from '@shared/kiosk-order';
import {
  getFailedPayment,
  type FailedPaymentRecord,
} from '@shared/persistence';
import {
  useBcvExchangeRate,
  useKioskOperational,
  useKioskOrganization,
  useKioskPricing,
} from '@shared/session';
import {
  bodyTextStyle,
  colorWithAlpha,
  displayTextStyle,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  salvaged: 'Recuperada',
  retry_pending: 'Reintento pendiente',
  retried_ok: 'Orden registrada',
  retry_failed: 'Reintento falló',
  dismissed: 'Descartada',
};

export type FailedPaymentDetailScreenProps = {
  paymentId: number;
  onBack: () => void;
};

type DialogState =
  | { kind: 'confirm' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | null;

function formatLocalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

function formatMoney(value?: number | null): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRawJsonForDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return 'Sin JSON capturado.';
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function InfoBlock({
  title,
  children,
  styles,
}: {
  title: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.blockBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  styles,
}: {
  label: string;
  value?: string | number | null;
  styles: ReturnType<typeof createStyles>;
}) {
  if (value == null || value === '') {
    return null;
  }
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useKioskScreenColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: kioskScale(40),
      paddingTop: kioskScale(8),
      width: '100%',
    },
    headerBlock: {
      marginBottom: kioskScale(20),
      gap: kioskScale(12),
      alignItems: 'center',
    },
    title: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(36),
      color: colors.title,
      textAlign: 'center',
    },
    statusBadge: {
      paddingHorizontal: kioskScale(16),
      paddingVertical: kioskScale(8),
      borderRadius: kioskScale(999),
      backgroundColor: colorWithAlpha(colors.priceAccent, 0.12),
      borderWidth: kioskScale(2),
      borderColor: colorWithAlpha(colors.priceAccent, 0.28),
    },
    statusBadgeText: {
      ...bodyTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(18),
      color: colors.title,
    },
    block: {
      backgroundColor: colors.cardBackground,
      borderRadius: kioskScale(24),
      borderWidth: kioskScale(2),
      borderColor: colors.productDetailBorder,
      padding: kioskScale(24),
      marginBottom: kioskScale(18),
      gap: kioskScale(16),
      ...kioskScreenShadows.menuCard,
    },
    blockTitle: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(24),
      color: colors.title,
    },
    blockBody: {
      gap: kioskScale(12),
    },
    field: {
      gap: kioskScale(4),
    },
    fieldLabel: {
      ...bodyTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(16),
      color: colors.title,
      opacity: 0.65,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    fieldValue: {
      ...bodyTextStyle(),
      fontSize: kioskScale(22),
      lineHeight: kioskScale(30),
      color: colors.title,
    },
    fieldRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: kioskScale(20),
    },
    fieldHalf: {
      flexGrow: 1,
      flexBasis: '40%',
      minWidth: kioskScale(200),
      gap: kioskScale(4),
    },
    orderLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: kioskScale(12),
      paddingVertical: kioskScale(12),
      paddingHorizontal: kioskScale(14),
      borderRadius: kioskScale(16),
      backgroundColor: colorWithAlpha(colors.priceAccent, 0.06),
      borderWidth: kioskScale(1),
      borderColor: colorWithAlpha(colors.priceAccent, 0.14),
    },
    orderLineLeft: {
      flex: 1,
      gap: kioskScale(2),
    },
    orderLineName: {
      ...bodyTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(22),
      color: colors.title,
    },
    orderLineMeta: {
      ...bodyTextStyle(),
      fontSize: kioskScale(18),
      color: colors.title,
      opacity: 0.7,
    },
    orderLinePrice: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(22),
      color: colors.title,
    },
    totalBox: {
      marginTop: kioskScale(8),
      paddingVertical: kioskScale(18),
      paddingHorizontal: kioskScale(20),
      borderRadius: kioskScale(18),
      backgroundColor: colorWithAlpha(colors.priceAccent, 0.12),
      borderWidth: kioskScale(2),
      borderColor: colorWithAlpha(colors.priceAccent, 0.28),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: kioskScale(12),
    },
    totalLabel: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(24),
      color: colors.title,
    },
    totalValue: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(30),
      color: colors.priceAccent,
    },
    errorBox: {
      backgroundColor: colorWithAlpha(colors.priceAccent, 0.08),
      borderRadius: kioskScale(24),
      borderWidth: kioskScale(2),
      borderColor: colorWithAlpha(colors.priceAccent, 0.22),
      padding: kioskScale(24),
      marginBottom: kioskScale(18),
      gap: kioskScale(12),
    },
    errorBoxTitle: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(24),
      color: colors.title,
    },
    errorBoxText: {
      ...bodyTextStyle(),
      fontSize: kioskScale(22),
      lineHeight: kioskScale(30),
      color: colors.title,
    },
    retryButton: {
      width: '100%',
      minHeight: kioskScale(96),
      borderRadius: kioskScale(20),
      backgroundColor: colors.priceAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: kioskScale(8),
      marginBottom: kioskScale(32),
    },
    retryButtonDisabled: {
      opacity: 0.6,
    },
    retryButtonText: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(30),
      color: colors.title,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      ...bodyTextStyle(),
      fontSize: kioskScale(22),
      color: colors.title,
      textAlign: 'center',
    },
    mutedInline: {
      ...bodyTextStyle(),
      fontSize: kioskScale(20),
      color: colors.title,
      opacity: 0.7,
    },
    expandBlock: {
      backgroundColor: colors.cardBackground,
      borderRadius: kioskScale(24),
      borderWidth: kioskScale(2),
      borderColor: colors.productDetailBorder,
      marginBottom: kioskScale(18),
      overflow: 'hidden',
      ...kioskScreenShadows.menuCard,
    },
    expandHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: kioskScale(20),
      paddingHorizontal: kioskScale(24),
      gap: kioskScale(12),
    },
    expandHeaderTitle: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(24),
      color: colors.title,
      flex: 1,
    },
    expandChevron: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(28),
      color: colors.priceAccent,
    },
    expandBody: {
      borderTopWidth: kioskScale(2),
      borderTopColor: colors.productDetailBorder,
      padding: kioskScale(20),
      backgroundColor: colorWithAlpha(colors.title, 0.03),
    },
    jsonText: {
      ...bodyTextStyle(),
      fontSize: kioskScale(16),
      lineHeight: kioskScale(24),
      color: colors.title,
      fontFamily: 'monospace',
    },
  });
}

export function FailedPaymentDetailScreen({
  paymentId,
  onBack,
}: FailedPaymentDetailScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<FailedPaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const organization = useKioskOrganization();
  const pricing = useKioskPricing();
  const operational = useKioskOperational();
  const bcvRate = useBcvExchangeRate();

  const reload = useCallback(async () => {
    const row = await getFailedPayment(paymentId);
    setRecord(row);
  }, [paymentId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getFailedPayment(paymentId);
        if (!cancelled) {
          setRecord(row);
          if (!row) {
            setError('Registro no encontrado.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const duplicateRisk = record ? classifyRetryDuplicateRisk(record) : 'low';
  const canRetryOrder = record != null && canRetryFailedPaymentOrder(record);

  const confirmMessage = useMemo(() => {
    if (!record) {
      return '';
    }
    if (duplicateRisk === 'possible_duplicate') {
      const posRef =
        record.salvage?.payload?.posReference ??
        record.payment?.posReference ??
        '—';
      return (
        'El registro original murió sin respuesta del servidor: la orden PUDO haberse creado. ' +
        `Verifica en el panel que no exista una orden con POS ref ${posRef} antes de confirmar.`
      );
    }
    return 'Se registrará la orden en el servidor con los datos guardados del cliente, pedido y pago. ¿Confirmar?';
  }, [duplicateRisk, record]);

  const handleRetryOrder = useCallback(async () => {
    setRecoveryBusy(true);
    try {
      const result = await retryFailedPaymentOrder({
        id: paymentId,
        declaresTaxes: parseDeclaresTaxes(organization?.declaresTaxes),
        usdToVesRate: bcvRate ?? defaultOrderFiscalConfig.usdToVesRate,
        primaryCurrency: pricing?.primaryCurrency,
        organizationName: organization?.name,
        organizationLegalName: organization?.legalName,
        printQrEnabled: operational?.printQrEnabled,
      });
      if (result.ok) {
        const printNote = result.printWarning
          ? `\n\nNota: ${result.printWarning}`
          : '';
        setDialog({
          kind: 'success',
          message: `Orden registrada: ${result.displayOrderNumber}${printNote}`,
        });
      } else {
        setDialog({
          kind: 'error',
          message:
            result.message ??
            `No se pudo registrar la orden (${result.reason}).`,
        });
        await reload();
      }
    } catch (err) {
      setDialog({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRecoveryBusy(false);
    }
  }, [
    bcvRate,
    operational?.printQrEnabled,
    organization,
    paymentId,
    pricing?.primaryCurrency,
    reload,
  ]);

  const handleDialogClose = useCallback(() => {
    const wasSuccess = dialog?.kind === 'success';
    setDialog(null);
    if (wasSuccess) {
      onBack();
    }
  }, [dialog?.kind, onBack]);

  const customerName = record?.customer
    ? `${record.customer.firstName ?? ''} ${record.customer.lastName ?? ''}`.trim()
    : '';

  const dialogTitle =
    dialog?.kind === 'confirm'
      ? 'Reintentar orden'
      : dialog?.kind === 'success'
        ? 'Listo'
        : dialog?.kind === 'error'
          ? 'No se pudo completar'
          : '';

  const totalVes = formatMoney(record?.order?.totals.totalVes);
  const totalUsd = formatMoney(record?.order?.totals.totalUsd);

  return (
    <KioskScreenLayout
      testID="failed-payment-detail-screen"
      showPattern
      contentAlign="top"
      onBack={onBack}
      backButtonTestID="failed-payment-detail-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.priceAccent} />
        </View>
      ) : error || !record ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? 'Registro no encontrado.'}</Text>
        </View>
      ) : (
        <ScrollView style={styles.container}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>{record.displayRef}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {STATUS_LABELS[record.status] ?? record.status}
              </Text>
            </View>
          </View>

          <InfoBlock title="Resumen" styles={styles}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Field
                  label="Fecha"
                  value={formatLocalDateTime(record.createdAt)}
                  styles={styles}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field label="Etapa" value={record.stage} styles={styles} />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="Método"
                  value={record.paymentMethod}
                  styles={styles}
                />
              </View>
            </View>
          </InfoBlock>

          <InfoBlock title="Cliente" styles={styles}>
            {record.customer ? (
              <>
                <Field label="Nombre" value={customerName || null} styles={styles} />
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Field
                      label="Documento"
                      value={record.customer.documentId}
                      styles={styles}
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Field
                      label="Teléfono"
                      value={record.customer.phone}
                      styles={styles}
                    />
                  </View>
                </View>
                <Field label="Email" value={record.customer.email} styles={styles} />
              </>
            ) : (
              <Text style={styles.mutedInline}>Sin datos de cliente.</Text>
            )}
          </InfoBlock>

          <InfoBlock title="Pedido" styles={styles}>
            {(record.order?.lines ?? []).length > 0 ? (
              (record.order?.lines ?? []).map((line, index) => (
                <View
                  key={`${line.productId}-${index}`}
                  style={styles.orderLine}>
                  <View style={styles.orderLineLeft}>
                    <Text style={styles.orderLineName}>
                      {line.quantity}× {line.productId}
                    </Text>
                    <Text style={styles.orderLineMeta}>
                      Precio unit. {formatMoney(line.unitPrice) ?? line.unitPrice}
                    </Text>
                  </View>
                  <Text style={styles.orderLinePrice}>
                    {formatMoney(line.unitPrice * line.quantity) ?? '—'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedInline}>Sin líneas de pedido.</Text>
            )}
            {totalVes || totalUsd ? (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total a pagar</Text>
                <Text style={styles.totalValue}>
                  {totalVes ? `Bs ${totalVes}` : `USD ${totalUsd}`}
                </Text>
              </View>
            ) : null}
            <Field label="Tipo" value={record.order?.orderType} styles={styles} />
            <Field
              label="Mesa/localizador"
              value={record.order?.tableNumber}
              styles={styles}
            />
          </InfoBlock>

          <InfoBlock title="Pago" styles={styles}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Field
                  label="Método"
                  value={record.payment?.paymentMethod}
                  styles={styles}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="POS ref"
                  value={record.payment?.posReference}
                  styles={styles}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="Cédula pago"
                  value={record.payment?.cedula}
                  styles={styles}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="Ref. móvil"
                  value={record.payment?.mobileReference}
                  styles={styles}
                />
              </View>
            </View>
          </InfoBlock>

          <View style={styles.errorBox}>
            <Text style={styles.errorBoxTitle}>Problema detectado</Text>
            <Text style={styles.errorBoxText}>
              {record.errorMessage ||
                'No se pudo completar el registro de la orden. Puedes reintentarlo con los datos guardados.'}
            </Text>
            {record.errorReason ? (
              <Text style={styles.mutedInline}>Código: {record.errorReason}</Text>
            ) : null}
            {record.salvage?.retryError ? (
              <Text style={styles.mutedInline}>
                Último reintento: {record.salvage.retryError}
              </Text>
            ) : null}
          </View>

          <View style={styles.expandBlock}>
            <TouchableOpacity
              style={styles.expandHeader}
              onPress={() => setJsonExpanded((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: jsonExpanded }}
              testID="failed-payment-json-toggle">
              <Text style={styles.expandHeaderTitle}>
                JSON de la transacción
              </Text>
              <Text style={styles.expandChevron}>
                {jsonExpanded ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
            {jsonExpanded ? (
              <View
                style={styles.expandBody}
                testID="failed-payment-json-body">
                <Text style={styles.jsonText} selectable>
                  {formatRawJsonForDisplay(record.rawJson)}
                </Text>
              </View>
            ) : null}
          </View>

          {canRetryOrder ? (
            <TouchableOpacity
              style={[
                styles.retryButton,
                recoveryBusy ? styles.retryButtonDisabled : null,
              ]}
              onPress={() => setDialog({ kind: 'confirm' })}
              disabled={recoveryBusy}
              testID="failed-payment-retry-button">
              <Text style={styles.retryButtonText}>
                {recoveryBusy ? 'Enviando…' : 'Reintentar registro'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <KioskConfirmModal
        visible={dialog != null}
        title={dialogTitle}
        message={
          dialog?.kind === 'confirm' ? confirmMessage : (dialog?.message ?? '')
        }
        variant={dialog?.kind === 'confirm' ? 'confirm' : 'alert'}
        confirmLabel={recoveryBusy ? 'Enviando…' : 'Confirmar'}
        busy={recoveryBusy}
        onCancel={() => {
          if (dialog?.kind === 'confirm' && !recoveryBusy) {
            setDialog(null);
          }
        }}
        onConfirm={() => {
          void handleRetryOrder();
        }}
        onAccept={handleDialogClose}
        titleTestID="failed-payment-dialog-title"
        messageTestID="failed-payment-dialog-message"
        confirmTestID="failed-payment-retry-confirm-button"
        cancelTestID="failed-payment-retry-cancel-button"
        acceptTestID="failed-payment-result-modal-ok"
      />
    </KioskScreenLayout>
  );
}
