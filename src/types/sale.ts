export type PaymentMethod = 'pix' | 'dinheiro' | 'debito_credito';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  debito_credito: 'Débito/Crédito',
};

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  productBarcode: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  soldAt: string;
  customerName: string;
  paymentMethod: PaymentMethod | '';
}

export interface CreateSaleInput {
  productId: string;
  quantity: number;
  discount?: number;
  customerName?: string;
  paymentMethod: PaymentMethod;
}

export interface CreateSaleLineInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateSaleBatchInput {
  items: CreateSaleLineInput[];
  orderDiscount?: number;
  customerName?: string;
  paymentMethod: PaymentMethod;
}

export interface RegisterSaleBatchResult {
  sales: Sale[];
  total: number;
}

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  todaySales: number;
  todayRevenue: number;
}

export type SalesChartPeriod = 'day' | 'week' | 'month' | 'year';

export interface SalesChartQuery {
  period: SalesChartPeriod;
  dateFrom?: string;
  dateTo?: string;
}

export interface SalesChartPoint {
  label: string;
  revenue: number;
  salesCount: number;
}

export interface SalesChartData {
  period: SalesChartPeriod;
  dateFrom: string;
  dateTo: string;
  points: SalesChartPoint[];
  totalRevenue: number;
  totalSales: number;
}
