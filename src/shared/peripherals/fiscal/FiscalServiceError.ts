export class FiscalServiceError extends Error {
  readonly httpStatus?: number;

  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = 'FiscalServiceError';
    this.httpStatus = httpStatus;
  }
}
