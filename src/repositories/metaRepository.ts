import type { AppDatabase } from '../database/db';
import { runWrite, type WriteMode } from './repositoryWrite';

export class MetaRepository {
  constructor(private readonly db: AppDatabase) {}

  get(key: string): string | undefined {
    const row = this.db.queryOne<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      [key],
    );

    return row?.value;
  }

  set(key: string, value: string, mode: WriteMode = 'persist'): void {
    runWrite(
      this.db,
      mode,
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      [key, value],
    );
  }
}
