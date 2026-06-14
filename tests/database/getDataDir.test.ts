import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLocalDataDir,
  getLocalDatabasePath,
  hasLocalDatabase,
  resolveDataDir,
} from '../../src/database/getDataDir';

describe('getDataDir', () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(originalCwd);
  });

  it('resolve diretórios locais', () => {
    expect(getLocalDataDir()).toBe(path.join(process.cwd(), 'data'));
    expect(getLocalDatabasePath()).toBe(path.join(process.cwd(), 'data', 'sistema.db'));
  });

  it('detecta banco local existente', () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    expect(hasLocalDatabase()).toBe(true);
    expect(existsSpy).toHaveBeenCalledWith(getLocalDatabasePath());
  });

  it('usa userData quando não há banco local', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const userData = path.join(os.tmpdir(), 'userdata-test');
    expect(resolveDataDir(() => userData)).toBe(userData);
  });

  it('usa data local quando banco existe', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    expect(resolveDataDir(() => '/ignored')).toBe(getLocalDataDir());
  });
});
