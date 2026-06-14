import { contextBridge, ipcRenderer } from 'electron';
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

contextBridge.exposeInMainWorld('electronAPI', {
  products: {
    list: (): Promise<Product[]> => ipcRenderer.invoke('products:list'),
    listPage: (query: ProductListQuery): Promise<ProductListResult> =>
      ipcRenderer.invoke('products:listPage', query),
    create: (input: CreateProductInput): Promise<Product> =>
      ipcRenderer.invoke('products:create', input),
    update: (input: UpdateProductInput): Promise<Product> =>
      ipcRenderer.invoke('products:update', input),
    adjustStock: (input: AdjustStockInput): Promise<Product> =>
      ipcRenderer.invoke('products:adjustStock', input),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('products:remove', id),
  },
  sales: {
    register: (input: CreateSaleInput): Promise<Sale> =>
      ipcRenderer.invoke('sales:register', input),
    registerBatch: (input: CreateSaleBatchInput): Promise<RegisterSaleBatchResult> =>
      ipcRenderer.invoke('sales:registerBatch', input),
    list: (): Promise<Sale[]> => ipcRenderer.invoke('sales:list'),
    summary: (): Promise<SalesSummary> => ipcRenderer.invoke('sales:summary'),
    listHistory: (query: SaleHistoryListQuery): Promise<SaleHistoryListResult> =>
      ipcRenderer.invoke('sales:listHistory', query),
    chart: (query: SalesChartQuery): Promise<SalesChartData> =>
      ipcRenderer.invoke('sales:chart', query),
    dashboard: (query: SalesChartQuery): Promise<DashboardAnalytics> =>
      ipcRenderer.invoke('sales:dashboard', query),
  },
  stockEntries: {
    register: (input: CreateStockEntryInput): Promise<StockEntry> =>
      ipcRenderer.invoke('stockEntries:register', input),
    list: (): Promise<StockEntry[]> => ipcRenderer.invoke('stockEntries:list'),
    summary: (): Promise<StockEntrySummary> =>
      ipcRenderer.invoke('stockEntries:summary'),
    listHistory: (query: StockHistoryListQuery): Promise<StockHistoryListResult> =>
      ipcRenderer.invoke('stockEntries:listHistory', query),
  },
});
