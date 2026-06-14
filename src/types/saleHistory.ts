import type { PaymentMethod, Sale } from './sale';

export type SaleHistorySortColumn =
  | 'date'
  | 'product'
  | 'customer'
  | 'payment'
  | 'quantity'
  | 'total';

export type SaleHistorySortDirection = 'asc' | 'desc';

export interface SaleHistorySortRule {
  column: SaleHistorySortColumn;
  direction: SaleHistorySortDirection;
}

export interface SaleHistoryListQuery {
  search?: string;
  payments?: PaymentMethod[];
  dateFrom?: string;
  dateTo?: string;
  sort?: SaleHistorySortRule[];
  page: number;
  pageSize: number;
}

export interface SaleHistoryListResult {
  items: Sale[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filteredRevenue: number;
}
