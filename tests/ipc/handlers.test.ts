import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ipcMain } from 'electron';
import { registerProductHandlers } from '../../src/ipc/productHandlers';
import { registerSaleHandlers } from '../../src/ipc/saleHandlers';
import { registerStockEntryHandlers } from '../../src/ipc/stockEntryHandlers';
import { ProductRepository } from '../../src/repositories/productRepository';
import { SaleRepository } from '../../src/repositories/saleRepository';
import { StockEntryRepository } from '../../src/repositories/stockEntryRepository';
import { ProductStore } from '../../src/services/productStore';
import { SaleService } from '../../src/services/saleService';
import { StockEntryService } from '../../src/services/stockEntryService';
import { createTestDb } from '../helpers/testDb';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('IPC handlers', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let handlers: Map<string, (...args: unknown[]) => unknown>;

  beforeEach(async () => {
    handlers = new Map();
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers.set(channel, handler as (...args: unknown[]) => unknown);
    });

    ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);
    const sales = new SaleRepository(ctx.db);
    const entries = new StockEntryRepository(ctx.db);
    const store = new ProductStore(products);
    const saleService = new SaleService(ctx.db, sales, products, store);
    const stockService = new StockEntryService(ctx.db, entries, products, store);

    registerProductHandlers(store, stockService);
    registerSaleHandlers(saleService);
    registerStockEntryHandlers(stockService);
  });

  afterEach(() => {
    ctx?.cleanup();
    vi.clearAllMocks();
  });

  it('registra handlers de produtos', async () => {
    const created = await handlers.get('products:create')!({}, {
      name: 'Produto',
      barcode: '',
      price: 10,
      quantity: 1,
    });
    expect(created.name).toBe('Produto');

    const list = await handlers.get('products:list')!({});
    expect(list).toHaveLength(1);

    expect(
      await handlers.get('products:listPage')!({}, { page: 1, pageSize: 10 }),
    ).toBeDefined();

    const updated = await handlers.get('products:update')!({}, {
      id: created.id,
      name: 'Atualizado',
    });
    expect(updated.name).toBe('Atualizado');

    const adjusted = await handlers.get('products:adjustStock')!({}, {
      id: created.id,
      amount: 2,
    });
    expect(adjusted.quantity).toBe(3);

    await handlers.get('products:remove')!({}, created.id);
    expect(await handlers.get('products:list')!({})).toHaveLength(0);
  });

  it('registra handlers de vendas', async () => {
    const product = await handlers.get('products:create')!({}, {
      name: 'Produto',
      barcode: '',
      price: 10,
      quantity: 5,
    });

    const sale = await handlers.get('sales:register')!({}, {
      productId: product.id,
      quantity: 1,
      paymentMethod: 'pix',
    });
    expect(sale.total).toBe(10);

    const batch = await handlers.get('sales:registerBatch')!({}, {
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'pix',
    });
    expect(batch.sales).toHaveLength(1);

    expect(await handlers.get('sales:list')!({})).toHaveLength(2);
    expect(await handlers.get('sales:summary')!({})).toBeDefined();
    expect(await handlers.get('sales:listHistory')!({}, { page: 1, pageSize: 10 })).toBeDefined();
    expect(await handlers.get('sales:chart')!({}, { period: 'week' })).toBeDefined();
    expect(await handlers.get('sales:dashboard')!({}, { period: 'week' })).toBeDefined();
    expect(
      await handlers.get('sales:chart')!({}, { period: 'day', dateFrom: '2026-01-15', dateTo: '2026-01-15' }),
    ).toMatchObject({ dateFrom: '2026-01-15', dateTo: '2026-01-15' });
  });

  it('registra handlers de entradas de estoque', async () => {
    const product = await handlers.get('products:create')!({}, {
      name: 'Produto',
      barcode: '',
      price: 10,
      quantity: 1,
    });

    const entry = await handlers.get('stockEntries:register')!({}, {
      productId: product.id,
      quantity: 2,
    });
    expect(entry.quantity).toBe(2);
    expect(await handlers.get('stockEntries:list')!({})).toHaveLength(1);
    expect(await handlers.get('stockEntries:summary')!({})).toBeDefined();
    expect(
      await handlers.get('stockEntries:listHistory')!({}, { page: 1, pageSize: 10 }),
    ).toBeDefined();
  });
});
