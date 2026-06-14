import type { StockEntry } from '../../types/stockEntry';

export type DateSortOrder = 'asc' | 'desc';

function toDateKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function matchesDateRange(
  isoDate: string,
  dateFrom: string,
  dateTo: string,
): boolean {
  const dateKey = toDateKey(isoDate);

  if (dateFrom && dateKey < dateFrom) {
    return false;
  }

  if (dateTo && dateKey > dateTo) {
    return false;
  }

  return true;
}

export function isInvalidDateRange(dateFrom: string, dateTo: string): boolean {
  return Boolean(dateFrom && dateTo && dateFrom > dateTo);
}

export function sortByDate(
  entries: StockEntry[],
  order: DateSortOrder,
): StockEntry[] {
  return [...entries].sort((left, right) => {
    const diff =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

    return order === 'asc' ? diff : -diff;
  });
}
