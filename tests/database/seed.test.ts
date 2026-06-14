import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';import { seedDatabase } from '../../src/database/seed';
import { ProductRepository } from '../../src/repositories/productRepository';
import { SaleRepository } from '../../src/repositories/saleRepository';
import { StockEntryRepository } from '../../src/repositories/stockEntryRepository';

describe('seedDatabase', () => {
  let dataDir: string;

  afterEach(() => {
    if (dataDir && fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('remove banco existente antes de recriar', async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-seed-existing-'));
    fs.writeFileSync(path.join(dataDir, 'sistema.db'), 'arquivo-antigo');
    await seedDatabase(dataDir);
    expect(fs.statSync(path.join(dataDir, 'sistema.db')).size).toBeGreaterThan(20);
  });

  it('popula banco com dados de demonstração', async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-seed-'));
    await seedDatabase(dataDir);

    const { AppDatabase } = await import('../../src/database/db');
    const { buildSeedSales, buildSeedStockEntries } = await import('../../src/database/seed');
    const db = new AppDatabase(dataDir);
    await db.init();

    const products = new ProductRepository(db);
    const sales = new SaleRepository(db);
    const entries = new StockEntryRepository(db);

    expect(products.count()).toBe(40);
    expect(sales.findAll().length).toBeGreaterThan(5000);
    expect(entries.findAll().length).toBeGreaterThan(100);
    expect(buildSeedSales().length).toBeGreaterThan(5000);
    expect(buildSeedStockEntries().length).toBeGreaterThan(100);

    db.close();
  });

  it('executa main com logs', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-seed-main-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.doMock('../../src/database/getDataDir', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/database/getDataDir')>();
      return { ...actual, getLocalDataDir: vi.fn(() => dataDir) };
    });
    vi.resetModules();

    const { main } = await import('../../src/database/seed');
    await main();

    expect(logSpy).toHaveBeenCalledWith('Base de testes criada com sucesso.');
    logSpy.mockRestore();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
});
