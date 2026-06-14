import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductRepository } from '../../src/repositories/productRepository';
import { StockEntryRepository } from '../../src/repositories/stockEntryRepository';
import { ProductStore } from '../../src/services/productStore';
import { StockEntryService } from '../../src/services/stockEntryService';
import { createTestDb } from '../helpers/testDb';

describe('StockEntryService', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let service: StockEntryService;
  let productId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);
    const entries = new StockEntryRepository(ctx.db);
    const store = new ProductStore(products);
    service = new StockEntryService(ctx.db, entries, products, store);

    productId = store.create({
      name: 'Produto',
      barcode: '123',
      price: 10,
      quantity: 5,
    }).id;
  });

  afterEach(() => {
    ctx?.cleanup();
  });

  it('registra entrada de estoque', () => {
    const entry = service.register({
      productId,
      quantity: 3,
      note: ' Compra ',
    });

    expect(entry.quantity).toBe(3);
    expect(entry.note).toBe('Compra');
    expect(new ProductRepository(ctx.db).findById(productId)?.quantity).toBe(8);
  });

  it('valida registro de entrada', () => {
    expect(() => service.register({ productId, quantity: 0 })).toThrow(
      'APP_ERROR:STOCK_ENTRY_INVALID_QUANTITY',
    );
    expect(() => service.register({ productId: 'x', quantity: 1 })).toThrow(
      'APP_ERROR:PRODUCT_NOT_FOUND',
    );
  });

  it('ajusta estoque manualmente', () => {
    const product = service.adjustStock({ id: productId, amount: -2 });
    expect(product.quantity).toBe(3);
    expect(service.list().some((entry) => entry.note === 'Ajuste manual')).toBe(true);
  });

  it('valida ajuste de estoque', () => {
    expect(() => service.adjustStock({ id: productId, amount: 0 })).toThrow(
      'APP_ERROR:STOCK_ENTRY_INVALID_ADJUSTMENT',
    );
    expect(() => service.adjustStock({ id: 'x', amount: 1 })).toThrow(
      'APP_ERROR:PRODUCT_NOT_FOUND',
    );
    expect(() => service.adjustStock({ id: productId, amount: -100 })).toThrow(
      'APP_ERROR:STOCK_ENTRY_INSUFFICIENT',
    );
  });

  it('lista entradas e retorna resumo', () => {
    service.register({ productId, quantity: 2 });
    expect(service.list()).toHaveLength(1);
    expect(service.getSummary().totalEntries).toBe(1);
  });

  it('lista histórico paginado', () => {
    service.register({ productId, quantity: 2 });
    service.adjustStock({ id: productId, amount: -1 });

    const page = service.listHistory({ page: 1, pageSize: 1, sort: [{ column: 'date', direction: 'desc' }] });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
  });
});
