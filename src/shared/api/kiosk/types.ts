export type PaymentMethodApi =
  | 'debito'
  | 'credito'
  | 'pago_movil'
  | 'efectivo'
  | 'efectivo_ves';

// DINE_IN existe en el backend desde siempre; el kiosko no lo usaba hasta que el
// panel dejó configurar los tipos de pedido a mano.
export type FulfillmentType = 'IN_STORE' | 'DINE_IN' | 'PICKUP' | 'DELIVERY';

/**
 * Opción del selector de tipo de pedido, configurada por sucursal desde el panel.
 * `label` es libre; `fulfillment` es lo que viaja en la orden.
 */
export type KioskOrderTypeOption = {
  id: string;
  label: string;
  fulfillment: FulfillmentType;
  image?: string | null;
  enabled: boolean;
};

export type KioskLoginRequest = {
  serialNumber: string;
  apiKey: string;
};

export type KioskLoginResponse = {
  accessToken: string;
};

export type KioskAppearanceTranslation = {
  title?: string;
  subtitle?: string;
};

export type KioskConfigAppearance = {
  primaryColor: string;
  secondaryColor: string;
  title: string;
  subtitle: string;
  coverImage: string | null;
  pickupImage?: string | null;
  inStoreImage?: string | null;
  titleColor?: string | null;
  subtitleColor?: string | null;
  languages?: string[] | null;
  translations?: Record<string, KioskAppearanceTranslation> | null;
};

export type KioskConfigOrganization = {
  name: string;
  legalName: string;
  rif: string;
  logo: string | null;
  primaryCurrency: string;
  declaresTaxes?: boolean;
  invoicingType?: string | null;
};

export type KioskExchangeRates = {
  usd: number;
  eur: number;
  date: string;
};

/** Destination account for mobile payments (GET /kiosk/config). */
export type KioskPagoMovilAccount = {
  bank: string;
  bankCode: string;
  phone: string;
  cedula: string;
  holder: string;
};

export type KioskConfigResponse = {
  id: string;
  kioskDeviceId: string;
  foodServiceEnabled: boolean;
  tableFieldEnabled: boolean;
  printQrEnabled: boolean;
  comandaModel: 'printed' | 'sent';
  enabledPaymentMethods: PaymentMethodApi[];
  kioskInvoicingType?: string | null;
  /** `null` = el kiosko usa el par de fábrica (Comer aquí / Para llevar). */
  orderTypes: KioskOrderTypeOption[] | null;
  appearance: KioskConfigAppearance;
  organization: KioskConfigOrganization;
  pagoMovilAccount: KioskPagoMovilAccount | null;
  exchangeRates: KioskExchangeRates | null;
};

export type KioskProductModifierOption = {
  id: string;
  name: string;
  additionalPrice: number;
  sortOrder: number;
};

export type KioskProductModifierGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  quotaFree: number;
  quotaFreeBySize: unknown | null;
  excessPrice: number;
  sortOrder: number;
  options: KioskProductModifierOption[];
};

export type KioskProductApi = {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  price: number;
  priceVES?: number;
  category: string;
  categoryCode?: string;
  /** Admin category order from `category.sortOrder` (UPDATE-13 §4.1). */
  categorySortOrder?: number;
  /** Relative path from `product.category.image` (UPDATE-7 §8). */
  categoryImage?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  isForSale: boolean;
  stock: number;
  /** Stock disponible (alias de stock con reservas descontadas). UPDATE-12 */
  available?: number;
  /** true si available > 0. UPDATE-12 */
  isAvailable?: boolean;
  taxRate: number;
  isExempt: boolean;
  modifierGroups?: KioskProductModifierGroup[];
};

export type KioskProductsResponse = {
  data: KioskProductApi[];
};

export type KioskProductsFetchResult = {
  products: KioskProductsResponse;
  etag: string | null;
  notModified: boolean;
};

export type CartReserveItemRequest = {
  productId: number;
  quantity: number;
};

export type CartReserveRequest = {
  items: CartReserveItemRequest[];
  ttlMinutes?: number;
};

export type CartReserveItemResult = {
  productId: string;
  reserved: boolean;
  availableQuantity: number;
  requested: number;
  /**
   * Precio unitario congelado por el server al reservar (price lock). Es el número
   * con el que se va a emitir la factura, así que el cobro debe usar ESTE y no el
   * del catálogo local, que puede estar hasta 60 s desactualizado.
   */
  unitPrice?: number | null;
};

export type CartReserveResponse = {
  reservationId: string | null;
  allReserved: boolean;
  items: CartReserveItemResult[];
};

export type KioskOrderModifierSelection = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  quantity: number;
  priceDelta: number;
};

export type KioskOrderItemSelections = {
  sizeId?: string;
  sizeName?: string;
  modifiers?: KioskOrderModifierSelection[];
};

export type KioskOrderItemRequest = {
  productId: number;
  quantity: number;
  taxRate: number;
  isExempt: boolean;
  notes?: string;
  selections?: KioskOrderItemSelections;
};

export type KioskCustomerApi = {
  id: number;
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type RegisterKioskCustomerRequest = {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type KioskBank = {
  code: string;
  name: string;
};

export type ValidateMobilePaymentRequest = {
  bankCode: string;
  reference: string;
  cedula: string;
  phone: string;
  amountVES?: string;
  fechaPago?: string;
};

export type ValidateMobilePaymentResponse = {
  success: boolean;
  status: string;
  disglobalRef: string | null;
  message: string;
  bankResponse?: Record<string, unknown> | null;
};

/** POS terminal payload for POST /kiosk/orders (UPDATE-7). */
export type KioskPosResponse = {
  responseCode: string;
  responseMessage: string;
  referenceNumber: string;
  traceNumber: string;
  RRN: string;
  terminalID: string;
  deviceSerial: string;
  merchantID: string;
  accountType: number;
  batchNum: string;
  amount: string;
  referenceNo?: string;
};

export type CreateKioskOrderRequest = {
  items: KioskOrderItemRequest[];
  fulfillmentType: FulfillmentType;
  tableNumber?: string;
  notes?: string;
  paymentMethod: PaymentMethodApi;
  customerId?: number;
  /** UUID from POST /kiosk/cart/reserve (UPDATE-12). */
  reservationId?: string;
  /** Required when paymentMethod is pago_movil (after validate-payment). */
  bankCode?: string;
  reference?: string;
  cedula?: string;
  phone?: string;
  /** Required when paymentMethod is debito or credito (after POS approval). */
  posResponse?: KioskPosResponse;
  cardType?: string;
  cardHolder?: string;
  /**
   * Entero HkaApp `issuedInvoiceNumber`. Solo cuando el kiosco ya emitió en PP9+.
   * No pad, no `invoiceData`, no COO.
   */
  fiscalInvoiceNumber?: number;
};

export type KioskOrderTaxBreakdownItem = {
  taxRate: number;
  taxAmount: number;
  baseAmount: number;
  description: string;
};

export type CreateKioskOrderResponse = {
  id: number;
  displayOrderNumber: string;
  /**
   * Código corto de comanda para tracking (UPDATE-13).
   * QR: `https://<dominio>/track/<shortCode>`
   */
  shortCode?: string | null;
  orderNumber?: number;
  status: string;
  grandTotalVES: number;
  grandTotalCurrency: number;
  currencyCode: string;
  exchangeRate: number;
  taxBreakdown?: KioskOrderTaxBreakdownItem[];
  kioskDeviceId?: string;
};

export type KioskConfigFetchResult = {
  config: KioskConfigResponse;
  etag: string | null;
  /** `true` cuando el server respondió 304 y `config` sale del caché local. */
  notModified: boolean;
};

/** POS settlement payload from N620 SDK (POST /kiosk/settlement settlementData). */
export type KioskSettlementData = {
  CreditBatchNo?: string;
  DebitBatchNo?: string;
  ExtraBatchNo?: string;
  totalCreditCardSale?: string;
  totalDebitCardSale?: string;
  totalExtraSale?: string;
  totalCreditCardRefund?: string;
  totalDebitCardRefund?: string;
  totalExtraRefund?: string;
  responseCode?: string;
  responseMessage?: string;
  terminalID?: string;
  merchantID?: string;
  deviceSerial?: string;
  date?: string;
  time?: string;
  traceNumber?: string;
  referenceNumber?: string;
};

export type KioskSettlementRequest = {
  settlementId?: string;
  success: boolean;
  timestamp?: string;
  error?: string;
  settlementData?: KioskSettlementData;
  posSerial?: string;
};

export type KioskSettlementResponse = {
  settlementId: string;
  posSerial: string;
  branchId?: string;
  success?: boolean;
  processedBy?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type KioskZReportRequest = {
  data: Record<string, string>;
  fiscalMachineSerial: string;
};

export type KioskZReportResponse = {
  id?: string;
  [key: string]: unknown;
};
