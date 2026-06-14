import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductRepository } from '../../src/repositories/productRepository';
import { ProductStore } from '../../src/services/productStore';
import { createTestDb } from '../helpers/testDb';

describe('ProductStore', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let store: ProductStore;

  afterEach(() => {
    ctx?.cleanup();
  });

  beforeEach(async () => {
    ctx = await createTestDb();
    store = new ProductStore(new ProductRepository(ctx.db));
  });

  it('lista produtos', () => {
    expect(store.list()).toEqual([]);
  });

  it('lista produtos paginados', () => {
    store.create({ name: 'A', barcode: '', price: 1, quantity: 1 });
    store.create({ name: 'B', barcode: '', price: 2, quantity: 2 });

    const page = store.listPage({ page: 1, pageSize: 1, sort: [{ column: 'name', direction: 'asc' }] });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
  });

  it('cria produto válido', () => {
    const product = store.create({
      name: '  Camiseta  ',
      barcode: ' 123 ',
      price: 49.9,
      quantity: 10,
    });
    expect(product.name).toBe('Camiseta');
    expect(product.barcode).toBe('123');
    expect(store.getById(product.id)?.name).toBe('Camiseta');
  });

  it('valida nome, preço e quantidade na criação', () => {
    expect(() => store.create({ name: ' ', barcode: '', price: 1, quantity: 1 })).toThrow(
      'APP_ERROR:PRODUCT_NAME_REQUIRED',
    );
    expect(() => store.create({ name: 'A', barcode: '', price: -1, quantity: 1 })).toThrow(
      'APP_ERROR:PRODUCT_PRICE_NEGATIVE',
    );
    expect(() => store.create({ name: 'A', barcode: '', price: 1, quantity: -1 })).toThrow(
      'APP_ERROR:PRODUCT_QUANTITY_NEGATIVE',
    );
  });

  it('impede barcode duplicado', () => {
    store.create({ name: 'A', barcode: '111', price: 1, quantity: 1 });
    expect(() => store.create({ name: 'B', barcode: '111', price: 1, quantity: 1 })).toThrow(
      'APP_ERROR:PRODUCT_DUPLICATE_BARCODE',
    );
  });

  it('atualiza produto', () => {
    const product = store.create({ name: 'A', barcode: '', price: 1, quantity: 1 });
    const updated = store.update({ id: product.id, name: 'B', price: 2 });
    expect(updated.name).toBe('B');
    expect(updated.price).toBe(2);
  });

  it('valida update e produto inexistente', () => {
    expect(() => store.update({ id: 'missing', name: 'X' })).toThrow('APP_ERROR:PRODUCT_NOT_FOUND');
    const product = store.create({ name: 'A', barcode: '', price: 1, quantity: 1 });
    expect(() => store.update({ id: product.id, name: ' ' })).toThrow(
      'APP_ERROR:PRODUCT_NAME_REQUIRED',
    );
    expect(() => store.update({ id: product.id, price: -1 })).toThrow(
      'APP_ERROR:PRODUCT_PRICE_NEGATIVE',
    );
    expect(() => store.update({ id: product.id, quantity: -1 })).toThrow(
      'APP_ERROR:PRODUCT_QUANTITY_NEGATIVE',
    );
  });

  it('atualiza barcode com unicidade', () => {
    const a = store.create({ name: 'A', barcode: '111', price: 1, quantity: 1 });
    store.create({ name: 'B', barcode: '222', price: 1, quantity: 1 });
    expect(() => store.update({ id: a.id, barcode: '222' })).toThrow(
      'APP_ERROR:PRODUCT_DUPLICATE_BARCODE',
    );
    expect(store.update({ id: a.id, barcode: '111' }).barcode).toBe('111');
  });

  it('remove produto', () => {
    const product = store.create({ name: 'A', barcode: '', price: 1, quantity: 1 });
    store.remove(product.id);
    expect(store.getById(product.id)).toBeUndefined();
    expect(() => store.remove('missing')).toThrow('APP_ERROR:PRODUCT_NOT_FOUND');
  });
});
