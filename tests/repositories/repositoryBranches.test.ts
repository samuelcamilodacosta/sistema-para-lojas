import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from '../../src/repositories/productRepository';
import { SaleRepository } from '../../src/repositories/saleRepository';
import { StockEntryRepository } from '../../src/repositories/stockEntryRepository';
import { createTestDb } from '../helpers/testDb';

describe('repositórios fallbacks de consulta', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('ProductRepository usa zero quando count não retorna linha', async () => {
    ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);
    vi.spyOn(ctx.db, 'queryOne').mockReturnValue(undefined);
    expect(products.count()).toBe(0);

    vi.spyOn(ctx.db, 'queryAll').mockReturnValue([]);
    expect(products.findListPage({ page: 1, pageSize: 10 }).total).toBe(0);
  });

  it('SaleRepository usa fallbacks quando agregações não retornam linha', async () => {
    ctx = await createTestDb();
    const sales = new SaleRepository(ctx.db);
    vi.spyOn(ctx.db, 'queryOne').mockReturnValue(undefined);

    expect(sales.getSummaryTotals()).toEqual({ totalSales: 0, totalRevenue: 0 });
    expect(sales.getTodaySummary('2024-01-01')).toEqual({ todaySales: 0, todayRevenue: 0 });
    expect(sales.getStatsForRange('2024-01-01', '2024-12-31')).toEqual({
      sales: 0,
      revenue: 0,
    });
  });

  it('StockEntryRepository usa fallbacks quando resumo não retorna linha', async () => {
    ctx = await createTestDb();
    const entries = new StockEntryRepository(ctx.db);
    vi.spyOn(ctx.db, 'queryOne').mockReturnValue(undefined);

    expect(entries.getSummary()).toEqual({
      totalEntries: 0,
      totalItemsAdded: 0,
      monthEntries: 0,
      monthItemsAdded: 0,
    });
  });
});
