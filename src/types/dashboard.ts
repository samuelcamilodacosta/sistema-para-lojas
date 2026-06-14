import type { PaymentMethod, SalesChartPeriod } from './sale';

export interface TodayDashboardMetrics {
  sales: number;
  revenue: number;
  ticketAverage: number;
  salesChangePercent: number | null;
  revenueChangePercent: number | null;
}

export interface PeriodComparison {
  revenueChangePercent: number | null;
  salesChangePercent: number | null;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface PaymentMethodItem {
  method: PaymentMethod | '';
  label: string;
  count: number;
  revenue: number;
}

export interface DashboardAnalytics {
  period: SalesChartPeriod;
  dateFrom: string;
  dateTo: string;
  today: TodayDashboardMetrics;
  periodComparison: PeriodComparison;
  topProducts: TopProductItem[];
  paymentMethods: PaymentMethodItem[];
}
