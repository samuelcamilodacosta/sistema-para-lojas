import fs from 'fs';
import os from 'os';
import path from 'path';
import { AppDatabase } from '../../src/database/db';

export interface TestDbContext {
  db: AppDatabase;
  dataDir: string;
  cleanup: () => void;
}

export async function createTestDb(): Promise<TestDbContext> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-test-'));
  const db = new AppDatabase(dataDir);
  await db.init();

  return {
    db,
    dataDir,
    cleanup: () => {
      db.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
