import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlDatabase, SqlJsStatic, SqlValue } from 'sql.js';

function resolveSqlJsWasmDirectory(): string {
  const unpackedDirectory = path.join(
    process.resourcesPath ?? '',
    'app.asar.unpacked',
    'node_modules',
    'sql.js',
    'dist',
  );

  if (process.resourcesPath && fs.existsSync(path.join(unpackedDirectory, 'sql-wasm.wasm'))) {
    return unpackedDirectory;
  }

  return path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));
}

export class AppDatabase {
  private sql: SqlJsStatic | null = null;
  private db: SqlDatabase | null = null;
  private readonly dbPath: string;

  constructor(dataDir: string) {
    this.dbPath = path.join(dataDir, 'sistema.db');
  }

  async init(): Promise<void> {
    const wasmDirectory = resolveSqlJsWasmDirectory();

    this.sql = await initSqlJs({
      locateFile: (file: string) => path.join(wasmDirectory, file),
    });

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new this.sql.Database(buffer);
    } else {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      this.db = new this.sql.Database();
    }

    this.initSchema();
  }

  get connection(): SqlDatabase {
    if (!this.db) {
      throw new Error('Banco de dados não inicializado.');
    }

    return this.db;
  }

  initSchema(): void {
    this.connection.run(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_barcode TEXT NOT NULL,
        unit_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        sold_at TEXT NOT NULL,
        customer_name TEXT NOT NULL DEFAULT '',
        payment_method TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS stock_entries (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_barcode TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
    `);

    this.connection.run(
      'CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at)',
    );
    this.connection.run(
      'CREATE INDEX IF NOT EXISTS idx_stock_entries_created_at ON stock_entries(created_at)',
    );

    this.migrateSchema();
    this.persist();
  }

  private migrateSchema(): void {
    const columns = this.queryAll<{ name: string }>('PRAGMA table_info(sales)');
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has('discount')) {
      this.connection.run(
        'ALTER TABLE sales ADD COLUMN discount REAL NOT NULL DEFAULT 0',
      );
    }

    if (!columnNames.has('customer_name')) {
      this.connection.run(
        "ALTER TABLE sales ADD COLUMN customer_name TEXT NOT NULL DEFAULT ''",
      );
    }

    if (!columnNames.has('payment_method')) {
      this.connection.run(
        "ALTER TABLE sales ADD COLUMN payment_method TEXT NOT NULL DEFAULT ''",
      );
    }

    this.migrateProductsBarcodeOptional();
  }

  private migrateProductsBarcodeOptional(): void {
    const migrated = this.queryOne<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'products_barcode_optional'",
    );

    if (migrated?.value === '1') {
      return;
    }

    const table = this.queryOne<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='products'",
    );

    if (table?.sql?.includes('UNIQUE')) {
      this.connection.run(`
        CREATE TABLE products_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          barcode TEXT NOT NULL DEFAULT '',
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      this.connection.run(`
        INSERT INTO products_new (id, name, barcode, price, quantity, created_at, updated_at)
        SELECT id, name, barcode, price, quantity, created_at, updated_at FROM products
      `);
      this.connection.run('DROP TABLE products');
      this.connection.run('ALTER TABLE products_new RENAME TO products');
    }

    this.connection.run(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('products_barcode_optional', '1')",
    );
  }

  run(sql: string, params: SqlValue[] = []): void {
    this.connection.run(sql, params);
    this.persist();
  }

  runWithoutPersist(sql: string, params: SqlValue[] = []): void {
    this.connection.run(sql, params);
  }

  transaction(fn: () => void): void {
    this.connection.run('BEGIN TRANSACTION');

    try {
      fn();
      this.connection.run('COMMIT');
      this.persist();
    } catch (error) {
      this.connection.run('ROLLBACK');
      throw error;
    }
  }

  queryAll<T extends Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): T[] {
    const stmt = this.connection.prepare(sql);
    stmt.bind(params);

    const rows: T[] = [];

    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }

    stmt.free();
    return rows;
  }

  queryOne<T extends Record<string, SqlValue>>(
    sql: string,
    params: SqlValue[] = [],
  ): T | undefined {
    return this.queryAll<T>(sql, params)[0];
  }

  persist(): void {
    if (!this.db) {
      return;
    }

    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  close(): void {
    this.persist();
    this.db?.close();
    this.db = null;
  }
}
