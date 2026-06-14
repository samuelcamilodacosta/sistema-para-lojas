import type { Product } from '../../types/product';
import type { ProductStatusFilter } from '../../types/productList';
import { getProductStatusKey } from './stock';
import {
  cloneSortRules,
  DEFAULT_PRODUCT_SORT,
  sortProducts,
} from './productSort';
import type { ProductSortRule } from '../../types/productList';

export type { ProductStatusFilter };

export interface ProductListFilters {
  search: string;
  statuses: ProductStatusFilter[];
  sort: ProductSortRule[];
}

export function createDefaultProductFilters(): ProductListFilters {
  return {
    search: '',
    statuses: [],
    sort: cloneSortRules(DEFAULT_PRODUCT_SORT),
  };
}

export function filterProducts(
  products: Product[],
  filters: ProductListFilters,
): Product[] {
  const query = filters.search.trim().toLowerCase();

  return products.filter((product) => {
    if (query) {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query);

      if (!matchesSearch) {
        return false;
      }
    }

    if (filters.statuses.length > 0) {
      const status = getProductStatusKey(product.quantity);
      if (!filters.statuses.includes(status)) {
        return false;
      }
    }

    return true;
  });
}

export function applyProductListFilters(
  products: Product[],
  filters: ProductListFilters,
): Product[] {
  return sortProducts(filterProducts(products, filters), filters.sort);
}

export function hasActiveProductListFilters(filters: ProductListFilters): boolean {
  return filters.search.trim().length > 0 || filters.statuses.length > 0;
}
