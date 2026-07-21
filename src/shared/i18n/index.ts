import './i18n';

export { default as i18n } from './i18n';
export { SessionLocaleProvider } from './SessionLocaleProvider';
export { useSessionLocale } from './useSessionLocale';
export type { AppLocale, AppNamespace } from './types';
export { APP_LOCALES } from './types';
export {
  resolveKioskLanguagePolicy,
  type KioskLanguagePolicy,
} from './resolveKioskLanguagePolicy';
