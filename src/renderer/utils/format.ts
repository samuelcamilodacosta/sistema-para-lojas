import { getIntlLocale, t, translateError } from '../i18n';
import { parseAppErrorMessage } from '../../types/appError';

function createCurrencyFormatter(): Intl.NumberFormat {
  return new Intl.NumberFormat(getIntlLocale(), {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createDecimalFormatter(): Intl.NumberFormat {
  return new Intl.NumberFormat(getIntlLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createDateTimeFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function createShortDateTimeFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return createCurrencyFormatter().format(0);
  }

  return createCurrencyFormatter().format(value);
}

export function formatCompactCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return getIntlLocale() === 'en-US' ? 'R$ 0' : 'R$ 0';
  }

  const isEn = getIntlLocale() === 'en-US';

  if (Math.abs(value) >= 1_000_000) {
    const scaled = (value / 1_000_000).toFixed(1);
    return isEn ? `R$ ${scaled}M` : `R$ ${scaled.replace('.', ',')} mi`;
  }

  if (Math.abs(value) >= 1_000) {
    const scaled = (value / 1_000).toFixed(1);
    return isEn ? `R$ ${scaled}K` : `R$ ${scaled.replace('.', ',')} mil`;
  }

  return formatCurrency(value);
}

export function formatPercentChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  const formatted = value.toFixed(1);
  const localized = getIntlLocale() === 'en-US' ? formatted : formatted.replace('.', ',');
  return `${sign}${localized}%`;
}

export function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return createDecimalFormatter().format(0);
  }

  return createDecimalFormatter().format(value);
}

/** Valor monetário para campos de entrada (sem símbolo R$). */
export function formatDecimalInput(value: number): string {
  return formatDecimal(value);
}

export function parseDecimalInput(raw: string): number {
  const value = raw.trim().replace(/\s/g, '');

  if (!value) {
    return 0;
  }

  if (value.includes(',')) {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function readDecimalInput(input: HTMLInputElement): number {
  return parseDecimalInput(input.value);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (parseAppErrorMessage(error.message)) {
      return translateError(error, 'common.loadDataError');
    }

    return error.message;
  }

  return fallback;
}

export function formatDateTime(value: string): string {
  return createDateTimeFormatter().format(new Date(value));
}

export function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return createShortDateTimeFormatter().format(date);
}

export function formatPageInfo(page: number, totalPages: number): string {
  return t('common.pagination.pageInfo', {
    page: String(page),
    totalPages: String(totalPages),
  });
}

export function formatPageRange(start: number, end: number, total: number): string {
  return t('common.pagination.range', {
    start: String(start),
    end: String(end),
    total: String(total),
  });
}
