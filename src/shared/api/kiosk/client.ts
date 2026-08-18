import type {
  CartReserveRequest,
  CartReserveResponse,
  CreateKioskOrderRequest,
  CreateKioskOrderResponse,
  KioskBank,
  KioskConfigFetchResult,
  KioskCustomerApi,
  KioskLoginRequest,
  KioskLoginResponse,
  KioskProductsFetchResult,
  KioskSettlementRequest,
  KioskSettlementResponse,
  KioskZReportRequest,
  KioskZReportResponse,
  RegisterKioskCustomerRequest,
  ValidateMobilePaymentRequest,
  ValidateMobilePaymentResponse,
} from './types';

export interface KioskApiClient {
  login(request: KioskLoginRequest): Promise<KioskLoginResponse>;
  getConfig(ifNoneMatch?: string | null): Promise<KioskConfigFetchResult>;
  getProducts(ifNoneMatch?: string | null): Promise<KioskProductsFetchResult>;
  reserveCart(request: CartReserveRequest): Promise<CartReserveResponse>;
  getBanks(): Promise<KioskBank[]>;
  validateMobilePayment(
    request: ValidateMobilePaymentRequest,
  ): Promise<ValidateMobilePaymentResponse>;
  findCustomerByDocument(documentId: string): Promise<KioskCustomerApi>;
  registerCustomer(request: RegisterKioskCustomerRequest): Promise<KioskCustomerApi>;
  createOrder(request: CreateKioskOrderRequest): Promise<CreateKioskOrderResponse>;
  submitSettlement(request: KioskSettlementRequest): Promise<KioskSettlementResponse>;
  submitZReport(request: KioskZReportRequest): Promise<KioskZReportResponse>;
}
