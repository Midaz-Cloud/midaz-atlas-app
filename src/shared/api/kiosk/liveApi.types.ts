/**
 * Types captured from live backend — see docs/KIOSK_DEVELOPER_GUIDE-UPDATED-2.md
 * Fixtures: `fixtures/live/*.response.json`
 */

/** POST /auth/kiosk/login */
export type KioskLoginRequestLive = {
  serialNumber: string;
  apiKey: string;
};

export type KioskLoginResponseLive = {
  accessToken: string;
};

/** GET /kiosk/config */
export type KioskAppearanceTranslationLive = {
  title?: string;
  subtitle?: string;
};

export type KioskConfigAppearanceLive = {
  title?: string;
  subtitle?: string;
  coverImage?: string | null;
  pickupImage?: string | null;
  inStoreImage?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  titleColor?: string | null;
  subtitleColor?: string | null;
  languages?: string[] | null;
  translations?: Record<string, KioskAppearanceTranslationLive> | null;
};

export type KioskConfigOrganizationLive = {
  name: string;
  legalName: string;
  rif: string;
  logo: string | null;
  primaryCurrency: string;
  declaresTaxes?: boolean;
  invoicingType?: string | null;
};

export type KioskExchangeRatesLive = {
  usd: number;
  eur: number;
  date: string;
};

export type KioskPagoMovilAccountLive = {
  bank: string;
  bankCode: string;
  phone: string;
  cedula: string;
  holder: string;
};

export type KioskOrderTypeOptionLive = {
  id?: string;
  label?: string;
  fulfillment?: string;
  image?: string | null;
  enabled?: boolean;
};

export type KioskConfigResponseLive = {
  id?: string;
  kioskDeviceId?: string;
  foodServiceEnabled?: boolean;
  tableFieldEnabled?: boolean;
  printQrEnabled?: boolean;
  comandaModel?: 'printed' | 'sent';
  enabledPaymentMethods?: string[];
  kioskInvoicingType?: string | null;
  appearance?: KioskConfigAppearanceLive;
  organization: KioskConfigOrganizationLive;
  orderTypes?: KioskOrderTypeOptionLive[] | null;
  pagoMovilAccount?: KioskPagoMovilAccountLive | null;
  exchangeRates?: KioskExchangeRatesLive | null;
  rates?: KioskExchangeRatesLive | null;
  createdAt?: string;
  updatedAt?: string;
};

/** GET /kiosk/products — root JSON array (not { data: [] }). */
export type KioskProductCategoryLive = {
  id: number;
  code: string;
  name: string;
  description: string;
  image: string | null;
  /** Some backends mirror product shape with `imageUrl`. */
  imageUrl?: string | null;
  isForSale: boolean;
  active: boolean;
  /**
   * Admin drag-and-drop order from panel (UPDATE-13 §4.1).
   * Lower = earlier in kiosk category tabs. Missing → treat as 0.
   */
  sortOrder?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type KioskModifierOptionLive = {
  id: string;
  name: string;
  additionalPrice: number;
  sortOrder: number;
  image?: string | null;
  imageUrl?: string | null;
  /** Ruta o URL de imagen de la opción (campo preferido del backend). */
  imgUrl?: string | null;
};

export type KioskModifierGroupLive = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  quotaFree: number;
  quotaFreeBySize: unknown | null;
  excessPrice: number;
  sortOrder: number;
  options: KioskModifierOptionLive[];
};

export type KioskProductTaxRateLive = {
  id: string;
  code: string;
  name: string;
  type: string;
  percentage: string;
  isDefault: boolean;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type KioskProductApiLive = {
  id: number;
  name: string;
  image: string | null;
  sku: string;
  description: string;
  /** Decimal string — price in organization primary currency. */
  price: string;
  /** Present when primaryCurrency !== VES — backend-calculated Bs price. */
  priceVES?: number;
  stock: number;
  minStock: number;
  /** Stock disponible (físico − reservas). UPDATE-12 */
  available?: number;
  isAvailable?: boolean;
  barcode: string | null;
  unit: string;
  imageUrl: string | null;
  productType: string;
  categoryId: number;
  organizationId: string;
  discountPercentage: string;
  discountType: string;
  discountAmount: string;
  isDiscount: boolean;
  taxRateId: string | null;
  isActive: boolean;
  isForSale: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string;
  category: KioskProductCategoryLive;
  taxRate: KioskProductTaxRateLive | null;
  modifierGroups?: KioskModifierGroupLive[];
};

export type KioskProductsResponseLive = KioskProductApiLive[];
