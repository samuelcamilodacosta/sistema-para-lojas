import type { StockEntry } from './stockEntry';

export type StockMovementFilter = 'purchase' | 'adjustment' | 'outbound';

export type StockEntrySortColumn = 'date' | 'name' | 'quantity';

export type StockEntrySortDirection = 'asc' | 'desc';

export interface StockEntrySortRule {
  column: StockEntrySortColumn;
  direction: StockEntrySortDirection;
}

export interface StockHistoryListQuery {
  search?: string;
  movements?: StockMovementFilter[];
  dateFrom?: string;
  dateTo?: string;
  sort?: StockEntrySortRule[];
  page: number;
  pageSize: number;
}

export interface StockHistoryListResult {
  items: StockEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
