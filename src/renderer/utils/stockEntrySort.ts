import type { StockEntry } from '../../types/stockEntry';
import type {
  StockEntrySortColumn,
  StockEntrySortDirection,
  StockEntrySortRule,
} from '../../types/stockHistory';

export type { StockEntrySortColumn, StockEntrySortDirection, StockEntrySortRule };

export const DEFAULT_STOCK_ENTRY_SORT: StockEntrySortRule[] = [
  { column: 'date', direction: 'desc' },
];

function compareColumn(
  left: StockEntry,
  right: StockEntry,
  column: StockEntrySortColumn,
): number {
  switch (column) {
    case 'name':
      return left.productName.localeCompare(right.productName, 'pt-BR');
    case 'quantity':
      return left.quantity - right.quantity;
    case 'date':
    default:
      return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  }
}

export function sortStockEntries(
  entries: StockEntry[],
  rules: StockEntrySortRule[],
): StockEntry[] {
  const activeRules = rules.length > 0 ? rules : DEFAULT_STOCK_ENTRY_SORT;

  return [...entries].sort((left, right) => {
    for (const rule of activeRules) {
      const result = compareColumn(left, right, rule.column);

      if (result !== 0) {
        return rule.direction === 'asc' ? result : -result;
      }
    }

    return 0;
  });
}

export function cycleStockEntrySortRule(
  rules: StockEntrySortRule[],
  column: StockEntrySortColumn,
): StockEntrySortRule[] {
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
    : cloneStockEntrySortRules(DEFAULT_STOCK_ENTRY_SORT);
}

export function cloneStockEntrySortRules(
  rules: StockEntrySortRule[],
): StockEntrySortRule[] {
  return rules.map((rule) => ({ ...rule }));
}
