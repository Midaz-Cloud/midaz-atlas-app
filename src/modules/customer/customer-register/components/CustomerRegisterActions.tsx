import { View } from 'react-native';

import { PaymentPrimaryCta } from '@modules/payment/components';

import { customerFlowLayoutStyles } from '../../theme/customerFlowLayout';

export type CustomerRegisterActionsProps = {
  submitLabel: string;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: () => void;
};

export function CustomerRegisterActions({
  submitLabel,
  canSubmit,
  isSubmitting = false,
  onSubmit,
}: CustomerRegisterActionsProps) {
  return (
    <View style={customerFlowLayoutStyles.registerActions} testID="customer-register-actions">
      <PaymentPrimaryCta
        label={submitLabel}
        disabled={!canSubmit || isSubmitting}
        onPress={onSubmit}
        testID="customer-register-submit"
      />
    </View>
  );
}
