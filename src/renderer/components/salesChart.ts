import Chart from 'chart.js/auto';
import type { SalesChartPeriod, SalesChartQuery } from '../../types/sale';
import { getDefaultChartRange, isInvalidChartDateRange } from '../../utils/chartDateRange';
import { buildDualAxisOptions, createBarGradient } from '../utils/chartOptions';
import { PERIOD_CHART_THEMES } from '../utils/chartPalette';
import {
  formatDisplayDate,
  formatMonthYear,
  getTodayDateKey,
  parseDateKey,
} from '../../utils/dateKey';
import { onLocaleChange, t } from '../i18n';
import { formatCompactCurrency, formatCurrency } from '../utils/format';

const canvas = document.getElementById('sales-chart') as HTMLCanvasElement;
const periodTotalEl = document.getElementById('chart-period-total') as HTMLElement;
const periodSalesEl = document.getElementById('chart-period-sales') as HTMLElement;
const periodTicketEl = document.getElementById('chart-period-ticket') as HTMLElement;
const dateFromInput = document.getElementById('chart-date-from') as HTMLInputElement;
const dateToInput = document.getElementById('chart-date-to') as HTMLInputElement;

let chart: Chart | null = null;
let currentPeriod: SalesChartPeriod = 'week';
let currentDateFrom = getDefaultChartRange('week').dateFrom;
let currentDateTo = getDefaultChartRange('week').dateTo;
let onQueryChange: ((query: SalesChartQuery) => void) | null = null;

function destroyChart(): void {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

function buildBarColors(revenues: number[], themeBar: string): string[] {
  const max = Math.max(...revenues, 0);

  return revenues.map((value) =>
    value === max && max > 0 ? 'rgba(45, 212, 191, 0.95)' : themeBar,
  );
}

function buildRangeLabel(dateFrom: string, dateTo: string): string {
  const sameDay = dateFrom === dateTo;
  const fromDisplay = formatDisplayDate(dateFrom);
  const toDisplay = formatDisplayDate(dateTo);

  return sameDay
    ? toDisplay
    : t('charts.subtitle.rangeConnector', { from: fromDisplay, to: toDisplay });
}

function buildPeriodSubtitle(
  period: SalesChartPeriod,
  dateFrom: string,
  dateTo: string,
): string {
  const sameDay = dateFrom === dateTo;
  const fromDisplay = formatDisplayDate(dateFrom);
  const toDisplay = formatDisplayDate(dateTo);

  if (period === 'day' && sameDay) {
    const isToday = dateTo === getTodayDateKey();

    return isToday
      ? t('charts.subtitle.todayHourly')
      : t('charts.subtitle.dateHourly', { date: toDisplay });
  }

  if (period === 'year') {
    return sameDay
      ? t('charts.subtitle.yearSingleMonth', { date: toDisplay })
      : t('charts.subtitle.yearRange', { from: fromDisplay, to: toDisplay });
  }

  if (period === 'month') {
    const fromDate = parseDateKey(dateFrom);
    const toDate = parseDateKey(dateTo);

    if (
      fromDate &&
      toDate &&
      fromDate.getMonth() === toDate.getMonth() &&
      fromDate.getFullYear() === toDate.getFullYear()
    ) {
      return t('charts.subtitle.monthSingle', { monthYear: formatMonthYear(toDate) });
    }

    return t('charts.subtitle.monthRange', { from: fromDisplay, to: toDisplay });
  }

  const rangeLabel = buildRangeLabel(dateFrom, dateTo);

  if (period === 'day') {
    return t('charts.subtitle.dayRange', { range: rangeLabel });
  }

  return t('charts.subtitle.dailyTrend', { range: rangeLabel });
}

function getCurrentQuery(): SalesChartQuery {
  return {
    period: currentPeriod,
    dateFrom: currentDateFrom,
    dateTo: currentDateTo,
  };
}

function syncDateInputs(): void {
  const todayKey = getTodayDateKey();

  dateFromInput.value = currentDateFrom;
  dateToInput.value = currentDateTo;
  dateFromInput.max = todayKey;
  dateToInput.max = todayKey;
}

function syncPeriodControls(): void {
  document.querySelectorAll('[data-chart-period]').forEach((element) => {
    const buttonPeriod = element.getAttribute('data-chart-period') as SalesChartPeriod;
    const isActive = buttonPeriod === currentPeriod;

    element.classList.toggle('active', isActive);
    element.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  syncDateInputs();
}

function applyDefaultRangeForPeriod(period: SalesChartPeriod): void {
  const range = getDefaultChartRange(period, currentDateTo);
  currentDateFrom = range.dateFrom;
  currentDateTo = range.dateTo;
}

function handleDateInputChange(): void {
  if (!dateFromInput.value || !dateToInput.value) {
    syncDateInputs();
    return;
  }

  currentDateFrom = dateFromInput.value;
  currentDateTo = dateToInput.value;
  void loadSalesChart(getCurrentQuery());
}

function renderInvalidDateRange(): void {
  destroyChart();
  periodTotalEl.textContent = formatCurrency(0);
  periodSalesEl.textContent = '0';
  periodTicketEl.textContent = formatCurrency(0);

  const subtitle = document.getElementById('chart-period-subtitle');

  if (subtitle) {
    subtitle.textContent = t('common.invalidDateRange');
  }
}

export function setSalesChartPeriodListener(listener: (query: SalesChartQuery) => void): void {
  onQueryChange = listener;
}

export function initSalesChart(): void {
  syncDateInputs();

  document.querySelectorAll('[data-chart-period]').forEach((element) => {
    element.addEventListener('click', () => {
      const period = element.getAttribute('data-chart-period') as SalesChartPeriod;
      applyDefaultRangeForPeriod(period);
      void loadSalesChart({ period, dateFrom: currentDateFrom, dateTo: currentDateTo });
    });
  });

  dateFromInput.addEventListener('change', handleDateInputChange);
  dateToInput.addEventListener('change', handleDateInputChange);

  onLocaleChange(() => {
    void loadSalesChart(getCurrentQuery());
  });
}

export async function loadSalesChart(query: SalesChartQuery = getCurrentQuery()): Promise<void> {
  currentPeriod = query.period;
  currentDateFrom = query.dateFrom ?? currentDateFrom;
  currentDateTo = query.dateTo ?? currentDateTo;
  syncPeriodControls();

  if (isInvalidChartDateRange(currentDateFrom, currentDateTo)) {
    renderInvalidDateRange();
    onQueryChange?.(getCurrentQuery());
    return;
  }

  const data = await window.electronAPI.sales.chart(getCurrentQuery());
  currentDateFrom = data.dateFrom;
  currentDateTo = data.dateTo;
  syncDateInputs();

  const theme = PERIOD_CHART_THEMES[currentPeriod];
  const revenues = data.points.map((point) => point.revenue);
  const salesCounts = data.points.map((point) => point.salesCount);
  const ticketAverage = data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0;

  periodTotalEl.textContent = formatCurrency(data.totalRevenue);
  periodSalesEl.textContent = String(data.totalSales);
  periodTicketEl.textContent = formatCurrency(ticketAverage);

  destroyChart();

  const baseOptions = buildDualAxisOptions(
    currentPeriod,
    (value) => formatCompactCurrency(value),
    (value) => String(Math.round(value)),
  );

  chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.points.map((point) => point.label),
      datasets: [
        {
          type: 'bar',
          label: t('charts.dataset.revenue'),
          data: revenues,
          yAxisID: 'y',
          backgroundColor: (context) => {
            const index = context.dataIndex;
            const colors = buildBarColors(revenues, theme.bar);

            if (colors[index] !== theme.bar) {
              return colors[index];
            }

            return createBarGradient(
              context.chart,
              'rgba(20, 184, 166, 0.35)',
              'rgba(45, 212, 191, 0.92)',
            );
          },
          borderColor: theme.barBorder,
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
          order: 2,
        },
        {
          type: 'line',
          label: t('charts.dataset.salesCount'),
          data: salesCounts,
          yAxisID: 'y1',
          borderColor: '#a5b4fc',
          backgroundColor: 'rgba(129, 140, 248, 0.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#a5b4fc',
          pointBorderColor: '#0f141d',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: true,
          order: 1,
        },
      ],
    },
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          callbacks: {
            afterTitle: (items) => {
              const index = items[0]?.dataIndex ?? 0;
              const point = data.points[index];

              if (!point || point.salesCount <= 0) {
                return '';
              }

              const ticket = point.revenue / point.salesCount;
              return t('charts.tooltip.ticketAverage', { value: formatCurrency(ticket) });
            },
            label: (context) => {
              if (context.datasetIndex === 0) {
                return t('charts.tooltip.revenue', {
                  value: formatCurrency(context.parsed.y ?? 0),
                });
              }

              return t('charts.tooltip.sales', { count: String(context.parsed.y ?? 0) });
            },
          },
        },
      },
    },
  });

  const subtitle = document.getElementById('chart-period-subtitle');

  if (subtitle) {
    subtitle.textContent = buildPeriodSubtitle(currentPeriod, data.dateFrom, data.dateTo);
  }

  onQueryChange?.(getCurrentQuery());
}

export function getCurrentChartPeriod(): SalesChartPeriod {
  return currentPeriod;
}

export function getCurrentChartQuery(): SalesChartQuery {
  return getCurrentQuery();
}
