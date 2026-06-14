import { randomUUID } from 'crypto';
import { APP_ERROR_CODES, AppError } from '../types/appError';
import type { ProductRepository } from '../repositories/productRepository';
import type { CreateProductInput, Product, UpdateProductInput } from '../types/product';
import type { ProductListQuery, ProductListResult } from '../types/productList';

export class ProductStore {
  constructor(private readonly products: ProductRepository) {}

  list(): Product[] {
    return this.products.findAll();
  }

  listPage(query: ProductListQuery): ProductListResult {
    return this.products.findListPage(query);
  }

  getById(id: string): Product | undefined {
    return this.products.findById(id);
  }

  create(input: CreateProductInput): Product {
    const name = input.name.trim();
    if (!name) {
      throw new AppError(APP_ERROR_CODES.PRODUCT_NAME_REQUIRED);
    }

    const barcode = this.normalizeBarcode(input.barcode ?? '');

    if (input.price < 0) {
      throw new AppError(APP_ERROR_CODES.PRODUCT_PRICE_NEGATIVE);
    }

    if (input.quantity < 0) {
      throw new AppError(APP_ERROR_CODES.PRODUCT_QUANTITY_NEGATIVE);
    }

    this.assertUniqueBarcode(barcode);

    const now = new Date().toISOString();
    const product: Product = {
      id: randomUUID(),
      name,
      barcode,
      price: input.price,
      quantity: input.quantity,
      createdAt: now,
      updatedAt: now,
    };

    this.products.insert(product);

    return product;
  }

  update(input: UpdateProductInput): Product {
    const current = this.getById(input.id);

    if (!current) {
      throw new AppError(APP_ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new AppError(APP_ERROR_CODES.PRODUCT_NAME_REQUIRED);
      }
      current.name = name;
    }

    if (input.barcode !== undefined) {
      const barcode = this.normalizeBarcode(input.barcode);
      this.assertUniqueBarcode(barcode, input.id);
      current.barcode = barcode;
    }

    if (input.price !== undefined) {
      if (input.price < 0) {
        throw new AppError(APP_ERROR_CODES.PRODUCT_PRICE_NEGATIVE);
      }
      current.price = input.price;
    }

    if (input.quantity !== undefined) {
      if (input.quantity < 0) {
        throw new AppError(APP_ERROR_CODES.PRODUCT_QUANTITY_NEGATIVE);
      }
      current.quantity = input.quantity;
    }

    current.updatedAt = new Date().toISOString();

    this.products.update(current);

    return current;
  }

  remove(id: string): void {
    const existing = this.getById(id);

    if (!existing) {
      throw new AppError(APP_ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    this.products.delete(id);
  }

  private normalizeBarcode(value: string): string {
    return value.trim();
  }

  private assertUniqueBarcode(barcode: string, ignoreId?: string): void {
    if (!barcode) {
      return;
    }

    const ownerId = this.products.findOwnerIdByBarcode(barcode);

    if (ownerId && ownerId !== ignoreId) {
      throw new AppError(APP_ERROR_CODES.PRODUCT_DUPLICATE_BARCODE);
    }
  }
}
