import type { Product } from '../../types/product';
import type {
  ProductSortColumn,
  ProductSortDirection,
  ProductSortRule,
} from '../../types/productList';
import { getProductStatusKey } from './stock';

export type { ProductSortColumn, ProductSortDirection, ProductSortRule };

export const DEFAULT_PRODUCT_SORT: ProductSortRule[] = [
  { column: 'name', direction: 'asc' },
];

function getStatusPriority(quantity: number): number {
  const key = getProductStatusKey(quantity);

  if (key === 'out') {
    return 0;
  }

  if (key === 'low') {
    return 1;
  }

  return 2;
}

function compareColumn(
  left: Product,
  right: Product,
  column: ProductSortColumn,
): number {
  switch (column) {
    case 'price':
      return left.price - right.price;
    case 'quantity':
      return left.quantity - right.quantity;
    case 'status':
      return (
        getStatusPriority(left.quantity) - getStatusPriority(right.quantity) ||
        left.quantity - right.quantity
      );
    case 'name':
    default:
      return left.name.localeCompare(right.name, 'pt-BR');
  }
}

export function sortProducts(
  products: Product[],
  rules: ProductSortRule[],
): Product[] {
  const activeRules = rules.length > 0 ? rules : DEFAULT_PRODUCT_SORT;

  return [...products].sort((left, right) => {
    for (const rule of activeRules) {
      const result = compareColumn(left, right, rule.column);

      if (result !== 0) {
        return rule.direction === 'asc' ? result : -result;
      }
    }

    return 0;
  });
}

export function cycleSortRule(
  rules: ProductSortRule[],
  column: ProductSortColumn,
): ProductSortRule[] {
  const index = rules.findIndex((rule) => rule.column === column);

  if (index === -1) {
    return [...rules, { column, direction: 'asc' }];
  }

  const current = rules[index];

  if (current.direction === 'asc') {
    return rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, direction: 'desc' } : rule,
    );
  }

  return rules.filter((_, ruleIndex) => ruleIndex !== index);
}

export function cloneSortRules(rules: ProductSortRule[]): ProductSortRule[] {
  return rules.map((rule) => ({ ...rule }));
}
