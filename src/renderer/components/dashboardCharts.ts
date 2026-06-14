import Chart from 'chart.js/auto';
import type { DashboardAnalytics } from '../../types/dashboard';
import type { SalesChartQuery } from '../../types/sale';
import { CHART_FONT, getChartColors, getChartGrid, getChartTick } from '../utils/chartOptions';
import {
  formatSharePercent,
  getPaletteBorderColors,
  getPaletteColors,
  getPaymentChartStyle,
} from '../utils/chartPalette';
import { t } from '../i18n';
import { formatCurrency } from '../utils/format';
import { escapeHtml } from '../utils/dom';

const topProductsCanvas = document.getElementById('top-products-chart') as HTMLCanvasElement;
const topProductsEmptyEl = document.getElementById('top-products-empty') as HTMLElement;
const paymentMethodsEmptyEl = document.getElementById('payment-methods-empty') as HTMLElement;
const paymentMethodsMixEl = document.getElementById('payment-methods-mix') as HTMLElement;
const topProductsRankingEl = document.getElementById('top-products-ranking') as HTMLElement;

let topProductsChart: Chart | null = null;

function destroyChart(chart: Chart | null): Chart | null {
  if (chart) {
    chart.destroy();
  }

  return null;
}

function truncateLabel(label: string, maxLength = 22): string {
  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1)}…`;
}

function renderTopProductsRanking(analytics: DashboardAnalytics): void {
  topProductsRankingEl.innerHTML = '';
  const hasData = analytics.topProducts.length > 0;

  topProductsRankingEl.classList.toggle('hidden', !hasData);

  analytics.topProducts.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'dashboard-ranking-item';
    row.innerHTML = `
      <span class="dashboard-ranking-pos">${index + 1}</span>
      <span class="dashboard-ranking-name">${escapeHtml(item.productName)}</span>
      <span class="dashboard-ranking-value">${formatCurrency(item.revenue)}</span>
    `;
    topProductsRankingEl.appendChild(row);
  });
}

export async function loadDashboardCharts(query: SalesChartQuery): Promise<DashboardAnalytics> {
  const analytics = await window.electronAPI.sales.dashboard(query);

  renderTopProductsChart(analytics);
  renderPaymentMethodsMix(analytics);
  renderTopProductsRanking(analytics);

  return analytics;
}

function renderTopProductsChart(analytics: DashboardAnalytics): void {
  topProductsChart = destroyChart(topProductsChart);

  const hasData = analytics.topProducts.length > 0;
  topProductsEmptyEl.classList.toggle('hidden', hasData);
  topProductsEmptyEl.textContent = t('dashboard.ranking.empty');
  topProductsCanvas.classList.toggle('hidden', !hasData);

  if (!hasData) {
    return;
  }

  const sorted = [...analytics.topProducts].sort((left, right) => left.revenue - right.revenue);
  const totalRevenue = sorted.reduce((sum, item) => sum + item.revenue, 0);
  const colors = getPaletteColors(sorted.length);
  const borders = getPaletteBorderColors(sorted.length);
  const chartColors = getChartColors();

  topProductsChart = new Chart(topProductsCanvas, {
    type: 'bar',
    data: {
      labels: sorted.map((item) => truncateLabel(item.productName)),
      datasets: [
        {
          label: t('charts.dataset.revenue'),
          data: sorted.map((item) => item.revenue),
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartColors.tooltipBg,
          borderColor: chartColors.tooltipBorder,
          borderWidth: 1,
          titleColor: chartColors.tooltipTitle,
          bodyColor: chartColors.tooltipBody,
          callbacks: {
            title: (items) => {
              const index = items[0]?.dataIndex ?? 0;
              return sorted[index]?.productName ?? '';
            },
            label: (context) => {
              const index = context.dataIndex;
              const item = sorted[index];

              if (!item) {
                return '';
              }

              return [
                t('charts.tooltip.topProductRevenue', {
                  value: formatCurrency(item.revenue),
                  share: formatSharePercent(item.revenue, totalRevenue),
                }),
                t('charts.tooltip.unitsSold', { count: String(item.quantitySold) }),
              ];
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            ...getChartTick(),
            callback: (value) => formatCurrency(Number(value)),
            maxTicksLimit: 5,
          },
          grid: getChartGrid(),
        },
        y: {
          ticks: {
            ...getChartTick(),
            font: { ...CHART_FONT, weight: '500' },
          },
          grid: { display: false },
        },
      },
    },
  });
}

function renderPaymentMethodsMix(analytics: DashboardAnalytics): void {
  paymentMethodsMixEl.innerHTML = '';

  const hasData = analytics.paymentMethods.length > 0;
  paymentMethodsEmptyEl.classList.toggle('hidden', hasData);
  paymentMethodsEmptyEl.textContent = t('dashboard.paymentMix.empty');
  paymentMethodsMixEl.classList.toggle('hidden', !hasData);

  if (!hasData) {
    return;
  }

  const items = [...analytics.paymentMethods].sort((left, right) => right.revenue - left.revenue);
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);

  const stack = document.createElement('div');
  stack.className = 'payment-mix-stack';
  stack.setAttribute('role', 'img');
  stack.setAttribute(
    'aria-label',
    t('dashboard.paymentMix.ariaChart', {
      items: items
        .map((item) => `${item.label} ${formatSharePercent(item.revenue, totalRevenue)}`)
        .join(', '),
    }),
  );

  for (const item of items) {
    const style = getPaymentChartStyle(item.method);
    const share = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
    const segment = document.createElement('div');

    segment.className = 'payment-mix-segment';
    segment.style.width = `${share}%`;
    segment.style.backgroundColor = style.fill;
    segment.title = `${item.label}: ${formatSharePercent(item.revenue, totalRevenue)}`;
    stack.appendChild(segment);
  }

  const rows = document.createElement('div');
  rows.className = 'payment-mix-rows';

  for (const item of items) {
    const style = getPaymentChartStyle(item.method);
    const sharePercent = formatSharePercent(item.revenue, totalRevenue);
    const shareWidth = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
    const row = document.createElement('div');

    row.className = 'payment-mix-row';
    row.innerHTML = `
      <div class="payment-mix-row-head">
        <span class="payment-mix-dot" style="background-color: ${style.fill}"></span>
        <span class="payment-mix-label">${escapeHtml(item.label)}</span>
        <span class="payment-mix-share">${sharePercent}</span>
        <span class="payment-mix-value">${formatCurrency(item.revenue)}</span>
      </div>
      <div class="payment-mix-track">
        <div class="payment-mix-fill" style="width: ${shareWidth}%; background-color: ${style.fill}"></div>
      </div>
      <span class="payment-mix-meta">${
        item.count === 1
          ? t('dashboard.paymentMix.saleCount.one', { count: String(item.count) })
          : t('dashboard.paymentMix.saleCount.other', { count: String(item.count) })
      }</span>
    `;
    rows.appendChild(row);
  }

  paymentMethodsMixEl.append(stack, rows);
}
