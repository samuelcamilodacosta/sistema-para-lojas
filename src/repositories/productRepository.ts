import type { SqlValue } from 'sql.js';
import type { AppDatabase } from '../database/db';
import type { Product } from '../types/product';
import type {
  ProductListQuery,
  ProductListResult,
  ProductSortRule,
  ProductStatusFilter,
} from '../types/productList';
import { runWrite, type WriteMode } from './repositoryWrite';

const LOW_STOCK_THRESHOLD = 5;

interface ProductRow extends Record<string, SqlValue> {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

interface ListAggregateDbRow extends Record<string, SqlValue> {
  total: number;
}

const LIST_SORT_COLUMNS: Record<
  import('../types/productList').ProductSortColumn,
  string
> = {
  name: 'name COLLATE NOCASE',
  price: 'price',
  quantity: 'quantity',
  status: 'status_priority',
};

const DEFAULT_LIST_SORT: ProductSortRule[] = [{ column: 'name', direction: 'asc' }];

const STATUS_SQL: Record<ProductStatusFilter, string> = {
  out: 'quantity = 0',
  low: `quantity > 0 AND quantity <= ${LOW_STOCK_THRESHOLD}`,
  ok: `quantity > ${LOW_STOCK_THRESHOLD}`,
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    price: row.price,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildListWhereClause(query: ProductListQuery): {
  sql: string;
  params: SqlValue[];
} {
  const clauses: string[] = [];
  const params: SqlValue[] = [];

  if (query.statuses && query.statuses.length > 0) {
    const statusClauses = query.statuses.map((status) => STATUS_SQL[status]);
    clauses.push(`(${statusClauses.join(' OR ')})`);
  }

  const search = query.search?.trim().toLowerCase();

  if (search) {
    const term = `%${search}%`;
    clauses.push('(lower(name) LIKE ? OR lower(barcode) LIKE ?)');
    params.push(term, term);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildStatusPriorityExpression(): string {
  return `CASE
    WHEN quantity = 0 THEN 0
    WHEN quantity <= ${LOW_STOCK_THRESHOLD} THEN 1
    ELSE 2
  END`;
}

function buildListOrderByClause(sort?: ProductSortRule[]): string {
  const rules = sort && sort.length > 0 ? sort : DEFAULT_LIST_SORT;
  const parts = rules.map((rule) => {
    if (rule.column === 'status') {
      const direction = rule.direction === 'asc' ? 'ASC' : 'DESC';

      return `${buildStatusPriorityExpression()} ${direction}, quantity ${direction}`;
    }

    const column = LIST_SORT_COLUMNS[rule.column] ?? LIST_SORT_COLUMNS.name;
    const direction = rule.direction === 'asc' ? 'ASC' : 'DESC';

    return `${column} ${direction}`;
  });

  parts.push('name COLLATE NOCASE ASC');

  return `ORDER BY ${parts.join(', ')}`;
}

function normalizeListPage(query: ProductListQuery): {
  page: number;
  pageSize: number;
} {
  const page = Number.isFinite(query.page) && query.page > 0 ? Math.floor(query.page) : 1;
  const pageSize =
    Number.isFinite(query.pageSize) && query.pageSize > 0
      ? Math.min(Math.floor(query.pageSize), 200)
      : 50;

  return { page, pageSize };
}

export class ProductRepository {
  constructor(private readonly db: AppDatabase) {}

  findAll(): Product[] {
    const rows = this.db.queryAll<ProductRow>(
      'SELECT * FROM products ORDER BY name COLLATE NOCASE ASC',
    );

    return rows.map(mapProduct);
  }

  findListPage(query: ProductListQuery): ProductListResult {
    const { sql: whereSql, params } = buildListWhereClause(query);
    const orderBy = buildListOrderByClause(query.sort);
    const { page, pageSize } = normalizeListPage(query);
    const statusPriority = buildStatusPriorityExpression();

    const aggregate = this.db.queryOne<ListAggregateDbRow>(
      `SELECT COUNT(*) AS total FROM products ${whereSql}`,
      params,
    );

    const total = aggregate?.total ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const safePage = Math.min(page, totalPages);

    const rows = this.db.queryAll<ProductRow>(
      `SELECT *, ${statusPriority} AS status_priority FROM products ${whereSql} ${orderBy} LIMIT ? OFFSET ?`,
      [...params, pageSize, (safePage - 1) * pageSize],
    );

    return {
      items: rows.map(mapProduct),
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  findById(id: string): Product | undefined {
    const row = this.db.queryOne<ProductRow>('SELECT * FROM products WHERE id = ?', [id]);
    return row ? mapProduct(row) : undefined;
  }

  findOwnerIdByBarcode(barcode: string): string | undefined {
    const row = this.db.queryOne<{ id: string }>(
      'SELECT id FROM products WHERE barcode = ?',
      [barcode],
    );

    return row?.id;
  }

  count(): number {
    const row = this.db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM products');
    return row?.count ?? 0;
  }

  insert(product: Product, mode: WriteMode = 'persist'): void {
    runWrite(
      this.db,
      mode,
      `INSERT INTO products (id, name, barcode, price, quantity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.name,
        product.barcode,
        product.price,
        product.quantity,
        product.createdAt,
        product.updatedAt,
      ],
    );
  }

  update(product: Product, mode: WriteMode = 'persist'): void {
    runWrite(
      this.db,
      mode,
      `UPDATE products
       SET name = ?, barcode = ?, price = ?, quantity = ?, updated_at = ?
       WHERE id = ?`,
      [
        product.name,
        product.barcode,
        product.price,
        product.quantity,
        product.updatedAt,
        product.id,
      ],
    );
  }

  delete(id: string, mode: WriteMode = 'persist'): void {
    runWrite(this.db, mode, 'DELETE FROM products WHERE id = ?', [id]);
  }

  decreaseQuantity(id: string, amount: number, updatedAt: string, mode: WriteMode): void {
    runWrite(
      this.db,
      mode,
      'UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?',
      [amount, updatedAt, id],
    );
  }

  increaseQuantity(id: string, amount: number, updatedAt: string, mode: WriteMode): void {
    runWrite(
      this.db,
      mode,
      'UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?',
      [amount, updatedAt, id],
    );
  }

  setQuantity(id: string, quantity: number, updatedAt: string, mode: WriteMode): void {
    runWrite(this.db, mode, 'UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?', [
      quantity,
      updatedAt,
      id,
    ]);
  }
}
