import { ipcMain } from 'electron';
import type { StockEntryService } from '../services/stockEntryService';
import type { CreateStockEntryInput } from '../types/stockEntry';
import type { StockHistoryListQuery } from '../types/stockHistory';

export function registerStockEntryHandlers(service: StockEntryService): void {
  ipcMain.handle('stockEntries:register', (_event, input: CreateStockEntryInput) =>
    service.register(input),
  );

  ipcMain.handle('stockEntries:list', () => service.list());

  ipcMain.handle('stockEntries:summary', () => service.getSummary());

  ipcMain.handle('stockEntries:listHistory', (_event, query: StockHistoryListQuery) =>
    service.listHistory(query),
  );
}
