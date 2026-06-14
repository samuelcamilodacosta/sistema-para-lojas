import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from '../../src/repositories/productRepository';
import { SaleRepository } from '../../src/repositories/saleRepository';
import { ProductStore } from '../../src/services/productStore';
import { SaleService } from '../../src/services/saleService';
import { createTestDb } from '../helpers/testDb';

describe('SaleService', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let service: SaleService;
  let productId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);
    const sales = new SaleRepository(ctx.db);
    const store = new ProductStore(products);
    service = new SaleService(ctx.db, sales, products, store);

    const product = store.create({
      name: 'Produto',
      barcode: '123',
      price: 10,
      quantity: 10,
    });
    productId = product.id;
  });

  afterEach(() => {
    ctx?.cleanup();
  });

  it('registra venda unitária', () => {
    const sale = service.register({
      productId,
      quantity: 2,
      discount: 1,
      customerName: ' Cliente ',
      paymentMethod: 'pix',
    });

    expect(sale.total).toBe(19);
    expect(sale.customerName).toBe('Cliente');
    expect(new ProductRepository(ctx.db).findById(productId)?.quantity).toBe(8);
  });

  it('valida venda unitária', () => {
    expect(() =>
      service.register({ productId, quantity: 0, paymentMethod: 'pix' }),
    ).toThrow('APP_ERROR:SALE_INVALID_QUANTITY');
    expect(() =>
      service.register({ productId, quantity: 1, discount: -1, paymentMethod: 'pix' }),
    ).toThrow('APP_ERROR:SALE_DISCOUNT_NEGATIVE');
    expect(() =>
      service.register({ productId: 'x', quantity: 1, paymentMethod: 'pix' }),
    ).toThrow('APP_ERROR:PRODUCT_NOT_FOUND');
    expect(() =>
      service.register({ productId, quantity: 100, paymentMethod: 'pix' }),
    ).toThrow('APP_ERROR:SALE_INSUFFICIENT_STOCK');
    expect(() =>
      service.register({ productId, quantity: 1, discount: 100, paymentMethod: 'pix' }),
    ).toThrow('APP_ERROR:SALE_DISCOUNT_EXCEEDS_SUBTOTAL');
    expect(() =>
      service.register({ productId, quantity: 1, paymentMethod: 'invalid' as 'pix' }),
    ).toThrow('APP_ERROR:SALE_INVALID_PAYMENT_METHOD');
  });

  it('registra venda em lote', () => {
    const result = service.registerBatch({
      items: [{ productId, quantity: 2 }, { productId, quantity: 1 }],
      orderDiscount: 3,
      paymentMethod: 'dinheiro',
    });

    expect(result.sales).toHaveLength(2);
    expect(result.total).toBeGreaterThan(0);
  });

  it('valida venda em lote', () => {
    expect(() =>
      service.registerBatch({ items: [], paymentMethod: 'pix' }),
    ).toThrow('APP_ERROR:SALE_EMPTY_CART');
    expect(() =>
      service.registerBatch({
        items: [{ productId, quantity: 0 }],
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:SALE_BATCH_INVALID_QUANTITY');
    expect(() =>
      service.registerBatch({
        items: [{ productId, quantity: 1, discount: -1 }],
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:SALE_DISCOUNT_NEGATIVE');
    expect(() =>
      service.registerBatch({
        items: [{ productId: 'x', quantity: 1 }],
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:PRODUCT_NOT_FOUND');
    expect(() =>
      service.registerBatch({
        items: [
          { productId, quantity: 6 },
          { productId, quantity: 6 },
        ],
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:SALE_INSUFFICIENT_STOCK_NAMED:{"name":"Produto"}');
    expect(() =>
      service.registerBatch({
        items: [{ productId, quantity: 1, discount: 100 }],
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:SALE_LINE_DISCOUNT_EXCEEDS_SUBTOTAL:{"name":"Produto"}');
    expect(() =>
      service.registerBatch({
        items: [{ productId, quantity: 1 }],
        orderDiscount: 100,
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:SALE_ORDER_DISCOUNT_EXCEEDS_SUBTOTAL');
  });

  it('lista vendas e retorna resumo', () => {
    service.register({ productId, quantity: 1, paymentMethod: 'pix' });
    expect(service.list()).toHaveLength(1);
    const summary = service.getSummary();
    expect(summary.totalSales).toBe(1);
    expect(summary.todaySales).toBe(1);
  });

  it('lista histórico paginado', () => {
    for (let index = 0; index < 3; index += 1) {
      service.register({ productId, quantity: 1, paymentMethod: 'pix' });
    }

    const page = service.listHistory({ page: 1, pageSize: 2, sort: [{ column: 'date', direction: 'desc' }] });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
    expect(page.totalPages).toBe(2);
  });

  it('retorna dados de gráfico para todos os períodos', () => {
    service.register({ productId, quantity: 1, paymentMethod: 'pix' });

    for (const period of ['day', 'week', 'month', 'year'] as const) {
      const chart = service.getChartData({ period });
      expect(chart.period).toBe(period);
      expect(chart.dateFrom).toBeTruthy();
      expect(chart.dateTo).toBeTruthy();
      expect(chart.points.length).toBeGreaterThan(0);
    }
  });

  it('usa intervalo de datas no gráfico e no dashboard', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));

    service.register({ productId, quantity: 1, paymentMethod: 'pix' });

    const chart = service.getChartData({
      period: 'day',
      dateFrom: '2026-06-10',
      dateTo: '2026-06-10',
    });
    expect(chart.dateFrom).toBe('2026-06-10');
    expect(chart.dateTo).toBe('2026-06-10');
    expect(chart.points).toHaveLength(24);

    const rangeChart = service.getChartData({
      period: 'week',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-10',
    });
    expect(rangeChart.points).toHaveLength(10);

    const analytics = service.getDashboardAnalytics({
      period: 'week',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-10',
    });
    expect(analytics.dateFrom).toBe('2026-06-01');
    expect(analytics.dateTo).toBe('2026-06-10');

    vi.useRealTimers();
  });

  it('retorna pontos vazios para datas inválidas no gráfico', () => {
    const getRangeDayChartPoints = (
      service as unknown as {
        getRangeDayChartPoints: (dateFrom: string, dateTo: string) => unknown[];
      }
    ).getRangeDayChartPoints.bind(service);
    const getRangeMonthChartPoints = (
      service as unknown as {
        getRangeMonthChartPoints: (dateFrom: string, dateTo: string) => unknown[];
      }
    ).getRangeMonthChartPoints.bind(service);

    expect(getRangeDayChartPoints('invalid', '2026-06-01')).toEqual([]);
    expect(getRangeDayChartPoints('2026-06-01', 'invalid')).toEqual([]);
    expect(getRangeMonthChartPoints('invalid', '2026-06-01')).toEqual([]);
  });

  it('retorna analytics do dashboard', () => {
    service.register({ productId, quantity: 1, paymentMethod: 'pix' });

    for (const period of ['day', 'week', 'month', 'year'] as const) {
      const analytics = service.getDashboardAnalytics({ period });
      expect(analytics.period).toBe(period);
      expect(analytics.today.revenue).toBeGreaterThanOrEqual(0);
    }
  });

  it('calcula variação percentual com base anterior zero', () => {
    const analytics = service.getDashboardAnalytics({ period: 'day' });
    expect(analytics.periodComparison.revenueChangePercent).toBeNull();
  });

  it('filtra métodos de pagamento sem vendas', () => {
    const analytics = service.getDashboardAnalytics({ period: 'year' });
    expect(analytics.paymentMethods.every((item) => item.count > 0)).toBe(true);
  });

  it('lança erro quando desconto do pedido não pode ser distribuído', () => {
    const distribute = (
      service as unknown as {
        distributeOrderDiscount: (subtotals: number[], orderDiscount: number) => number[];
      }
    ).distributeOrderDiscount.bind(service);

    expect(() => distribute([0], 1)).toThrow(
      'APP_ERROR:SALE_ORDER_DISCOUNT_APPLY_FAILED',
    );
  });

  it('calcula ticket médio zero quando não há vendas hoje', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T12:00:00.000Z'));
    const analytics = service.getDashboardAnalytics({ period: 'day' });
    expect(analytics.today.ticketAverage).toBe(0);
  });
});
