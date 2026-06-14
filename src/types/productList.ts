import type { Product } from './product';

export type ProductSortColumn = 'name' | 'price' | 'quantity' | 'status';

export type ProductSortDirection = 'asc' | 'desc';

export interface ProductSortRule {
  column: ProductSortColumn;
  direction: ProductSortDirection;
}

export type ProductStatusFilter = 'ok' | 'low' | 'out';

export interface ProductListQuery {
  search?: string;
  statuses?: ProductStatusFilter[];
  sort?: ProductSortRule[];
  page: number;
  pageSize: number;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
