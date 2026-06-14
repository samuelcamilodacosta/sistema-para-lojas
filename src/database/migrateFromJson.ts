import { existsSync, readFileSync, renameSync } from 'fs';
import path from 'path';
import type { Product } from '../types/product';
import type { Sale } from '../types/sale';
import type { StockEntry } from '../types/stockEntry';
import { MetaRepository } from '../repositories/metaRepository';
import { ProductRepository } from '../repositories/productRepository';
import { SaleRepository } from '../repositories/saleRepository';
import { StockEntryRepository } from '../repositories/stockEntryRepository';
import type { AppDatabase } from './db';

const META_KEY = 'json_migrated';

function readJsonFile<T>(filePath: string): T[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content) as T[];

  return Array.isArray(parsed) ? parsed : [];
}

function backupFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  renameSync(filePath, `${filePath}.bak`);
}

export function migrateFromJsonIfNeeded(db: AppDatabase, dataDir: string): void {
  const meta = new MetaRepository(db);
  const products = new ProductRepository(db);
  const sales = new SaleRepository(db);
  const stockEntries = new StockEntryRepository(db);

  if (meta.get(META_KEY) === '1') {
    return;
  }

  const productsPath = path.join(dataDir, 'products.json');
  const salesPath = path.join(dataDir, 'sales.json');
  const entriesPath = path.join(dataDir, 'stock-entries.json');

  const hasJson =
    existsSync(productsPath) || existsSync(salesPath) || existsSync(entriesPath);

  if (!hasJson) {
    meta.set(META_KEY, '1');
    return;
  }

  if (products.count() > 0) {
    meta.set(META_KEY, '1');
    return;
  }

  const productRows = readJsonFile<Product>(productsPath).map((product) => ({
    ...product,
    barcode: product.barcode ?? '',
  }));
  const saleRows = readJsonFile<Sale>(salesPath);
  const entryRows = readJsonFile<StockEntry>(entriesPath).map((entry) => ({
    ...entry,
    note: entry.note ?? '',
  }));

  db.transaction(() => {
    for (const product of productRows) {
      products.insert(product, 'transaction');
    }

    for (const sale of saleRows) {
      sales.insert(
        {
          ...sale,
          discount: sale.discount ?? 0,
          customerName: sale.customerName ?? '',
          paymentMethod: sale.paymentMethod ?? '',
        },
        'transaction',
      );
    }

    for (const entry of entryRows) {
      stockEntries.insert(entry, 'transaction');
    }
  });

  backupFile(productsPath);
  backupFile(salesPath);
  backupFile(entriesPath);
  meta.set(META_KEY, '1');
}
