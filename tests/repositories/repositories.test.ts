import { afterEach, describe, expect, it } from 'vitest';
import { MetaRepository } from '../../src/repositories/metaRepository';
import { ProductRepository } from '../../src/repositories/productRepository';
import { SaleRepository } from '../../src/repositories/saleRepository';
import { StockEntryRepository } from '../../src/repositories/stockEntryRepository';
import { createTestDb } from '../helpers/testDb';

const product = {
  id: 'p1',
  name: 'Produto A',
  barcode: '789',
  price: 10,
  quantity: 5,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('repositories', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('MetaRepository get/set', async () => {
    ctx = await createTestDb();
    const meta = new MetaRepository(ctx.db);
    expect(meta.get('missing')).toBeUndefined();
    meta.set('key', 'value');
    expect(meta.get('key')).toBe('value');
  });

  it('ProductRepository CRUD e quantidade', async () => {
    ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);

    products.insert(product);
    expect(products.findAll()).toHaveLength(1);
    expect(products.findById('p1')?.name).toBe('Produto A');
    expect(products.findOwnerIdByBarcode('789')).toBe('p1');
    expect(products.count()).toBe(1);

    const updated = { ...product, name: 'Atualizado', updatedAt: '2024-02-01T00:00:00.000Z' };
    products.update(updated);
    expect(products.findById('p1')?.name).toBe('Atualizado');

    products.decreaseQuantity('p1', 2, '2024-02-01T00:00:00.000Z', 'persist');
    expect(products.findById('p1')?.quantity).toBe(3);

    products.increaseQuantity('p1', 1, '2024-02-01T00:00:00.000Z', 'persist');
    expect(products.findById('p1')?.quantity).toBe(4);

    products.setQuantity('p1', 10, '2024-02-01T00:00:00.000Z', 'persist');
    expect(products.findById('p1')?.quantity).toBe(10);

    products.delete('p1');
    expect(products.findById('p1')).toBeUndefined();
  });

  it('ProductRepository lista paginada com filtros', async () => {
    ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);

    products.insert({ ...product, id: 'p1', name: 'Alpha', quantity: 10 });
    products.insert({
      ...product,
      id: 'p2',
      name: 'Beta',
      barcode: '456',
      quantity: 3,
    });
    products.insert({
      ...product,
      id: 'p3',
      name: 'Gamma',
      quantity: 0,
    });

    const page = products.findListPage({ page: 1, pageSize: 1, search: 'alpha' });
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);

    const okOnly = products.findListPage({
      page: 1,
      pageSize: 50,
      statuses: ['ok'],
    });
    expect(okOnly.total).toBe(1);
    expect(okOnly.items[0].id).toBe('p1');

    const lowOnly = products.findListPage({
      page: 1,
      pageSize: 50,
      statuses: ['low'],
    });
    expect(lowOnly.total).toBe(1);

    const outOnly = products.findListPage({
      page: 1,
      pageSize: 50,
      statuses: ['out'],
    });
    expect(outOnly.total).toBe(1);

    const sorted = products.findListPage({
      page: 0,
      pageSize: 0,
      sort: [
        { column: 'status', direction: 'asc' },
        { column: 'status', direction: 'desc' },
      ],
    });
    expect(sorted.total).toBe(3);
    expect(sorted.pageSize).toBe(50);

    const byPrice = products.findListPage({
      page: 1,
      pageSize: 50,
      sort: [{ column: 'price', direction: 'desc' }],
    });
    expect(byPrice.items[0].price).toBeGreaterThanOrEqual(byPrice.items.at(-1)!.price);

    const fallbackSort = products.findListPage({
      page: 1,
      pageSize: 50,
      sort: [{ column: 'invalid' as import('../../src/types/productList').ProductSortColumn, direction: 'asc' }],
    });
    expect(fallbackSort.items).toHaveLength(3);
  });

  it('SaleRepository consultas e agregações', async () => {
    ctx = await createTestDb();
    const sales = new SaleRepository(ctx.db);
    const today = new Date().toISOString();

    sales.insert({
      id: 's1',
      productId: 'p1',
      productName: 'Produto',
      productBarcode: '789',
      unitPrice: 10,
      quantity: 2,
      discount: 1,
      total: 19,
      soldAt: today,
      customerName: 'Cliente',
      paymentMethod: 'pix',
    });

    expect(sales.findAll()).toHaveLength(1);
    expect(sales.getSummaryTotals()).toEqual({ totalSales: 1, totalRevenue: 19 });
    expect(sales.getTodaySummary(today.slice(0, 10)).todaySales).toBe(1);
    expect(sales.getHourlyBuckets(today.slice(0, 10)).length).toBeGreaterThan(0);

    const daily = sales.getDailyBuckets('2020-01-01', '2030-12-31');
    expect(daily.get(today.slice(0, 10))?.revenue).toBe(19);

    expect(sales.getMonthlyBuckets(new Date().getFullYear()).length).toBeGreaterThan(0);
    expect(sales.getStatsForRange('2020-01-01', '2030-12-31').sales).toBe(1);
    expect(sales.getTopProducts('2020-01-01', '2030-12-31', 5)[0].productId).toBe('p1');
    expect(sales.getPaymentBreakdown('2020-01-01', '2030-12-31')[0].payment_method).toBe('pix');

    sales.updatePaymentMethod('s1', 'dinheiro', 'persist');
    expect(sales.findAllWithPaymentMethod()[0].payment_method).toBe('dinheiro');

    const page = sales.findHistoryPage({ page: 1, pageSize: 1, search: 'produto' });
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.filteredRevenue).toBe(19);

    const emptyPage = sales.findHistoryPage({
      page: 1,
      pageSize: 50,
      payments: ['debito_credito'],
    });
    expect(emptyPage.total).toBe(0);
    expect(emptyPage.totalPages).toBe(1);

    const ranged = sales.findHistoryPage({
      page: 0,
      pageSize: 0,
      dateFrom: '2020-01-01',
      dateTo: '2030-12-31',
      sort: [{ column: 'customer', direction: 'asc' }],
    });
    expect(ranged.total).toBe(1);
    expect(ranged.pageSize).toBe(50);
  });

  it('StockEntryRepository listagem e resumo', async () => {
    ctx = await createTestDb();
    const entries = new StockEntryRepository(ctx.db);
    const now = new Date().toISOString();

    entries.insert({
      id: 'e1',
      productId: 'p1',
      productName: 'Produto',
      productBarcode: '789',
      quantity: 5,
      note: 'Compra',
      createdAt: now,
    });

    entries.insert({
      id: 'e2',
      productId: 'p1',
      productName: 'Produto',
      productBarcode: '789',
      quantity: -1,
      note: 'Ajuste manual',
      createdAt: now,
    });

    expect(entries.findAll()).toHaveLength(2);
    const summary = entries.getSummary();
    expect(summary.totalEntries).toBe(2);
    expect(summary.totalItemsAdded).toBe(5);
    expect(summary.monthEntries).toBe(2);
    expect(summary.monthItemsAdded).toBe(5);

    const page = entries.findHistoryPage({ page: 1, pageSize: 1, search: 'produto' });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);

    const purchaseOnly = entries.findHistoryPage({
      page: 1,
      pageSize: 50,
      movements: ['purchase'],
    });
    expect(purchaseOnly.total).toBe(1);
    expect(purchaseOnly.items[0].note).toBe('Compra');

    const adjustmentOnly = entries.findHistoryPage({
      page: 1,
      pageSize: 50,
      movements: ['adjustment'],
    });
    expect(adjustmentOnly.total).toBe(1);

    const outboundOnly = entries.findHistoryPage({
      page: 1,
      pageSize: 50,
      movements: ['outbound'],
    });
    expect(outboundOnly.total).toBe(1);

    const emptyPage = entries.findHistoryPage({
      page: 1,
      pageSize: 50,
      search: 'inexistente',
    });
    expect(emptyPage.total).toBe(0);
    expect(emptyPage.totalPages).toBe(1);

    const ranged = entries.findHistoryPage({
      page: 0,
      pageSize: 0,
      dateFrom: '2020-01-01',
      dateTo: '2030-12-31',
      sort: [{ column: 'name', direction: 'asc' }],
    });
    expect(ranged.total).toBe(2);
    expect(ranged.pageSize).toBe(50);
  });
});
