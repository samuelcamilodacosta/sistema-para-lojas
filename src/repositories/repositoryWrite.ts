import type { SqlValue } from 'sql.js';
import type { AppDatabase } from '../database/db';

export type WriteMode = 'persist' | 'transaction';

export function runWrite(
  db: AppDatabase,
  mode: WriteMode,
  sql: string,
  params: SqlValue[] = [],
): void {
  if (mode === 'transaction') {
    db.runWithoutPersist(sql, params);
  } else {
    db.run(sql, params);
  }
}
