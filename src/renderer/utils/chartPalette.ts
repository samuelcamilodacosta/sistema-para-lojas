import type { SalesChartPeriod } from '../../types/sale';

export const CHART_PALETTE = [
  'rgba(20, 184, 166, 0.9)',
  'rgba(168, 85, 247, 0.9)',
  'rgba(56, 189, 248, 0.9)',
  'rgba(129, 140, 248, 0.9)',
  'rgba(244, 63, 94, 0.9)',
  'rgba(99, 102, 241, 0.9)',
  'rgba(34, 197, 94, 0.9)',
  'rgba(20, 184, 166, 0.9)',
];

export const CHART_BORDER_PALETTE = [
  'rgba(20, 184, 166, 1)',
  'rgba(168, 85, 247, 1)',
  'rgba(56, 189, 248, 1)',
  'rgba(129, 140, 248, 1)',
  'rgba(244, 63, 94, 1)',
  'rgba(99, 102, 241, 1)',
  'rgba(34, 197, 94, 1)',
  'rgba(20, 184, 166, 1)',
];

export interface PaymentChartStyle {
  fill: string;
  border: string;
  text: string;
}

export const PAYMENT_CHART_STYLES: Record<string, PaymentChartStyle> = {
  pix: {
    fill: '#14b8a6',
    border: '#2dd4bf',
    text: '#5eead4',
  },
  dinheiro: {
    fill: '#38bdf8',
    border: '#7dd3fc',
    text: '#bae6fd',
  },
  debito_credito: {
    fill: '#a78bfa',
    border: '#c4b5fd',
    text: '#ddd6fe',
  },
};

export const PAYMENT_COLORS: Record<string, string> = {
  pix: PAYMENT_CHART_STYLES.pix.fill,
  dinheiro: PAYMENT_CHART_STYLES.dinheiro.fill,
  debito_credito: PAYMENT_CHART_STYLES.debito_credito.fill,
};

export const PAYMENT_BORDER_COLORS: Record<string, string> = {
  pix: PAYMENT_CHART_STYLES.pix.border,
  dinheiro: PAYMENT_CHART_STYLES.dinheiro.border,
  debito_credito: PAYMENT_CHART_STYLES.debito_credito.border,
};

export function getPaymentChartStyle(method: string): PaymentChartStyle {
  return (
    PAYMENT_CHART_STYLES[method] ?? {
      fill: 'rgba(148, 163, 184, 0.9)',
      border: 'rgba(148, 163, 184, 1)',
      text: '#cbd5e1',
    }
  );
}

export interface PeriodChartTheme {
  border: string;
  background: string;
  color: string;
  bar: string;
  barBorder: string;
}

export const PERIOD_CHART_THEMES: Record<SalesChartPeriod, PeriodChartTheme> = {
  day: {
    border: 'rgba(45, 212, 191, 0.45)',
    background: 'rgba(45, 212, 191, 0.14)',
    color: '#99f6e4',
    bar: 'rgba(45, 212, 191, 0.82)',
    barBorder: 'rgba(45, 212, 191, 1)',
  },
  week: {
    border: 'rgba(20, 184, 166, 0.45)',
    background: 'rgba(20, 184, 166, 0.14)',
    color: '#5eead4',
    bar: 'rgba(20, 184, 166, 0.82)',
    barBorder: 'rgba(20, 184, 166, 1)',
  },
  month: {
    border: 'rgba(168, 85, 247, 0.45)',
    background: 'rgba(168, 85, 247, 0.14)',
    color: '#c4b5fd',
    bar: 'rgba(168, 85, 247, 0.82)',
    barBorder: 'rgba(168, 85, 247, 1)',
  },
  year: {
    border: 'rgba(34, 197, 94, 0.45)',
    background: 'rgba(34, 197, 94, 0.14)',
    color: '#86efac',
    bar: 'rgba(34, 197, 94, 0.82)',
    barBorder: 'rgba(34, 197, 94, 1)',
  },
};

export function getPaletteColors(count: number): string[] {
  return Array.from({ length: count }, (_, index) => CHART_PALETTE[index % CHART_PALETTE.length]);
}

export function getPaletteBorderColors(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => CHART_BORDER_PALETTE[index % CHART_BORDER_PALETTE.length],
  );
}

export function formatSharePercent(value: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}
