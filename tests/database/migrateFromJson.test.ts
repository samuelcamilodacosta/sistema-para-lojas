import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateFromJsonIfNeeded } from '../../src/database/migrateFromJson';
import { MetaRepository } from '../../src/repositories/metaRepository';
import { ProductRepository } from '../../src/repositories/productRepository';
import { createTestDb } from '../helpers/testDb';

describe('migrateFromJsonIfNeeded', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('marca migração quando não há JSON', async () => {
    ctx = await createTestDb();
    migrateFromJsonIfNeeded(ctx.db, ctx.dataDir);
    const meta = new MetaRepository(ctx.db);
    expect(meta.get('json_migrated')).toBe('1');
  });

  it('ignora quando já migrado', async () => {
    ctx = await createTestDb();
    new MetaRepository(ctx.db).set('json_migrated', '1');
    migrateFromJsonIfNeeded(ctx.db, ctx.dataDir);
    expect(new ProductRepository(ctx.db).count()).toBe(0);
  });

  it('ignora quando banco já tem produtos', async () => {
    ctx = await createTestDb();
    fs.writeFileSync(
      path.join(ctx.dataDir, 'products.json'),
      JSON.stringify([
        {
          id: 'p1',
          name: 'Produto',
          barcode: '123',
          price: 10,
          quantity: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]),
    );

    new ProductRepository(ctx.db).insert({
      id: 'existing',
      name: 'Existente',
      barcode: '',
      price: 1,
      quantity: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });

    migrateFromJsonIfNeeded(ctx.db, ctx.dataDir);
    expect(new ProductRepository(ctx.db).count()).toBe(1);
  });

  it('migra JSON legado e faz backup', async () => {
    ctx = await createTestDb();

    const productsPath = path.join(ctx.dataDir, 'products.json');
    const salesPath = path.join(ctx.dataDir, 'sales.json');
    const entriesPath = path.join(ctx.dataDir, 'stock-entries.json');

    fs.writeFileSync(
      productsPath,
      JSON.stringify([
        {
          id: 'p1',
          name: 'Produto',
          price: 10,
          quantity: 5,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]),
    );
    fs.writeFileSync(
      salesPath,
      JSON.stringify([
        {
          id: 's1',
          productId: 'p1',
          productName: 'Produto',
          productBarcode: '',
          unitPrice: 10,
          quantity: 1,
          total: 10,
          soldAt: '2024-01-02T10:00:00.000Z',
        },
      ]),
    );
    fs.writeFileSync(
      entriesPath,
      JSON.stringify([
        {
          id: 'e1',
          productId: 'p1',
          productName: 'Produto',
          productBarcode: '',
          quantity: 5,
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ]),
    );

    migrateFromJsonIfNeeded(ctx.db, ctx.dataDir);

    expect(new ProductRepository(ctx.db).count()).toBe(1);
    expect(fs.existsSync(`${productsPath}.bak`)).toBe(true);
    expect(fs.existsSync(`${salesPath}.bak`)).toBe(true);
    expect(fs.existsSync(`${entriesPath}.bak`)).toBe(true);
  });

  it('readJsonFile retorna array vazio para JSON inválido ou ausente', async () => {
    ctx = await createTestDb();
    fs.writeFileSync(path.join(ctx.dataDir, 'products.json'), '{"not":"array"}');
    migrateFromJsonIfNeeded(ctx.db, ctx.dataDir);
    expect(new ProductRepository(ctx.db).count()).toBe(0);
  });
});
