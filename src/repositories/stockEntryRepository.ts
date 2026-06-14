import type { SqlValue } from 'sql.js';
import type { AppDatabase } from '../database/db';
import type { StockEntry, StockEntrySummary } from '../types/stockEntry';
import type {
  StockEntrySortRule,
  StockHistoryListQuery,
  StockHistoryListResult,
  StockMovementFilter,
} from '../types/stockHistory';
import { runWrite, type WriteMode } from './repositoryWrite';

interface StockEntryRow extends Record<string, SqlValue> {
  id: string;
  product_id: string;
  product_name: string;
  product_barcode: string;
  quantity: number;
  note: string;
  created_at: string;
}

interface HistoryAggregateDbRow extends Record<string, SqlValue> {
  total: number;
}

const HISTORY_SORT_COLUMNS: Record<
  import('../types/stockHistory').StockEntrySortColumn,
  string
> = {
  date: 'created_at',
  name: 'product_name COLLATE NOCASE',
  quantity: 'quantity',
};

const DEFAULT_HISTORY_SORT: StockEntrySortRule[] = [{ column: 'date', direction: 'desc' }];

const MOVEMENT_SQL: Record<StockMovementFilter, string> = {
  purchase: "(quantity > 0 AND note != 'Ajuste manual')",
  adjustment: "note = 'Ajuste manual'",
  outbound: 'quantity < 0',
};

function mapStockEntry(row: StockEntryRow): StockEntry {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productBarcode: row.product_barcode,
    quantity: row.quantity,
    note: row.note,
    createdAt: row.created_at,
  };
}

function buildHistoryWhereClause(query: StockHistoryListQuery): {
  sql: string;
  params: SqlValue[];
} {
  const clauses: string[] = [];
  const params: SqlValue[] = [];

  if (query.dateFrom) {
    clauses.push('substr(created_at, 1, 10) >= ?');
    params.push(query.dateFrom);
  }

  if (query.dateTo) {
    clauses.push('substr(created_at, 1, 10) <= ?');
    params.push(query.dateTo);
  }

  if (query.movements && query.movements.length > 0) {
    const movementClauses = query.movements.map((movement) => MOVEMENT_SQL[movement]);
    clauses.push(`(${movementClauses.join(' OR ')})`);
  }

  const search = query.search?.trim().toLowerCase();

  if (search) {
    const term = `%${search}%`;
    clauses.push(`(
      lower(product_name) LIKE ?
      OR lower(product_barcode) LIKE ?
      OR lower(note) LIKE ?
    )`);
    params.push(term, term, term);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildHistoryOrderByClause(sort?: StockEntrySortRule[]): string {
  const rules = sort && sort.length > 0 ? sort : DEFAULT_HISTORY_SORT;
  const parts = rules.map((rule) => {
    const column = HISTORY_SORT_COLUMNS[rule.column] ?? HISTORY_SORT_COLUMNS.date;
    const direction = rule.direction === 'asc' ? 'ASC' : 'DESC';

    return `${column} ${direction}`;
  });

  parts.push('rowid DESC');

  return `ORDER BY ${parts.join(', ')}`;
}

function normalizeHistoryPage(query: StockHistoryListQuery): {
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

export class StockEntryRepository {
  constructor(private readonly db: AppDatabase) {}

  findAll(): StockEntry[] {
    const rows = this.db.queryAll<StockEntryRow>(
      'SELECT * FROM stock_entries ORDER BY created_at DESC',
    );

    return rows.map(mapStockEntry);
  }

  findHistoryPage(query: StockHistoryListQuery): StockHistoryListResult {
    const { sql: whereSql, params } = buildHistoryWhereClause(query);
    const orderBy = buildHistoryOrderByClause(query.sort);
    const { page, pageSize } = normalizeHistoryPage(query);

    const aggregate = this.db.queryOne<HistoryAggregateDbRow>(
      `SELECT COUNT(*) AS total FROM stock_entries ${whereSql}`,
      params,
    );

    const total = aggregate?.total ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const safePage = Math.min(page, totalPages);

    const rows = this.db.queryAll<StockEntryRow>(
      `SELECT * FROM stock_entries ${whereSql} ${orderBy} LIMIT ? OFFSET ?`,
      [...params, pageSize, (safePage - 1) * pageSize],
    );

    return {
      items: rows.map(mapStockEntry),
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  insert(entry: StockEntry, mode: WriteMode = 'persist'): void {
    runWrite(
      this.db,
      mode,
      `INSERT INTO stock_entries (id, product_id, product_name, product_barcode, quantity, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.productId,
        entry.productName,
        entry.productBarcode,
        entry.quantity,
        entry.note,
        entry.createdAt,
      ],
    );
  }

  getSummary(): StockEntrySummary {
    const monthKey = new Date().toISOString().slice(0, 7);

    const totals = this.db.queryOne<{ total_entries: number; total_items_added: number }>(`
      SELECT
        COUNT(*) AS total_entries,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0) AS total_items_added
      FROM stock_entries
    `);

    const month = this.db.queryOne<{ month_entries: number; month_items_added: number }>(
      `
        SELECT
          COUNT(*) AS month_entries,
          COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0) AS month_items_added
        FROM stock_entries
        WHERE substr(created_at, 1, 7) = ?
      `,
      [monthKey],
    );

    return {
      totalEntries: totals?.total_entries ?? 0,
      totalItemsAdded: totals?.total_items_added ?? 0,
      monthEntries: month?.month_entries ?? 0,
      monthItemsAdded: month?.month_items_added ?? 0,
    };
  }
}
