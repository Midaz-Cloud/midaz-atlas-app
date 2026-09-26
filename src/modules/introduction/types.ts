export type IntroductionStep =
  | 'home'
  | 'language'
  | 'orderType'
  | 'admin'
  | 'failedPayments'
  | 'failedPaymentDetail'
  | 'pendingSync';

export type OrderType = 'dineIn' | 'takeOut';
