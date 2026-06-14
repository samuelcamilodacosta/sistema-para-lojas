import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { backfillPaymentMethods } from '../../src/database/backfillPaymentMethods';
import { SaleRepository } from '../../src/repositories/saleRepository';
import { createTestDb } from '../helpers/testDb';

describe('backfillPaymentMethods', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('preenche payment_method vazio', async () => {
    ctx = await createTestDb();
    const sales = new SaleRepository(ctx.db);

    sales.insert({
      id: 's1',
      productId: 'p1',
      productName: 'Produto',
      productBarcode: '',
      unitPrice: 10,
      quantity: 1,
      discount: 0,
      total: 10,
      soldAt: new Date().toISOString(),
      customerName: '',
      paymentMethod: '',
    });

    ctx.db.close();

    const updated = await backfillPaymentMethods(ctx.dataDir);
    expect(updated).toBe(1);

    const { AppDatabase } = await import('../../src/database/db');
    const db = new AppDatabase(ctx.dataDir);
    await db.init();
    const row = new SaleRepository(db).findAllWithPaymentMethod()[0];
    expect(row.payment_method).toBe('pix');
    db.close();
  });

  it('não altera vendas com pagamento válido', async () => {
    ctx = await createTestDb();
    new SaleRepository(ctx.db).insert({
      id: 's1',
      productId: 'p1',
      productName: 'Produto',
      productBarcode: '',
      unitPrice: 10,
      quantity: 1,
      discount: 0,
      total: 10,
      soldAt: new Date().toISOString(),
      customerName: '',
      paymentMethod: 'dinheiro',
    });
    ctx.db.close();

    const updated = await backfillPaymentMethods(ctx.dataDir);
    expect(updated).toBe(0);
  });
});

describe('backfillPaymentMethods main', () => {
  it('encerra quando nenhum banco é encontrado', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as typeof process.exit);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const { main } = await import('../../src/database/backfillPaymentMethods');
    await expect(main()).rejects.toThrow('exit');

    exitSpy.mockRestore();
    errorSpy.mockRestore();
    vi.mocked(fs.existsSync).mockRestore();
  });

  it('processa bancos encontrados', async () => {
    let ctx: Awaited<ReturnType<typeof createTestDb>> | undefined;
    ctx = await createTestDb();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.resetModules();
    vi.doMock('../../src/database/getDataDir', () => ({
      getLocalDatabasePath: () => `${ctx!.dataDir}/sistema.db`,
      getLocalDataDir: () => ctx!.dataDir,
    }));

    const { main } = await import('../../src/database/backfillPaymentMethods');
    await main();

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    vi.doUnmock('../../src/database/getDataDir');
    ctx.cleanup();
  });
});
