import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type OrderOutcomeSuccessCopy = {
  title: string;
  ticketPrinted: string;
  pickupInstructions: string;
  orderLabel: string;
  ticketSlotHint: string;
};

export type OrderOutcomeFiscalErrorCopy = {
  title: string;
  paymentOk: string;
  askCashier: string;
  callCashier: string;
};

export type OrderOutcomeDigitalTicketCopy = {
  title: string;
  subtitleLine1: string;
  subtitleLine2: string;
  mobileHint: string;
  orderPrefix: string;
  paymentCompleted: string;
};

export function useOrderOutcomeScreen() {
  const { t } = useTranslation('payment');

  const success = useMemo(
    (): OrderOutcomeSuccessCopy => ({
      title: t('outcome.success.title'),
      ticketPrinted: t('outcome.success.ticketPrinted'),
      pickupInstructions: t('outcome.success.pickupInstructions'),
      orderLabel: t('outcome.success.orderLabel'),
      ticketSlotHint: t('outcome.success.ticketSlotHint'),
    }),
    [t],
  );

  const fiscalError = useMemo(
    (): OrderOutcomeFiscalErrorCopy => ({
      title: t('outcome.fiscalError.title'),
      paymentOk: t('outcome.fiscalError.paymentOk'),
      askCashier: t('outcome.fiscalError.askCashier'),
      callCashier: t('outcome.fiscalError.callCashier'),
    }),
    [t],
  );

  const digitalTicket = useMemo(
    (): OrderOutcomeDigitalTicketCopy => ({
      title: t('outcome.digitalTicket.title'),
      subtitleLine1: t('outcome.digitalTicket.subtitleLine1'),
      subtitleLine2: t('outcome.digitalTicket.subtitleLine2'),
      mobileHint: t('outcome.digitalTicket.mobileHint'),
      orderPrefix: t('outcome.digitalTicket.orderPrefix'),
      paymentCompleted: t('outcome.digitalTicket.paymentCompleted'),
    }),
    [t],
  );

  return { success, fiscalError, digitalTicket };
}
