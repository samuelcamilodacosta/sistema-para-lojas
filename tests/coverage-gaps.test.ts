import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDatabase } from '../src/database/db';
import { ProductRepository } from '../src/repositories/productRepository';
import { SaleRepository } from '../src/repositories/saleRepository';
import { StockEntryRepository } from '../src/repositories/stockEntryRepository';
import { ProductStore } from '../src/services/productStore';
import { SaleService } from '../src/services/saleService';
import { createTestDb } from './helpers/testDb';

describe('repositórios com banco vazio', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('retorna valores padrão quando não há dados', async () => {
    ctx = await createTestDb();
    const sales = new SaleRepository(ctx.db);
    const entries = new StockEntryRepository(ctx.db);
    const products = new ProductRepository(ctx.db);

    expect(products.count()).toBe(0);
    expect(sales.getSummaryTotals()).toEqual({ totalSales: 0, totalRevenue: 0 });
    expect(sales.getTodaySummary('2024-01-01')).toEqual({ todaySales: 0, todayRevenue: 0 });
    expect(sales.getStatsForRange('2024-01-01', '2024-12-31')).toEqual({
      sales: 0,
      revenue: 0,
    });
    expect(sales.getTopProducts('2024-01-01', '2024-12-31', 5)).toEqual([]);
    expect(sales.getPaymentBreakdown('2024-01-01', '2024-12-31')).toEqual([]);
    expect(sales.getHourlyBuckets('2024-01-01')).toEqual([]);
    expect(sales.getDailyBuckets('2024-01-01', '2024-12-31').size).toBe(0);
    expect(sales.getMonthlyBuckets(2024)).toEqual([]);
    expect(entries.getSummary()).toEqual({
      totalEntries: 0,
      totalItemsAdded: 0,
      monthEntries: 0,
      monthItemsAdded: 0,
    });
  });
});

describe('AppDatabase migrações legadas', () => {
  it('adiciona colunas ausentes na tabela sales', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-legacy-sales-'));
    const db = new AppDatabase(dataDir);
    await db.init();

    db.connection.run('DROP TABLE IF EXISTS sales');
    db.connection.run(`
      CREATE TABLE sales (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_barcode TEXT NOT NULL,
        unit_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        total REAL NOT NULL,
        sold_at TEXT NOT NULL
      )
    `);
    db.connection.run("DELETE FROM meta WHERE key = 'products_barcode_optional'");
    db.persist();
    db.close();

    const db2 = new AppDatabase(dataDir);
    await db2.init();

    const columns = db2.queryAll<{ name: string }>('PRAGMA table_info(sales)');
    const names = columns.map((column) => column.name);
    expect(names).toContain('discount');
    expect(names).toContain('customer_name');
    expect(names).toContain('payment_method');

    db2.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
});

describe('ProductStore branches', () => {
  it('atualiza apenas campos informados', async () => {
    const ctx = await createTestDb();
    const store = new ProductStore(new ProductRepository(ctx.db));
    const product = store.create({ name: 'A', barcode: '', price: 10, quantity: 1 });
    const updated = store.update({ id: product.id, price: 15 });
    expect(updated.price).toBe(15);
    expect(updated.name).toBe('A');
    ctx.cleanup();
  });

  it('atualiza quantidade quando informada', async () => {
    const ctx = await createTestDb();
    const store = new ProductStore(new ProductRepository(ctx.db));
    const product = store.create({ name: 'A', barcode: '', price: 10, quantity: 1 });
    const updated = store.update({ id: product.id, quantity: 4 });
    expect(updated.quantity).toBe(4);
    ctx.cleanup();
  });
});

describe('repositórios campos nulos', () => {
  it('mapeia valores nulos do banco', async () => {
    const ctx = await createTestDb();
    const sales = new SaleRepository(ctx.db);
    const products = new ProductRepository(ctx.db);
    const product = {
      id: 'p-null',
      name: 'Produto',
      barcode: '',
      price: 10,
      quantity: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.insert(product);

    ctx.db.connection.run(
      `INSERT INTO sales (id, product_id, product_name, product_barcode, unit_price, quantity, discount, total, sold_at, customer_name, payment_method)
       VALUES ('s-null', ?, ?, ?, 10, 1, 0, 10, '2024-01-01T10:00:00.000Z', '', '')`,
      [product.id, product.name, product.barcode],
    );
    ctx.db.persist();

    const mapped = sales.findAll()[0];
    expect(mapped.discount).toBe(0);
    expect(mapped.customerName).toBe('');
    expect(mapped.paymentMethod).toBe('');

    ctx.cleanup();
  });
});

describe('SaleService branches', () => {
  it('calcula variação percentual com base anterior', async () => {
    const ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);
    const sales = new SaleRepository(ctx.db);
    const store = new ProductStore(products);
    const service = new SaleService(ctx.db, sales, products, store);

    const product = store.create({ name: 'A', barcode: '', price: 10, quantity: 100 });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-10T12:00:00.000Z'));
    service.register({ productId: product.id, quantity: 1, paymentMethod: 'pix' });

    vi.setSystemTime(new Date('2024-06-11T12:00:00.000Z'));
    service.register({ productId: product.id, quantity: 2, paymentMethod: 'pix' });

    const analytics = service.getDashboardAnalytics({ period: 'day' });
    expect(analytics.today.revenueChangePercent).not.toBeNull();
    expect(analytics.periodComparison.revenueChangePercent).not.toBeNull();
    vi.useRealTimers();
    ctx.cleanup();
  });

  it('rejeita desconto negativo no pedido em lote', async () => {
    const ctx = await createTestDb();
    const products = new ProductRepository(ctx.db);
    const sales = new SaleRepository(ctx.db);
    const store = new ProductStore(products);
    const service = new SaleService(ctx.db, sales, products, store);
    const product = store.create({ name: 'A', barcode: '', price: 10, quantity: 5 });

    expect(() =>
      service.registerBatch({
        items: [{ productId: product.id, quantity: 1 }],
        orderDiscount: -1,
        paymentMethod: 'pix',
      }),
    ).toThrow('APP_ERROR:SALE_DISCOUNT_NEGATIVE');

    ctx.cleanup();
  });
});

describe('scripts CLI', () => {
  it('executa seed.ts como script direto', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-cli-seed-'));
    const build = spawnSync('npm', ['run', 'build:main'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      encoding: 'utf-8',
    });
    expect(build.status).toBe(0);

    const run = spawnSync('node', [path.resolve(__dirname, '../dist/database/seed.js')], {
      cwd: tempDir,
      encoding: 'utf-8',
    });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('Base de testes criada com sucesso');
    expect(fs.existsSync(path.join(tempDir, 'data', 'sistema.db'))).toBe(true);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('executa backfillPaymentMethods.ts como script direto', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-cli-backfill-'));
    const dataDir = path.join(tempRoot, 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    const ctx = await createTestDb();
    fs.copyFileSync(path.join(ctx.dataDir, 'sistema.db'), path.join(dataDir, 'sistema.db'));
    ctx.cleanup();

    const build = spawnSync('npm', ['run', 'build:main'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      encoding: 'utf-8',
    });
    expect(build.status).toBe(0);

    const run = spawnSync(
      'node',
      [path.resolve(__dirname, '../dist/database/backfillPaymentMethods.js')],
      {
        cwd: tempRoot,
        encoding: 'utf-8',
      },
    );

    expect(run.status).toBe(0);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
