export type IntroductionStep =
  | 'home'
  | 'language'
  | 'orderType'
  | 'admin'
  | 'failedPayments'
  | 'failedPaymentDetail'
  | 'pendingSync'
  | 'deviceHealth';

export type OrderType = 'dineIn' | 'takeOut';
