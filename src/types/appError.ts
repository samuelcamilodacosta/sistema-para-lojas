export const APP_ERROR_CODES = {
  PRODUCT_NAME_REQUIRED: 'PRODUCT_NAME_REQUIRED',
  PRODUCT_PRICE_NEGATIVE: 'PRODUCT_PRICE_NEGATIVE',
  PRODUCT_QUANTITY_NEGATIVE: 'PRODUCT_QUANTITY_NEGATIVE',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_DUPLICATE_BARCODE: 'PRODUCT_DUPLICATE_BARCODE',
  STOCK_ENTRY_INVALID_QUANTITY: 'STOCK_ENTRY_INVALID_QUANTITY',
  STOCK_ENTRY_INVALID_ADJUSTMENT: 'STOCK_ENTRY_INVALID_ADJUSTMENT',
  STOCK_ENTRY_INSUFFICIENT: 'STOCK_ENTRY_INSUFFICIENT',
  SALE_INVALID_PAYMENT_METHOD: 'SALE_INVALID_PAYMENT_METHOD',
  SALE_INVALID_QUANTITY: 'SALE_INVALID_QUANTITY',
  SALE_DISCOUNT_NEGATIVE: 'SALE_DISCOUNT_NEGATIVE',
  SALE_INSUFFICIENT_STOCK: 'SALE_INSUFFICIENT_STOCK',
  SALE_INSUFFICIENT_STOCK_NAMED: 'SALE_INSUFFICIENT_STOCK_NAMED',
  SALE_DISCOUNT_EXCEEDS_SUBTOTAL: 'SALE_DISCOUNT_EXCEEDS_SUBTOTAL',
  SALE_LINE_DISCOUNT_EXCEEDS_SUBTOTAL: 'SALE_LINE_DISCOUNT_EXCEEDS_SUBTOTAL',
  SALE_EMPTY_CART: 'SALE_EMPTY_CART',
  SALE_BATCH_INVALID_QUANTITY: 'SALE_BATCH_INVALID_QUANTITY',
  SALE_ORDER_DISCOUNT_EXCEEDS_SUBTOTAL: 'SALE_ORDER_DISCOUNT_EXCEEDS_SUBTOTAL',
  SALE_ORDER_DISCOUNT_APPLY_FAILED: 'SALE_ORDER_DISCOUNT_APPLY_FAILED',
} as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];

const ERROR_PREFIX = 'APP_ERROR:';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly params?: Record<string, string | number>;

  constructor(code: AppErrorCode, params?: Record<string, string | number>) {
    super(formatAppErrorMessage(code, params));
    this.name = 'AppError';
    this.code = code;
    this.params = params;
  }
}

export function formatAppErrorMessage(
  code: AppErrorCode,
  params?: Record<string, string | number>,
): string {
  if (!params || Object.keys(params).length === 0) {
    return `${ERROR_PREFIX}${code}`;
  }

  return `${ERROR_PREFIX}${code}:${JSON.stringify(params)}`;
}

export function parseAppErrorMessage(
  message: string,
): { code: AppErrorCode; params?: Record<string, string | number> } | null {
  if (!message.startsWith(ERROR_PREFIX)) {
    return null;
  }

  const payload = message.slice(ERROR_PREFIX.length);
  const separatorIndex = payload.indexOf(':');

  if (separatorIndex === -1) {
    return { code: payload as AppErrorCode };
  }

  const code = payload.slice(0, separatorIndex) as AppErrorCode;
  const paramsRaw = payload.slice(separatorIndex + 1);

  try {
    const params = JSON.parse(paramsRaw) as Record<string, string | number>;
    return { code, params };
  } catch {
    return { code };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
