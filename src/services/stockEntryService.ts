import { randomUUID } from 'crypto';
import type { AppDatabase } from '../database/db';
import { APP_ERROR_CODES, AppError } from '../types/appError';
import type { ProductRepository } from '../repositories/productRepository';
import type { StockEntryRepository } from '../repositories/stockEntryRepository';
import type { ProductStore } from './productStore';
import type { AdjustStockInput, Product } from '../types/product';
import type {
  CreateStockEntryInput,
  StockEntry,
  StockEntrySummary,
} from '../types/stockEntry';
import type { StockHistoryListQuery, StockHistoryListResult } from '../types/stockHistory';

export class StockEntryService {
  constructor(
    private readonly db: AppDatabase,
    private readonly stockEntries: StockEntryRepository,
    private readonly products: ProductRepository,
    private readonly productStore: ProductStore,
  ) {}

  register(input: CreateStockEntryInput): StockEntry {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new AppError(APP_ERROR_CODES.STOCK_ENTRY_INVALID_QUANTITY);
    }

    let entry!: StockEntry;

    this.db.transaction(() => {
      const product = this.productStore.getById(input.productId);

      if (!product) {
        throw new AppError(APP_ERROR_CODES.PRODUCT_NOT_FOUND);
      }

      const createdAt = new Date().toISOString();
      entry = {
        id: randomUUID(),
        productId: product.id,
        productName: product.name,
        productBarcode: product.barcode,
        quantity: input.quantity,
        note: input.note?.trim() ?? '',
        createdAt,
      };

      this.products.increaseQuantity(product.id, input.quantity, createdAt, 'transaction');
      this.stockEntries.insert(entry, 'transaction');
    });

    return entry;
  }

  adjustStock(input: AdjustStockInput): Product {
    if (!Number.isInteger(input.amount) || input.amount === 0) {
      throw new AppError(APP_ERROR_CODES.STOCK_ENTRY_INVALID_ADJUSTMENT);
    }

    let product!: Product;

    this.db.transaction(() => {
      const current = this.productStore.getById(input.id);

      if (!current) {
        throw new AppError(APP_ERROR_CODES.PRODUCT_NOT_FOUND);
      }

      const nextQuantity = current.quantity + input.amount;

      if (nextQuantity < 0) {
        throw new AppError(APP_ERROR_CODES.STOCK_ENTRY_INSUFFICIENT);
      }

      const createdAt = new Date().toISOString();

      this.products.setQuantity(input.id, nextQuantity, createdAt, 'transaction');

      this.stockEntries.insert(
        {
          id: randomUUID(),
          productId: current.id,
          productName: current.name,
          productBarcode: current.barcode,
          quantity: input.amount,
          note: 'Ajuste manual',
          createdAt,
        },
        'transaction',
      );

      product = {
        ...current,
        quantity: nextQuantity,
        updatedAt: createdAt,
      };
    });

    return product;
  }

  list(): StockEntry[] {
    return this.stockEntries.findAll();
  }

  listHistory(query: StockHistoryListQuery): StockHistoryListResult {
    return this.stockEntries.findHistoryPage(query);
  }

  getSummary(): StockEntrySummary {
    return this.stockEntries.getSummary();
  }
}
