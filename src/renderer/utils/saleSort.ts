import type { Sale } from '../../types/sale';

export type RecentSaleSortColumn = 'date' | 'product';
export type RecentSaleSortDirection = 'asc' | 'desc';

export interface RecentSaleSortRule {
  column: RecentSaleSortColumn;
  direction: RecentSaleSortDirection;
}

export const DEFAULT_RECENT_SALE_SORT: RecentSaleSortRule[] = [
  { column: 'date', direction: 'desc' },
];

function compareColumn(left: Sale, right: Sale, column: RecentSaleSortColumn): number {
  if (column === 'date') {
    return left.soldAt.localeCompare(right.soldAt);
  }

  return left.productName.localeCompare(right.productName, 'pt-BR');
}

export function sortRecentSales(
  sales: Sale[],
  rules: RecentSaleSortRule[],
): Sale[] {
  const activeRules = rules.length > 0 ? rules : DEFAULT_RECENT_SALE_SORT;

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

export function cycleRecentSaleSortRule(
  rules: RecentSaleSortRule[],
  column: RecentSaleSortColumn,
): RecentSaleSortRule[] {
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
    : cloneRecentSaleSortRules(DEFAULT_RECENT_SALE_SORT);
}

export function cloneRecentSaleSortRules(
  rules: RecentSaleSortRule[],
): RecentSaleSortRule[] {
  return rules.map((rule) => ({ ...rule }));
}
