import { describe, expect, it, vi } from 'vitest';
import {
  clampReferenceDate,
  formatDisplayDate,
  formatMonthYear,
  getTodayDateKey,
  parseDateKey,
  toDateKey,
} from '../../src/utils/dateKey';

describe('dateKey utils', () => {
  it('converte Date para chave e vice-versa', () => {
    const date = new Date(2026, 5, 13, 15, 30);
    expect(toDateKey(date)).toBe('2026-06-13');
    expect(parseDateKey('2026-06-13')?.getDate()).toBe(13);
    expect(parseDateKey('2026-13-40')).toBeNull();
    expect(parseDateKey('invalid')).toBeNull();
  });

  it('limita data de referência ao dia atual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13, 12, 0, 0));

    expect(getTodayDateKey()).toBe('2026-06-13');
    expect(toDateKey(clampReferenceDate('2026-06-10'))).toBe('2026-06-10');
    expect(toDateKey(clampReferenceDate('2026-06-20'))).toBe('2026-06-13');
    expect(toDateKey(clampReferenceDate('invalid'))).toBe('2026-06-13');
    expect(toDateKey(clampReferenceDate())).toBe('2026-06-13');

    vi.useRealTimers();
  });

  it('formata datas para exibição', () => {
    expect(formatDisplayDate('2026-06-13')).toContain('2026');
    expect(formatDisplayDate('invalid')).toBe('invalid');
    expect(formatMonthYear(new Date(2026, 5, 1))).toMatch(/^Junho de 2026$/);
  });
});
