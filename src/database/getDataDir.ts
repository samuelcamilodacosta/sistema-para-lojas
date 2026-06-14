import fs from 'fs';
import path from 'path';

export function getLocalDataDir(): string {
  return path.join(process.cwd(), 'data');
}

export function getLocalDatabasePath(): string {
  return path.join(getLocalDataDir(), 'sistema.db');
}

export function hasLocalDatabase(): boolean {
  return fs.existsSync(getLocalDatabasePath());
}

export function resolveDataDir(getUserData: () => string): string {
  if (hasLocalDatabase()) {
    return getLocalDataDir();
  }

  return getUserData();
}
