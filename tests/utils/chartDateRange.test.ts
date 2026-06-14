import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDefaultChartRange,
  getPreviousChartRange,
  isInvalidChartDateRange,
  resolveChartDateRange,
} from '../../src/utils/chartDateRange';

describe('chartDateRange utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gera intervalo padrão por período', () => {
    expect(getDefaultChartRange('day')).toEqual({
      dateFrom: '2026-06-13',
      dateTo: '2026-06-13',
    });

    expect(getDefaultChartRange('week')).toEqual({
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
    });

    expect(getDefaultChartRange('month')).toEqual({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-13',
    });

    expect(getDefaultChartRange('year')).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '2026-06-13',
    });
  });

  it('resolve intervalo informado e troca datas invertidas', () => {
    expect(
      resolveChartDateRange({
        period: 'week',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-10',
      }),
    ).toEqual({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-10',
    });

    expect(
      resolveChartDateRange({
        period: 'week',
        dateFrom: '2026-06-10',
        dateTo: '2026-06-01',
      }),
    ).toEqual({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-10',
    });
  });

  it('gera intervalo padrão para meses e anos passados', () => {
    expect(getDefaultChartRange('month', '2026-03-15')).toEqual({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    });

    expect(getDefaultChartRange('year', '2025-06-15')).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });
  });

  it('calcula intervalo anterior com mesma duração', () => {
    expect(getPreviousChartRange('2026-06-07', '2026-06-13')).toEqual({
      dateFrom: '2026-05-31',
      dateTo: '2026-06-06',
    });
  });

  it('valida intervalo inválido', () => {
    expect(isInvalidChartDateRange('2026-06-10', '2026-06-01')).toBe(true);
    expect(isInvalidChartDateRange('2026-06-01', '2026-06-10')).toBe(false);
    expect(isInvalidChartDateRange('invalid', '2026-06-01')).toBe(false);
  });

  it('resolve intervalo parcial e datas inválidas no período anterior', () => {
    expect(
      resolveChartDateRange({
        period: 'week',
        dateTo: '2026-06-10',
      }),
    ).toEqual({
      dateFrom: '2026-06-04',
      dateTo: '2026-06-10',
    });

    expect(
      resolveChartDateRange({
        period: 'day',
        dateFrom: '2026-06-20',
      }),
    ).toEqual({
      dateFrom: '2026-06-20',
      dateTo: '2026-06-13',
    });

    expect(getPreviousChartRange('invalid', '2026-06-01')).toEqual({
      dateFrom: 'invalid',
      dateTo: '2026-06-01',
    });
  });
});
