import { t } from '../i18n';

export const LOW_STOCK_THRESHOLD = 5;

export type ProductStatusKey = 'ok' | 'low' | 'out';

export interface StockStatus {
  label: string;
  className: string;
  key: ProductStatusKey;
}

export function getProductStatusKey(quantity: number): ProductStatusKey {
  if (quantity === 0) {
    return 'out';
  }

  if (quantity <= LOW_STOCK_THRESHOLD) {
    return 'low';
  }

  return 'ok';
}

export function getStockStatus(quantity: number): StockStatus {
  const key = getProductStatusKey(quantity);

  return {
    key,
    className: key === 'out' ? 'status-out' : key === 'low' ? 'status-low' : 'status-ok',
    label: t(`stockStatus.${key}`),
  };
}
