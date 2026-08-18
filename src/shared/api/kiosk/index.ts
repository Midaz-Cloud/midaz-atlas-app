export type { KioskApiClient } from './client';
export { createKioskApiClient, resetKioskApiClientForTests } from './factory';
export { KioskApiError } from './errors';
export { getUploadsUrl, resolveKioskImageUrl } from './imageUrl';
export * from './types';
export type {
  KioskLoginRequestLive,
  KioskLoginResponseLive,
  KioskConfigResponseLive,
  KioskConfigAppearanceLive,
  KioskConfigOrganizationLive,
  KioskPagoMovilAccountLive,
  KioskProductApiLive,
  KioskProductCategoryLive,
  KioskProductTaxRateLive,
  KioskProductsResponseLive,
} from './liveApi.types';
export type { KioskRuntimeConfig } from './mappers/config';
export { mapConfigToRuntime } from './mappers/config';
export {
  mapApiProductToMenuProduct,
  buildCategoriesFromProducts,
  mapSellableKioskApiProductsToCatalog,
  mapMenuProductToApiProduct,
  UNCATEGORIZED_SORT_ORDER,
} from './mappers/product';
export {
  resolveCategoryImageFromLive,
  mapLiveProductToKioskProductApi,
  mapLiveProductToMenuProduct,
  parseKioskProductsResponse,
} from './mappers/liveProduct';
export {
  mapLiveConfigToKioskConfigResponse,
  normalizeEnabledPaymentMethods,
  isLiveConfigShape,
} from './mappers/liveConfig';
export { logKioskCheckoutPayload } from './logKioskCheckoutPayload';
export { parseCartReserveResponse } from './mappers/parseCartReserveResponse';
export {
  isProductAvailableForSale,
  isProductSoldOut,
  resolveProductAvailable,
} from '@shared/catalog/productAvailability';
export type { ProductAvailabilityInput } from '@shared/catalog/productAvailability';
export { mapCartToCreateOrderRequest } from './mappers/order';
export { buildPosPaymentFromEcr } from './mappers/cardPaymentFromEcr';
export {
  buildSettlementFromEcr,
  toPersistableSettlementRequest,
} from './mappers/buildSettlementFromEcr';
export {
  isSettlementApprovedPlainText,
  salvageSettlementDataForPrint,
  extractSettlementReferenceFromRaw,
  extractDeviceSerialFromRaw,
} from './mappers/settlementApprovalPlainText';
export {
  parseEcrPaymentJson,
  parseEcrPaymentJsonHeuristic,
  sanitizeEcrRrn,
} from '@shared/peripherals/ecr/parseEcrPaymentJson';
export type { BuildPosPaymentFromEcrResult } from './mappers/cardPaymentFromEcr';
export { filterBanks, loadBanks, clearBanksCache } from './banksCache';
export {
  buildValidateMobilePaymentRequest,
  isValidateMobilePaymentSuccess,
  validateMobilePaymentWithApi,
} from './services/validateMobilePaymentService';
export type { BuildValidateMobilePaymentParams } from './services/validateMobilePaymentService';
export { lookupCustomerByDocument, registerKioskCustomer } from './services/customerService';
export type {
  LookupCustomerResult,
  RegisterCustomerResult,
  CustomerRegisterPrefill,
} from './services/customerService';
export {
  formatCnePersonName,
  lookupPrefillDisplayName,
  splitRegisterPrefillPhone,
} from './mappers/lookupCedula';
export {
  normalizeDocumentId,
  isValidDocumentId,
  isValidDocumentNumber,
  isValidDocumentNumberForType,
  parseDocumentId,
  composeDocumentId,
  calculateRifCheckDigit,
  getDocumentNumberMaxLength,
  getDocumentValidationI18nKey,
  DOCUMENT_NUMBER_LENGTH,
  CUSTOMER_DOCUMENT_MAX_LENGTH,
  CUSTOMER_DOCUMENT_NUMBER_MAX_LENGTH,
  CUSTOMER_DOCUMENT_TYPES,
  DEFAULT_CUSTOMER_DOCUMENT_TYPE,
} from './utils/documentId';
export type {
  CustomerDocumentType,
  DocumentValidationI18nKey,
} from './utils/documentId';
export {
  paymentMethodIdToApi,
  paymentMethodApiToUi,
  isPaymentMethodEnabledForApi,
} from './mappers/paymentMethod';
export {
  formatPagoMovilBankLine,
  mapPagoMovilAccountToDisplay,
  isPagoMovilAccountConfigured,
} from './pagoMovilAccount';
export type { PagoMovilDisplayFields } from './pagoMovilAccount';
export { mockPagoMovilAccount } from './mock/mockPagoMovilAccount';
export { orderTypeToFulfillment, fulfillmentToOrderType } from './mappers/fulfillment';
export {
  resolveEffectiveInvoicingType,
  shouldPrintFiscalZ,
} from './utils/invoicingType';
export type { KioskInvoicingType } from './utils/invoicingType';
export { mapCachedConfigBody, isLiveConfigCacheStale } from './configCache';
export {
  saveAccessToken,
  loadAccessToken,
  clearAccessToken,
  saveConfigEtag,
  loadConfigEtag,
  saveCachedConfigBody,
  loadCachedConfigBody,
  clearCachedKioskConfig,
  saveProductsEtag,
  loadProductsEtag,
  saveCachedProductsBody,
  loadCachedProductsBody,
  clearCachedKioskProducts,
  isMockKioskConfig,
  saveLastPosSerial,
  loadLastPosSerial,
} from './tokenStorage';
