import type { SalesChartPeriod, SalesChartQuery } from '../types/sale';
import { clampReferenceDate, getTodayDateKey, parseDateKey, toDateKey } from './dateKey';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function getDefaultChartRange(
  period: SalesChartPeriod,
  anchorDateKey?: string,
): { dateFrom: string; dateTo: string } {
  const end = clampReferenceDate(anchorDateKey);
  const endKey = toDateKey(end);
  const todayKey = getTodayDateKey();

  if (period === 'day') {
    return { dateFrom: endKey, dateTo: endKey };
  }

  if (period === 'week') {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    return { dateFrom: toDateKey(start), dateTo: endKey };
  }

  if (period === 'month') {
    const year = end.getFullYear();
    const month = end.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthEndKey = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

    return {
      dateFrom: `${year}-${pad(month + 1)}-01`,
      dateTo: monthEndKey > todayKey ? todayKey : monthEndKey,
    };
  }

  const year = end.getFullYear();
  const yearEndKey = `${year}-12-31`;

  return {
    dateFrom: `${year}-01-01`,
    dateTo: yearEndKey > todayKey ? todayKey : yearEndKey,
  };
}

export function resolveChartDateRange(
  query: SalesChartQuery,
): { dateFrom: string; dateTo: string } {
  const todayKey = getTodayDateKey();
  const parsedFrom = query.dateFrom ? parseDateKey(query.dateFrom) : null;
  const parsedTo = query.dateTo ? parseDateKey(query.dateTo) : null;

  if (parsedFrom && parsedTo) {
    const end = clampReferenceDate(query.dateTo);
    let start = new Date(parsedFrom);
    start.setHours(12, 0, 0, 0);

    if (start > end) {
      return { dateFrom: toDateKey(end), dateTo: toDateKey(start) };
    }

    return { dateFrom: toDateKey(start), dateTo: toDateKey(end) };
  }

  if (parsedTo) {
    return getDefaultChartRange(query.period, toDateKey(clampReferenceDate(query.dateTo)));
  }

  if (parsedFrom) {
    const startKey = toDateKey(parsedFrom);
    const endKey = startKey > todayKey ? todayKey : startKey;

    return { dateFrom: startKey, dateTo: endKey };
  }

  return getDefaultChartRange(query.period);
}

export function getPreviousChartRange(
  dateFrom: string,
  dateTo: string,
): { dateFrom: string; dateTo: string } {
  const start = parseDateKey(dateFrom);
  const end = parseDateKey(dateTo);

  if (!start || !end) {
    return { dateFrom, dateTo };
  }

  const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (dayCount - 1));

  return {
    dateFrom: toDateKey(previousStart),
    dateTo: toDateKey(previousEnd),
  };
}

export function isInvalidChartDateRange(dateFrom: string, dateTo: string): boolean {
  const start = parseDateKey(dateFrom);
  const end = parseDateKey(dateTo);

  if (!start || !end) {
    return false;
  }

  return start > end;
}
