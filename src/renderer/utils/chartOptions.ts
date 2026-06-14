import type { ChartOptions, Plugin } from 'chart.js';
import type { SalesChartPeriod } from '../../types/sale';
import { t, type MessageKey } from '../i18n';

export const CHART_FONT = {
  family: "'Segoe UI', system-ui, sans-serif",
  size: 11,
};

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function getChartColors() {
  return {
    grid: readCssVar('--color-chart-grid', 'rgba(71, 85, 105, 0.35)'),
    tick: readCssVar('--color-chart-tick', '#8b97a8'),
    legend: readCssVar('--color-chart-legend', '#cbd5e1'),
    tooltipBg: readCssVar('--color-chart-tooltip-bg', 'rgba(15, 23, 42, 0.96)'),
    tooltipBorder: readCssVar('--color-chart-tooltip-border', 'rgba(71, 85, 105, 0.6)'),
    tooltipTitle: readCssVar('--color-chart-tooltip-title', '#f8fafc'),
    tooltipBody: readCssVar('--color-chart-tooltip-body', '#cbd5e1'),
    doughnutMuted: readCssVar('--color-chart-doughnut-muted', '#94a3b8'),
    doughnutAccent: readCssVar('--color-chart-doughnut-accent', '#f8fafc'),
  };
}

export function getChartGrid() {
  return {
    color: getChartColors().grid,
    drawBorder: false,
  };
}

export function getChartTick() {
  return {
    color: getChartColors().tick,
    font: CHART_FONT,
  };
}

const PERIOD_COMPARE_KEYS: Record<SalesChartPeriod, MessageKey> = {
  day: 'charts.compare.yesterday',
  week: 'charts.compare.previousWeek',
  month: 'charts.compare.previousMonth',
  year: 'charts.compare.previousYear',
};

export function getPeriodCompareLabel(period: SalesChartPeriod): string {
  return t(PERIOD_COMPARE_KEYS[period]);
}

export function createBarGradient(
  chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } },
  from: string,
  to: string,
): string | CanvasGradient {
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return from;
  }

  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  return gradient;
}

export function buildDualAxisOptions(
  period: SalesChartPeriod,
  formatLeftTick: (value: number) => string,
  formatRightTick: (value: number) => string,
): ChartOptions<'bar' | 'line'> {
  const chartTick = getChartTick();
  const chartColors = getChartColors();

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: chartColors.legend,
          boxWidth: 10,
          boxHeight: 10,
          padding: 16,
          font: { ...CHART_FONT, size: 12, weight: '500' },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: chartColors.tooltipBg,
        borderColor: chartColors.tooltipBorder,
        borderWidth: 1,
        titleColor: chartColors.tooltipTitle,
        bodyColor: chartColors.tooltipBody,
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        ticks: {
          ...chartTick,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: period === 'month' ? 12 : period === 'day' ? 12 : undefined,
        },
        grid: {
          display: false,
        },
      },
      y: {
        position: 'left',
        beginAtZero: true,
        ticks: {
          ...chartTick,
          callback: (value) => formatLeftTick(Number(value)),
          maxTicksLimit: 6,
        },
        grid: getChartGrid(),
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        ticks: {
          ...chartTick,
          callback: (value) => formatRightTick(Number(value)),
          maxTicksLimit: 6,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
}

export function doughnutCenterPlugin(
  lines: string[],
  accentColor = getChartColors().doughnutAccent,
): Plugin<'doughnut'> {
  const mutedColor = getChartColors().doughnutMuted;

  return {
    id: 'doughnutCenter',
    beforeDraw(chart) {
      const meta = chart.getDatasetMeta(0);

      if (!meta.data.length) {
        return;
      }

      const { x, y } = meta.data[0];
      const { ctx } = chart;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = mutedColor;
      ctx.font = `500 11px ${CHART_FONT.family}`;
      ctx.fillText(lines[0] ?? '', x, y - 10);
      ctx.fillStyle = accentColor;
      ctx.font = `700 15px ${CHART_FONT.family}`;
      ctx.fillText(lines[1] ?? '', x, y + 10);
      ctx.restore();
    },
  };
}
