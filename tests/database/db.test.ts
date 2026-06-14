import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../../src/database/db';
import { createTestDb } from '../helpers/testDb';

describe('AppDatabase', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('inicializa banco novo e persiste schema', async () => {
    ctx = await createTestDb();
    const meta = ctx.db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM meta');
    expect(meta?.count).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(path.join(ctx.dataDir, 'sistema.db'))).toBe(true);
  });

  it('carrega banco existente do disco', async () => {
    ctx = await createTestDb();
    ctx.db.run(
      "INSERT INTO meta (key, value) VALUES ('test', 'ok')",
    );
    ctx.db.close();

    const db2 = new AppDatabase(ctx.dataDir);
    await db2.init();
    expect(db2.queryOne<{ value: string }>("SELECT value FROM meta WHERE key = 'test'")?.value).toBe(
      'ok',
    );
    db2.close();
  });

  it('lança erro ao acessar conexão antes de init', () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-uninit-'));
    const db = new AppDatabase(dataDir);
    expect(() => db.connection).toThrow('Banco de dados não inicializado.');
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('executa transação com commit e rollback', async () => {
    ctx = await createTestDb();

    ctx.db.transaction(() => {
      ctx.db.runWithoutPersist(
        "INSERT INTO meta (key, value) VALUES ('tx', '1')",
      );
    });

    expect(ctx.db.queryOne("SELECT value FROM meta WHERE key = 'tx'")?.value).toBe('1');

    expect(() =>
      ctx.db.transaction(() => {
        ctx.db.runWithoutPersist(
          "INSERT INTO meta (key, value) VALUES ('tx2', '2')",
        );
        throw new Error('falha');
      }),
    ).toThrow('falha');

    expect(ctx.db.queryOne("SELECT value FROM meta WHERE key = 'tx2'")).toBeUndefined();
  });

  it('queryAll e queryOne retornam linhas', async () => {
    ctx = await createTestDb();
    ctx.db.run("INSERT INTO meta (key, value) VALUES ('a', '1'), ('b', '2')");
    const rows = ctx.db.queryAll<{ key: string }>(
      "SELECT key FROM meta WHERE key IN ('a', 'b') ORDER BY key",
    );
    expect(rows.map((row) => row.key)).toEqual(['a', 'b']);
    expect(ctx.db.queryOne<{ key: string }>("SELECT key FROM meta WHERE key = 'missing'")).toBeUndefined();
  });

  it('persist não faz nada se db for nulo após close', async () => {
    ctx = await createTestDb();
    ctx.db.close();
    expect(() => ctx.db.persist()).not.toThrow();
  });

  it('migra colunas ausentes em sales', async () => {
    ctx = await createTestDb();
    const columns = ctx.db.queryAll<{ name: string }>('PRAGMA table_info(sales)');
    const names = columns.map((column) => column.name);
    expect(names).toContain('discount');
    expect(names).toContain('customer_name');
    expect(names).toContain('payment_method');
  });

  it('migra products com constraint UNIQUE de barcode', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-migrate-'));
    const dbPath = path.join(dataDir, 'sistema.db');
    fs.mkdirSync(dataDir, { recursive: true });

    const db = new AppDatabase(dataDir);
    await db.init();

    db.connection.run('DROP TABLE IF EXISTS products');
    db.connection.run(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT NOT NULL UNIQUE,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    db.connection.run(
      `INSERT INTO products VALUES ('p1', 'A', '123', 1, 1, '2024-01-01', '2024-01-01')`,
    );
    db.connection.run("DELETE FROM meta WHERE key = 'products_barcode_optional'");
    db.persist();
    db.close();

    const db2 = new AppDatabase(dataDir);
    await db2.init();
    const table = db2.queryOne<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='products'",
    );
    expect(table?.sql).not.toContain('UNIQUE');
    expect(
      db2.queryOne<{ value: string }>(
        "SELECT value FROM meta WHERE key = 'products_barcode_optional'",
      )?.value,
    ).toBe('1');

    db2.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
});
