import type { PaymentAccountDetailsPanelProps } from './PaymentAccountDetailsPanel';
import { PaymentAccountDetailsPanel } from './PaymentAccountDetailsPanel';

export type PaymentMobileDetailsProps = {
  bankLabel: string;
  bank: string;
  phoneLabel: string;
  phone: string;
  rifLabel: string;
  rif: string;
  holderLabel?: string;
  holder?: string;
  qrCodeUri?: string | null;
  loadingQr?: boolean;
};

/** Datos pago móvil (Figma 48:13). */
export function PaymentMobileDetails({
  bankLabel,
  bank,
  phoneLabel,
  phone,
  rifLabel,
  rif,
  holderLabel,
  holder,
  qrCodeUri,
  loadingQr,
}: PaymentMobileDetailsProps) {
  const fields: PaymentAccountDetailsPanelProps['fields'] = [
    { label: bankLabel, value: bank, testID: 'payment-mobile-bank' },
    { label: phoneLabel, value: phone, testID: 'payment-mobile-phone' },
    { label: rifLabel, value: rif, testID: 'payment-mobile-rif' },
  ];

  if (holder?.trim() && holderLabel) {
    fields.push({
      label: holderLabel,
      value: holder,
      testID: 'payment-mobile-holder',
    });
  }

  return (
    <PaymentAccountDetailsPanel
      fields={fields}
      compact
      testID="payment-mobile-details"
      qrCodeUri={qrCodeUri}
      loadingQr={loadingQr}
    />
  );
}
