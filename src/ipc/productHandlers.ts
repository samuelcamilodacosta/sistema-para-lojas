import { ipcMain } from 'electron';
import type { ProductStore } from '../services/productStore';
import type { StockEntryService } from '../services/stockEntryService';
import type {
  AdjustStockInput,
  CreateProductInput,
  UpdateProductInput,
} from '../types/product';
import type { ProductListQuery } from '../types/productList';

export function registerProductHandlers(
  store: ProductStore,
  stockEntryService: StockEntryService,
): void {
  ipcMain.handle('products:list', () => store.list());

  ipcMain.handle('products:listPage', (_event, query: ProductListQuery) =>
    store.listPage(query),
  );

  ipcMain.handle('products:create', (_event, input: CreateProductInput) =>
    store.create(input),
  );

  ipcMain.handle('products:update', (_event, input: UpdateProductInput) =>
    store.update(input),
  );

  ipcMain.handle('products:adjustStock', (_event, input: AdjustStockInput) =>
    stockEntryService.adjustStock(input),
  );

  ipcMain.handle('products:remove', (_event, id: string) => store.remove(id));
}
