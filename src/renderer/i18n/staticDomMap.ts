import type { MessageKey } from './messages';
import { messages } from './messages';
import { getLocale } from '../settings/settings';

interface StaticDomTarget {
  selector: string;
  key: MessageKey;
  attr?: 'text' | 'placeholder' | 'aria-label';
}

function translateStatic(key: MessageKey): string {
  const locale = getLocale();
  return messages[locale][key] ?? messages.pt[key] ?? key;
}

const STATIC_DOM_TARGETS: StaticDomTarget[] = [
  { selector: '#screen-dashboard .dash-kpi-revenue .dash-kpi-label', key: 'dashboard.kpi.revenueToday' },
  { selector: '#screen-dashboard .dash-kpi-sales .dash-kpi-label', key: 'dashboard.kpi.salesToday' },
  { selector: '#screen-dashboard .dash-kpi-ticket .dash-kpi-label', key: 'dashboard.kpi.ticketAverageToday' },
  { selector: '#screen-dashboard .dash-kpi-stock .dash-kpi-label', key: 'dashboard.kpi.stockValue' },
  { selector: '#screen-dashboard .dash-kpi-revenue .dash-kpi-hint', key: 'dashboard.kpi.vsYesterday' },
  { selector: '#screen-dashboard .dash-kpi-sales .dash-kpi-hint', key: 'dashboard.kpi.vsYesterday' },
  { selector: '#screen-dashboard .dash-kpi-ticket .dash-kpi-hint', key: 'dashboard.kpi.perSale' },
  { selector: '#screen-dashboard .dash-kpi-stock .dash-kpi-hint', key: 'dashboard.kpi.immobilizedCapital' },
  { selector: '#dash-period-insight-text', key: 'dashboard.insight.loading' },
  { selector: '#screen-dashboard .dashboard-hero-panel h3', key: 'dashboard.chart.performanceTitle' },
  { selector: '#chart-period-subtitle', key: 'dashboard.chart.defaultSubtitle' },
  { selector: '[data-chart-period="day"]', key: 'dashboard.chart.period.day' },
  { selector: '[data-chart-period="week"]', key: 'dashboard.chart.period.week' },
  { selector: '[data-chart-period="month"]', key: 'dashboard.chart.period.month' },
  { selector: '[data-chart-period="year"]', key: 'dashboard.chart.period.year' },
  { selector: '.chart-date-picker-label:first-of-type', key: 'dashboard.chart.dateFrom' },
  { selector: '.chart-date-range-separator', key: 'dashboard.chart.dateSeparator' },
  { selector: '#chart-date-from', key: 'dashboard.chart.dateFromAria', attr: 'aria-label' },
  { selector: '#chart-date-to', key: 'dashboard.chart.dateToAria', attr: 'aria-label' },
  { selector: '#chart-period-total-label', key: 'dashboard.chart.kpi.periodRevenue' },
  { selector: '#chart-period-sales-label', key: 'dashboard.chart.kpi.periodSales' },
  { selector: '#chart-period-ticket-label', key: 'dashboard.chart.kpi.ticketAverage' },
  { selector: '#chart-period-revenue-delta-label', key: 'dashboard.chart.kpi.revenueChange' },
  { selector: '#dash-top-products-panel h3', key: 'dashboard.ranking.title' },
  { selector: '#dash-top-products-panel .chart-subtitle', key: 'dashboard.ranking.subtitle' },
  { selector: '#dash-payment-methods-panel h3', key: 'dashboard.paymentMix.title' },
  { selector: '#dash-payment-methods-panel .chart-subtitle', key: 'dashboard.paymentMix.subtitle' },
  { selector: '#dash-stock-alerts-panel h3', key: 'dashboard.stockAlerts.title' },
  { selector: '#dash-stock-alerts-panel .chart-subtitle', key: 'dashboard.stockAlerts.subtitle' },
  { selector: '#dash-stock-alerts-link', key: 'dashboard.stockAlerts.viewStock' },
  { selector: '#dash-stock-alerts-empty', key: 'dashboard.stockAlerts.empty' },
];

export function applyStaticDomTranslations(root: ParentNode = document): void {
  for (const target of STATIC_DOM_TARGETS) {
    const element = root.querySelector<HTMLElement>(target.selector);

    if (!element) {
      continue;
    }

    const value = translateStatic(target.key);

    if (target.attr === 'aria-label') {
      element.setAttribute('aria-label', value);
    } else if (target.attr === 'placeholder') {
      (element as HTMLInputElement).placeholder = value;
    } else {
      element.textContent = value;
    }
  }
}
