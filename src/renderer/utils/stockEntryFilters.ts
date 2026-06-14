import type { StockEntry } from '../../types/stockEntry';
import type { StockMovementFilter } from '../../types/stockHistory';
import {
  isInvalidDateRange,
  matchesDateRange,
} from './stockHistoryFilters';
import {
  cloneStockEntrySortRules,
  DEFAULT_STOCK_ENTRY_SORT,
  sortStockEntries,
} from './stockEntrySort';
import type { StockEntrySortRule } from '../../types/stockHistory';

export type { StockMovementFilter };

export interface StockHistoryFilters {
  search: string;
  movements: StockMovementFilter[];
  dateFrom: string;
  dateTo: string;
  sort: StockEntrySortRule[];
}

export function createDefaultStockHistoryFilters(): StockHistoryFilters {
  return {
    search: '',
    movements: [],
    dateFrom: '',
    dateTo: '',
    sort: cloneStockEntrySortRules(DEFAULT_STOCK_ENTRY_SORT),
  };
}

function matchesMovement(entry: StockEntry, movement: StockMovementFilter): boolean {
  if (movement === 'purchase') {
    return entry.quantity > 0 && entry.note !== 'Ajuste manual';
  }

  if (movement === 'adjustment') {
    return entry.note === 'Ajuste manual';
  }

  return entry.quantity < 0;
}

export function filterStockEntries(
  entries: StockEntry[],
  filters: StockHistoryFilters,
): StockEntry[] {
  const query = filters.search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (!matchesDateRange(entry.createdAt, filters.dateFrom, filters.dateTo)) {
      return false;
    }

    if (filters.movements.length > 0) {
      const matchesType = filters.movements.some((movement) =>
        matchesMovement(entry, movement),
      );

      if (!matchesType) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    return (
      entry.productName.toLowerCase().includes(query) ||
      entry.productBarcode.toLowerCase().includes(query) ||
      entry.note.toLowerCase().includes(query)
    );
  });
}

export function applyStockHistoryFilters(
  entries: StockEntry[],
  filters: StockHistoryFilters,
): StockEntry[] {
  return sortStockEntries(filterStockEntries(entries, filters), filters.sort);
}

export function hasActiveStockHistoryFilters(filters: StockHistoryFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.movements.length > 0 ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo)
  );
}

export { isInvalidDateRange };
