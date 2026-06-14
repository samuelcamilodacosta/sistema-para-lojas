import type { PaymentMethod, Sale } from '../../types/sale';
import { isInvalidDateRange, matchesDateRange } from './stockHistoryFilters';
import type {
  SaleHistorySortRule,
} from '../../types/saleHistory';
import {
  cloneSaleHistorySortRules,
  DEFAULT_SALE_HISTORY_SORT,
  sortSaleHistory,
} from './saleHistorySort';
import { formatPaymentMethod } from './payment';

export type SaleHistoryPaymentFilter = PaymentMethod;

export interface SaleHistoryFilters {
  search: string;
  payments: SaleHistoryPaymentFilter[];
  dateFrom: string;
  dateTo: string;
  sort: SaleHistorySortRule[];
}

export function createDefaultSaleHistoryFilters(): SaleHistoryFilters {
  return {
    search: '',
    payments: [],
    dateFrom: '',
    dateTo: '',
    sort: cloneSaleHistorySortRules(DEFAULT_SALE_HISTORY_SORT),
  };
}

export function filterSales(sales: Sale[], filters: SaleHistoryFilters): Sale[] {
  const query = filters.search.trim().toLowerCase();

  return sales.filter((sale) => {
    if (!matchesDateRange(sale.soldAt, filters.dateFrom, filters.dateTo)) {
      return false;
    }

    if (filters.payments.length > 0) {
      if (!sale.paymentMethod || !filters.payments.includes(sale.paymentMethod)) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    return (
      sale.productName.toLowerCase().includes(query) ||
      sale.productBarcode.toLowerCase().includes(query) ||
      sale.customerName.toLowerCase().includes(query) ||
      formatPaymentMethod(sale.paymentMethod).toLowerCase().includes(query)
    );
  });
}

export function applySaleHistoryFilters(
  sales: Sale[],
  filters: SaleHistoryFilters,
): Sale[] {
  return sortSaleHistory(filterSales(sales, filters), filters.sort);
}

export function hasActiveSaleHistoryFilters(filters: SaleHistoryFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.payments.length > 0 ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo)
  );
}

export { isInvalidDateRange };
