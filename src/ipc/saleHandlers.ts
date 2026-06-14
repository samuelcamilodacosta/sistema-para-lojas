import { ipcMain } from 'electron';
import type { SaleService } from '../services/saleService';
import type { CreateSaleBatchInput, CreateSaleInput, SalesChartQuery } from '../types/sale';
import type { SaleHistoryListQuery } from '../types/saleHistory';

export function registerSaleHandlers(service: SaleService): void {
  ipcMain.handle('sales:register', (_event, input: CreateSaleInput) =>
    service.register(input),
  );

  ipcMain.handle('sales:registerBatch', (_event, input: CreateSaleBatchInput) =>
    service.registerBatch(input),
  );

  ipcMain.handle('sales:list', () => service.list());

  ipcMain.handle('sales:summary', () => service.getSummary());

  ipcMain.handle('sales:listHistory', (_event, query: SaleHistoryListQuery) =>
    service.listHistory(query),
  );

  ipcMain.handle('sales:chart', (_event, query: SalesChartQuery) =>
    service.getChartData(query),
  );

  ipcMain.handle('sales:dashboard', (_event, query: SalesChartQuery) =>
    service.getDashboardAnalytics(query),
  );
}
