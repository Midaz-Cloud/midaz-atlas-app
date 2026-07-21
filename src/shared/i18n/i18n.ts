import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { kioskConfig } from '@shared/config/kiosk';

import enCommon from './locales/en/common.json';
import enIntroduction from './locales/en/introduction.json';
import enOrdering from './locales/en/ordering.json';
import enCustomer from './locales/en/customer.json';
import enLocator from './locales/en/locator.json';
import enPayment from './locales/en/payment.json';
import esCommon from './locales/es/common.json';
import esCustomer from './locales/es/customer.json';
import esIntroduction from './locales/es/introduction.json';
import esLocator from './locales/es/locator.json';
import esOrdering from './locales/es/ordering.json';
import esPayment from './locales/es/payment.json';
import enSession from './locales/en/session.json';
import esSession from './locales/es/session.json';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: kioskConfig.defaultLocale,
  fallbackLng: kioskConfig.defaultLocale,
  supportedLngs: [...kioskConfig.supportedLocales],
  ns: ['common', 'introduction', 'ordering', 'payment', 'customer', 'locator', 'session'],
  defaultNS: 'common',
  resources: {
    es: {
      common: esCommon,
      introduction: esIntroduction,
      ordering: esOrdering,
      payment: esPayment,
      customer: esCustomer,
      locator: esLocator,
      session: esSession,
    },
    en: {
      common: enCommon,
      introduction: enIntroduction,
      ordering: enOrdering,
      payment: enPayment,
      customer: enCustomer,
      locator: enLocator,
      session: enSession,
    },
  },
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
