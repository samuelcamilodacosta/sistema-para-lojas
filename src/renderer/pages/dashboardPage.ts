import { loadDashboardCharts } from '../components/dashboardCharts';
import {
  getCurrentChartQuery,
  initSalesChart,
  loadSalesChart,
  setSalesChartPeriodListener,
} from '../components/salesChart';
import type { DashboardAnalytics } from '../../types/dashboard';
import type { SalesChartQuery } from '../../types/sale';
import { onLocaleChange, t } from '../i18n';
import { productState } from '../state/productState';
import { saleState } from '../state/saleState';
import { getPeriodCompareLabel } from '../utils/chartOptions';
import { escapeHtml } from '../utils/dom';
import { formatCurrency, formatPercentChange } from '../utils/format';
import { getProductStatusKey, getStockStatus } from '../utils/stock';

const screen = document.getElementById('screen-dashboard') as HTMLElement;
const todayRevenueEl = document.getElementById('dash-today-revenue') as HTMLElement;
const todaySalesEl = document.getElementById('dash-today-sales') as HTMLElement;
const ticketAverageEl = document.getElementById('dash-ticket-average') as HTMLElement;
const stockValueEl = document.getElementById('dash-total-value') as HTMLElement;
const revenueDeltaEl = document.getElementById('dash-revenue-delta') as HTMLElement;
const salesDeltaEl = document.getElementById('dash-sales-delta') as HTMLElement;
const periodInsightTextEl = document.getElementById('dash-period-insight-text') as HTMLElement;
const periodRevenueDeltaEl = document.getElementById('chart-period-revenue-delta') as HTMLElement;
const stockAlertsListEl = document.getElementById('dash-stock-alerts') as HTMLUListElement;
const stockAlertsEmptyEl = document.getElementById('dash-stock-alerts-empty') as HTMLElement;
const stockAlertsMoreEl = document.getElementById('dash-stock-alerts-more') as HTMLElement;

const MAX_STOCK_ALERTS = 5;

function isDashboardActive(): boolean {
  return screen.classList.contains('active');
}

function applyDeltaBadge(element: HTMLElement, value: number | null): void {
  element.textContent = formatPercentChange(value);
  element.classList.remove('dash-kpi-delta-up', 'dash-kpi-delta-down', 'dash-kpi-delta-neutral');

  if (value === null || !Number.isFinite(value) || value === 0) {
    element.classList.add('dash-kpi-delta-neutral');
    return;
  }

  element.classList.add(value > 0 ? 'dash-kpi-delta-up' : 'dash-kpi-delta-down');
}

function buildPeriodInsight(period: SalesChartQuery['period'], analytics: DashboardAnalytics): string {
  const compareLabel = getPeriodCompareLabel(period);
  const revenueChange = analytics.periodComparison.revenueChangePercent;
  const salesChange = analytics.periodComparison.salesChangePercent;

  if (revenueChange === null && salesChange === null) {
    return t('dashboard.insight.noHistory', { period: compareLabel });
  }

  const revenueText =
    revenueChange === null
      ? t('dashboard.insight.revenueNoBaseline')
      : revenueChange >= 0
        ? t('dashboard.insight.revenueUp', {
            value: formatPercentChange(revenueChange).replace('+', ''),
          })
        : t('dashboard.insight.revenueDown', { value: formatPercentChange(revenueChange) });

  const salesText =
    salesChange === null
      ? t('dashboard.insight.volumeStable')
      : salesChange >= 0
        ? t('dashboard.insight.volumeUp', {
            value: formatPercentChange(salesChange).replace('+', ''),
          })
        : t('dashboard.insight.volumeDown', { value: formatPercentChange(salesChange) });

  return t('dashboard.insight.comparedWith', {
    period: compareLabel,
    revenue: revenueText,
    volume: salesText,
  });
}

function renderTodayKpis(analytics: DashboardAnalytics): void {
  todayRevenueEl.textContent = formatCurrency(analytics.today.revenue);
  todaySalesEl.textContent = String(analytics.today.sales);
  ticketAverageEl.textContent = formatCurrency(analytics.today.ticketAverage);
  applyDeltaBadge(revenueDeltaEl, analytics.today.revenueChangePercent);
  applyDeltaBadge(salesDeltaEl, analytics.today.salesChangePercent);
  applyDeltaBadge(periodRevenueDeltaEl, analytics.periodComparison.revenueChangePercent);
  periodInsightTextEl.innerHTML = buildPeriodInsight(analytics.period, analytics);
}

function renderStockAlerts(): void {
  const products = productState.getProducts();
  const allAlerts = products
    .filter((product) => getProductStatusKey(product.quantity) !== 'ok')
    .sort((left, right) => {
      const leftOut = left.quantity === 0 ? 0 : 1;
      const rightOut = right.quantity === 0 ? 0 : 1;

      if (leftOut !== rightOut) {
        return leftOut - rightOut;
      }

      return left.quantity - right.quantity;
    });

  const alerts = allAlerts.slice(0, MAX_STOCK_ALERTS);
  const hiddenCount = allAlerts.length - alerts.length;

  stockAlertsListEl.innerHTML = '';
  const hasAlerts = alerts.length > 0;

  stockAlertsEmptyEl.classList.toggle('hidden', hasAlerts);
  stockAlertsListEl.classList.toggle('hidden', !hasAlerts);
  stockAlertsMoreEl.classList.toggle('hidden', hiddenCount <= 0);

  if (hiddenCount > 0) {
    stockAlertsMoreEl.textContent =
      hiddenCount === 1
        ? t('dashboard.stockAlerts.more.one', { count: String(hiddenCount) })
        : t('dashboard.stockAlerts.more.other', { count: String(hiddenCount) });
  }

  for (const product of alerts) {
    const item = document.createElement('li');
    const status = getStockStatus(product.quantity);
    const isOut = product.quantity === 0;
    const badgeLabel = isOut
      ? t('dashboard.stockAlerts.badgeOut')
      : t('dashboard.stockAlerts.badgeLow');

    item.className = `dash-stock-alert ${isOut ? 'dash-stock-alert-out' : 'dash-stock-alert-low'}`;
    item.innerHTML = `
      <span class="dash-stock-alert-badge ${
        isOut ? 'dash-stock-alert-badge-out' : 'dash-stock-alert-badge-low'
      }" title="${escapeHtml(status.label)}">${badgeLabel}</span>
      <span class="dash-stock-alert-name">${escapeHtml(product.name)}</span>
      <span class="dash-stock-alert-qty">${t('dashboard.stockAlerts.quantity', { count: String(product.quantity) })}</span>
    `;

    stockAlertsListEl.appendChild(item);
  }
}

function renderProducts(): void {
  const products = productState.getProducts();
  const totalValue = products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );

  stockValueEl.textContent = formatCurrency(totalValue);
  renderStockAlerts();
}

async function renderDashboardAnalytics(query?: SalesChartQuery): Promise<void> {
  const activeQuery = query ?? getCurrentChartQuery();
  const analytics = await loadDashboardCharts(activeQuery);
  renderTodayKpis(analytics);
}

function renderSales(): void {
  void loadSalesChart(getCurrentChartQuery());
}

function refreshDashboardLocale(): void {
  if (!isDashboardActive()) {
    return;
  }

  renderProducts();
  void renderDashboardAnalytics();
  void loadSalesChart(getCurrentChartQuery());
}

export function initDashboardPage(): void {
  initSalesChart();

  setSalesChartPeriodListener((activeQuery) => {
    void renderDashboardAnalytics(activeQuery);
  });

  productState.subscribe(renderProducts);
  saleState.subscribe(() => {
    renderSales();
    void renderDashboardAnalytics();
  });

  onLocaleChange(refreshDashboardLocale);
}

export async function onEnterDashboardPage(): Promise<void> {
  await Promise.all([productState.refresh(), saleState.refresh()]);
  renderProducts();
  await loadSalesChart(getCurrentChartQuery());
  await renderDashboardAnalytics(getCurrentChartQuery());
}
