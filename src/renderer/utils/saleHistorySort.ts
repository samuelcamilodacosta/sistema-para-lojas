import type { Sale } from '../../types/sale';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../types/sale';
import type {
  SaleHistorySortColumn,
  SaleHistorySortDirection,
  SaleHistorySortRule,
} from '../../types/saleHistory';

export type { SaleHistorySortColumn, SaleHistorySortDirection, SaleHistorySortRule };

export const DEFAULT_SALE_HISTORY_SORT: SaleHistorySortRule[] = [
  { column: 'date', direction: 'desc' },
];

function paymentLabel(method: PaymentMethod | ''): string {
  if (!method) {
    return '';
  }

  return PAYMENT_METHOD_LABELS[method];
}

function compareColumn(left: Sale, right: Sale, column: SaleHistorySortColumn): number {
  switch (column) {
    case 'product':
      return left.productName.localeCompare(right.productName, 'pt-BR');
    case 'customer':
      return left.customerName.localeCompare(right.customerName, 'pt-BR');
    case 'payment':
      return paymentLabel(left.paymentMethod).localeCompare(
        paymentLabel(right.paymentMethod),
        'pt-BR',
      );
    case 'quantity':
      return left.quantity - right.quantity;
    case 'total':
      return left.total - right.total;
    case 'date':
    default:
      return left.soldAt.localeCompare(right.soldAt) || left.id.localeCompare(right.id);
  }
}

export function sortSaleHistory(
  sales: Sale[],
  rules: SaleHistorySortRule[],
): Sale[] {
  const activeRules = rules.length > 0 ? rules : DEFAULT_SALE_HISTORY_SORT;

  return [...sales].sort((left, right) => {
    for (const rule of activeRules) {
      const result = compareColumn(left, right, rule.column);

      if (result !== 0) {
        return rule.direction === 'asc' ? result : -result;
      }
    }

    return 0;
  });
}

export function cycleSaleHistorySortRule(
  rules: SaleHistorySortRule[],
  column: SaleHistorySortColumn,
): SaleHistorySortRule[] {
  const index = rules.findIndex((rule) => rule.column === column);

  if (index === -1) {
    return [{ column, direction: column === 'date' ? 'desc' : 'asc' }];
  }

  const current = rules[index];

  if (current.direction === 'asc') {
    return rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, direction: 'desc' } : rule,
    );
  }

  const nextRules = rules.filter((_, ruleIndex) => ruleIndex !== index);
  return nextRules.length > 0
    ? nextRules
    : cloneSaleHistorySortRules(DEFAULT_SALE_HISTORY_SORT);
}

export function cloneSaleHistorySortRules(
  rules: SaleHistorySortRule[],
): SaleHistorySortRule[] {
  return rules.map((rule) => ({ ...rule }));
}
