import type {
  AdjustStockInput,
  CreateProductInput,
  Product,
  UpdateProductInput,
} from './types/product';
import type { ProductListQuery, ProductListResult } from './types/productList';
import type {
  CreateSaleBatchInput,
  CreateSaleInput,
  RegisterSaleBatchResult,
  Sale,
  SalesChartData,
  SalesChartQuery,
  SalesSummary,
} from './types/sale';
import type { DashboardAnalytics } from './types/dashboard';
import type { SaleHistoryListQuery, SaleHistoryListResult } from './types/saleHistory';
import type {
  CreateStockEntryInput,
  StockEntry,
  StockEntrySummary,
} from './types/stockEntry';
import type { StockHistoryListQuery, StockHistoryListResult } from './types/stockHistory';

export interface ElectronAPI {
  products: {
    list: () => Promise<Product[]>;
    listPage: (query: ProductListQuery) => Promise<ProductListResult>;
    create: (input: CreateProductInput) => Promise<Product>;
    update: (input: UpdateProductInput) => Promise<Product>;
    adjustStock: (input: AdjustStockInput) => Promise<Product>;
    remove: (id: string) => Promise<void>;
  };
  sales: {
    register: (input: CreateSaleInput) => Promise<Sale>;
    registerBatch: (input: CreateSaleBatchInput) => Promise<RegisterSaleBatchResult>;
    list: () => Promise<Sale[]>;
    summary: () => Promise<SalesSummary>;
    listHistory: (query: SaleHistoryListQuery) => Promise<SaleHistoryListResult>;
    chart: (query: SalesChartQuery) => Promise<SalesChartData>;
    dashboard: (query: SalesChartQuery) => Promise<DashboardAnalytics>;
  };
  stockEntries: {
    register: (input: CreateStockEntryInput) => Promise<StockEntry>;
    list: () => Promise<StockEntry[]>;
    summary: () => Promise<StockEntrySummary>;
    listHistory: (query: StockHistoryListQuery) => Promise<StockHistoryListResult>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
