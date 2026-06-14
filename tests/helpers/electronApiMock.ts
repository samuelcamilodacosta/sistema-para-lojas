import { vi } from 'vitest';
import type { Product } from '../../src/types/product';
import type { ProductListResult } from '../../src/types/productList';
import type {
  RegisterSaleBatchResult,
  Sale,
  SalesChartData,
  SalesChartQuery,
  SalesSummary,
} from '../../src/types/sale';
import type { DashboardAnalytics } from '../../src/types/dashboard';
import type { StockEntry, StockEntrySummary } from '../../src/types/stockEntry';
import type { StockHistoryListResult } from '../../src/types/stockHistory';

export function createElectronApiMock() {
  return {
    products: {
      list: vi.fn<() => Promise<Product[]>>(async () => []),
      listPage: vi.fn<() => Promise<ProductListResult>>(async () => ({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      })),
      create: vi.fn(),
      update: vi.fn(),
      adjustStock: vi.fn(),
      remove: vi.fn(),
    },
    sales: {
      register: vi.fn(),
      registerBatch: vi.fn<() => Promise<RegisterSaleBatchResult>>(),
      list: vi.fn<() => Promise<Sale[]>>(async () => []),
      summary: vi.fn<() => Promise<SalesSummary>>(async () => ({
        totalSales: 0,
        totalRevenue: 0,
        todaySales: 0,
        todayRevenue: 0,
      })),
      listHistory: vi.fn(async () => ({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
        filteredRevenue: 0,
      })),
      chart: vi.fn<(query: SalesChartQuery) => Promise<SalesChartData>>(async (query) => ({
        period: query.period,
        dateFrom: query.dateFrom ?? '2026-06-07',
        dateTo: query.dateTo ?? '2026-06-13',
        points: [{ label: 'A', revenue: 10, salesCount: 1 }],
        totalRevenue: 10,
        totalSales: 1,
      })),
      dashboard: vi.fn<(query: SalesChartQuery) => Promise<DashboardAnalytics>>(
        async (query) => ({
          period: query.period,
          dateFrom: query.dateFrom ?? '2026-06-07',
          dateTo: query.dateTo ?? '2026-06-13',
          today: {
            sales: 1,
            revenue: 10,
            ticketAverage: 10,
            salesChangePercent: null,
            revenueChangePercent: null,
          },
          periodComparison: {
            salesChangePercent: null,
            revenueChangePercent: null,
          },
          topProducts: [
            {
              productId: 'p1',
              productName: 'Produto',
              quantitySold: 1,
              revenue: 10,
            },
          ],
          paymentMethods: [
            {
              method: 'pix' as const,
              label: 'Pix',
              count: 1,
              revenue: 10,
            },
          ],
        }),
      ),
    },
    stockEntries: {
      register: vi.fn(),
      list: vi.fn<() => Promise<StockEntry[]>>(async () => []),
      summary: vi.fn<() => Promise<StockEntrySummary>>(async () => ({
        totalEntries: 0,
        totalItemsAdded: 0,
        monthEntries: 0,
        monthItemsAdded: 0,
      })),
      listHistory: vi.fn<() => Promise<StockHistoryListResult>>(async () => ({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      })),
    },
  };
}
