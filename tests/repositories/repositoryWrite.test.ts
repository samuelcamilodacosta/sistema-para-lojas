import { afterEach, describe, expect, it, vi } from 'vitest';
import { runWrite } from '../../src/repositories/repositoryWrite';
import { createTestDb } from '../helpers/testDb';

describe('runWrite', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  afterEach(() => {
    ctx?.cleanup();
  });

  it('persiste quando mode é persist', async () => {
    ctx = await createTestDb();
    const persistSpy = vi.spyOn(ctx.db, 'run');
    runWrite(ctx.db, 'persist', "INSERT INTO meta (key, value) VALUES ('k', 'v')");
    expect(persistSpy).toHaveBeenCalled();
  });

  it('não persiste quando mode é transaction', async () => {
    ctx = await createTestDb();
    const runSpy = vi.spyOn(ctx.db, 'runWithoutPersist');
    runWrite(ctx.db, 'transaction', "INSERT INTO meta (key, value) VALUES ('k2', 'v2')");
    expect(runSpy).toHaveBeenCalled();
  });
});
