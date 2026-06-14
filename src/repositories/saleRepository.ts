import type { SqlValue } from 'sql.js';
import type { AppDatabase } from '../database/db';
import type { PaymentMethod, Sale } from '../types/sale';
import type {
  SaleHistoryListQuery,
  SaleHistoryListResult,
  SaleHistorySortColumn,
  SaleHistorySortRule,
} from '../types/saleHistory';
import { runWrite, type WriteMode } from './repositoryWrite';

interface SaleRow extends Record<string, SqlValue> {
  id: string;
  product_id: string;
  product_name: string;
  product_barcode: string;
  unit_price: number;
  quantity: number;
  discount: number;
  total: number;
  sold_at: string;
  customer_name: string;
  payment_method: string;
}

export interface ChartBucketRow {
  bucket: string;
  revenue: number;
  sales_count: number;
}

export interface RangeStatsRow {
  sales: number;
  revenue: number;
}

export interface TopProductRow {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface PaymentMethodBreakdownRow {
  payment_method: string;
  count: number;
  revenue: number;
}

export interface SalePaymentRow {
  id: string;
  payment_method: string;
}

interface ChartBucketDbRow extends Record<string, SqlValue> {
  bucket: string;
  revenue: number;
  sales_count: number;
}

interface RangeStatsDbRow extends Record<string, SqlValue> {
  sales: number;
  revenue: number;
}

interface PaymentMethodBreakdownDbRow extends Record<string, SqlValue> {
  payment_method: string;
  count: number;
  revenue: number;
}

interface SalePaymentDbRow extends Record<string, SqlValue> {
  id: string;
  payment_method: string;
}

interface HistoryAggregateDbRow extends Record<string, SqlValue> {
  total: number;
  revenue: number;
}

const HISTORY_SORT_COLUMNS: Record<SaleHistorySortColumn, string> = {
  date: 'sold_at',
  product: 'product_name COLLATE NOCASE',
  customer: 'customer_name COLLATE NOCASE',
  payment: 'payment_method',
  quantity: 'quantity',
  total: 'total',
};

const DEFAULT_HISTORY_SORT: SaleHistorySortRule[] = [{ column: 'date', direction: 'desc' }];

function mapSale(row: SaleRow): Sale {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productBarcode: row.product_barcode,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    discount: row.discount ?? 0,
    total: row.total,
    soldAt: row.sold_at,
    customerName: row.customer_name ?? '',
    paymentMethod: (row.payment_method ?? '') as PaymentMethod | '',
  };
}

function buildHistoryWhereClause(query: SaleHistoryListQuery): {
  sql: string;
  params: SqlValue[];
} {
  const clauses: string[] = [];
  const params: SqlValue[] = [];

  if (query.dateFrom) {
    clauses.push('substr(sold_at, 1, 10) >= ?');
    params.push(query.dateFrom);
  }

  if (query.dateTo) {
    clauses.push('substr(sold_at, 1, 10) <= ?');
    params.push(query.dateTo);
  }

  if (query.payments && query.payments.length > 0) {
    clauses.push(`payment_method IN (${query.payments.map(() => '?').join(', ')})`);
    params.push(...query.payments);
  }

  const search = query.search?.trim().toLowerCase();

  if (search) {
    const term = `%${search}%`;
    clauses.push(`(
      lower(product_name) LIKE ?
      OR lower(product_barcode) LIKE ?
      OR lower(customer_name) LIKE ?
      OR lower(payment_method) LIKE ?
    )`);
    params.push(term, term, term, term);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildHistoryOrderByClause(sort?: SaleHistorySortRule[]): string {
  const rules = sort && sort.length > 0 ? sort : DEFAULT_HISTORY_SORT;
  const parts = rules.map((rule) => {
    const column = HISTORY_SORT_COLUMNS[rule.column] ?? HISTORY_SORT_COLUMNS.date;
    const direction = rule.direction === 'asc' ? 'ASC' : 'DESC';

    return `${column} ${direction}`;
  });

  parts.push('rowid DESC');

  return `ORDER BY ${parts.join(', ')}`;
}

function normalizeHistoryPage(query: SaleHistoryListQuery): {
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

export class SaleRepository {
  constructor(private readonly db: AppDatabase) {}

  findAll(): Sale[] {
    const rows = this.db.queryAll<SaleRow>(
      'SELECT * FROM sales ORDER BY sold_at DESC, rowid DESC',
    );

    return rows.map(mapSale);
  }

  findHistoryPage(query: SaleHistoryListQuery): SaleHistoryListResult {
    const { sql: whereSql, params } = buildHistoryWhereClause(query);
    const orderBy = buildHistoryOrderByClause(query.sort);
    const { page, pageSize } = normalizeHistoryPage(query);
    const offset = (page - 1) * pageSize;

    const aggregate = this.db.queryOne<HistoryAggregateDbRow>(
      `SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS revenue FROM sales ${whereSql}`,
      params,
    );

    const total = aggregate?.total ?? 0;
    const filteredRevenue = aggregate?.revenue ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const safePage = Math.min(page, totalPages);

    const rows = this.db.queryAll<SaleRow>(
      `SELECT * FROM sales ${whereSql} ${orderBy} LIMIT ? OFFSET ?`,
      [...params, pageSize, (safePage - 1) * pageSize],
    );

    return {
      items: rows.map(mapSale),
      total,
      page: safePage,
      pageSize,
      totalPages,
      filteredRevenue,
    };
  }

  insert(sale: Sale, mode: WriteMode = 'persist'): void {
    runWrite(
      this.db,
      mode,
      `INSERT INTO sales (id, product_id, product_name, product_barcode, unit_price, quantity, discount, total, sold_at, customer_name, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sale.id,
        sale.productId,
        sale.productName,
        sale.productBarcode,
        sale.unitPrice,
        sale.quantity,
        sale.discount,
        sale.total,
        sale.soldAt,
        sale.customerName,
        sale.paymentMethod,
      ],
    );
  }

  findAllWithPaymentMethod(): SalePaymentRow[] {
    return this.db.queryAll<SalePaymentDbRow>(
      'SELECT id, payment_method FROM sales ORDER BY sold_at ASC, id ASC',
    );
  }

  updatePaymentMethod(id: string, paymentMethod: PaymentMethod, mode: WriteMode): void {
    runWrite(this.db, mode, 'UPDATE sales SET payment_method = ? WHERE id = ?', [
      paymentMethod,
      id,
    ]);
  }

  getSummaryTotals(): { totalSales: number; totalRevenue: number } {
    const totals = this.db.queryOne<{ total_sales: number; total_revenue: number }>(`
      SELECT
        COUNT(*) AS total_sales,
        COALESCE(SUM(total), 0) AS total_revenue
      FROM sales
    `);

    return {
      totalSales: totals?.total_sales ?? 0,
      totalRevenue: totals?.total_revenue ?? 0,
    };
  }

  getTodaySummary(todayKey: string): { todaySales: number; todayRevenue: number } {
    const today = this.db.queryOne<{ today_sales: number; today_revenue: number }>(
      `
        SELECT
          COUNT(*) AS today_sales,
          COALESCE(SUM(total), 0) AS today_revenue
        FROM sales
        WHERE substr(sold_at, 1, 10) = ?
      `,
      [todayKey],
    );

    return {
      todaySales: today?.today_sales ?? 0,
      todayRevenue: today?.today_revenue ?? 0,
    };
  }

  getHourlyBuckets(dateKey: string): ChartBucketRow[] {
    return this.db.queryAll<ChartBucketDbRow>(
      `
        SELECT
          substr(sold_at, 12, 2) AS bucket,
          COALESCE(SUM(total), 0) AS revenue,
          COUNT(*) AS sales_count
        FROM sales
        WHERE substr(sold_at, 1, 10) = ?
        GROUP BY bucket
      `,
      [dateKey],
    );
  }

  getDailyBuckets(startKey: string, endKey: string): Map<string, ChartBucketRow> {
    const rows = this.db.queryAll<ChartBucketDbRow>(
      `
        SELECT
          substr(sold_at, 1, 10) AS bucket,
          COALESCE(SUM(total), 0) AS revenue,
          COUNT(*) AS sales_count
        FROM sales
        WHERE substr(sold_at, 1, 10) >= ? AND substr(sold_at, 1, 10) <= ?
        GROUP BY bucket
      `,
      [startKey, endKey],
    );

    return new Map(rows.map((row) => [row.bucket, row]));
  }

  getMonthlyBuckets(year: number): ChartBucketRow[] {
    return this.db.queryAll<ChartBucketDbRow>(
      `
        SELECT
          substr(sold_at, 6, 2) AS bucket,
          COALESCE(SUM(total), 0) AS revenue,
          COUNT(*) AS sales_count
        FROM sales
        WHERE substr(sold_at, 1, 4) = ?
        GROUP BY bucket
      `,
      [String(year)],
    );
  }

  getStatsForRange(startKey: string, endKey: string): RangeStatsRow {
    return (
      this.db.queryOne<RangeStatsDbRow>(
        `
          SELECT
            COUNT(*) AS sales,
            COALESCE(SUM(total), 0) AS revenue
          FROM sales
          WHERE substr(sold_at, 1, 10) >= ? AND substr(sold_at, 1, 10) <= ?
        `,
        [startKey, endKey],
      ) ?? { sales: 0, revenue: 0 }
    );
  }

  getTopProducts(startKey: string, endKey: string, limit: number): TopProductRow[] {
    const rows = this.db.queryAll<{
      product_id: string;
      product_name: string;
      quantity_sold: number;
      revenue: number;
    }>(
      `
        SELECT
          product_id,
          product_name,
          SUM(quantity) AS quantity_sold,
          COALESCE(SUM(total), 0) AS revenue
        FROM sales
        WHERE substr(sold_at, 1, 10) >= ? AND substr(sold_at, 1, 10) <= ?
        GROUP BY product_id, product_name
        ORDER BY revenue DESC, quantity_sold DESC
        LIMIT ?
      `,
      [startKey, endKey, limit],
    );

    return rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      quantitySold: row.quantity_sold,
      revenue: row.revenue,
    }));
  }

  getPaymentBreakdown(startKey: string, endKey: string): PaymentMethodBreakdownRow[] {
    return this.db.queryAll<PaymentMethodBreakdownDbRow>(
      `
        SELECT
          payment_method,
          COUNT(*) AS count,
          COALESCE(SUM(total), 0) AS revenue
        FROM sales
        WHERE substr(sold_at, 1, 10) >= ? AND substr(sold_at, 1, 10) <= ?
        GROUP BY payment_method
      `,
      [startKey, endKey],
    );
  }
}
