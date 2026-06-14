import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWindow = {
  loadFile: vi.fn(),
};

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    getPath: vi.fn(() => '/tmp/userdata'),
    quit: vi.fn(),
  },
  Menu: {
    setApplicationMenu: vi.fn(),
  },
  BrowserWindow: Object.assign(
    vi.fn(function BrowserWindow() {
      return mockWindow;
    }),
    { getAllWindows: vi.fn(() => [mockWindow]) },
  ),
  ipcMain: { handle: vi.fn() },
}));

vi.mock('./database/db', () => ({
  AppDatabase: vi.fn(function AppDatabase() {
    return {
      init: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    };
  }),
}));

vi.mock('./database/getDataDir', () => ({
  resolveDataDir: vi.fn(() => '/tmp/data'),
}));

vi.mock('./database/migrateFromJson', () => ({
  migrateFromJsonIfNeeded: vi.fn(),
}));

vi.mock('./ipc/productHandlers', () => ({
  registerProductHandlers: vi.fn(),
}));

vi.mock('./ipc/saleHandlers', () => ({
  registerSaleHandlers: vi.fn(),
}));

vi.mock('./ipc/stockEntryHandlers', () => ({
  registerStockEntryHandlers: vi.fn(),
}));

describe('main process', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const electron = await import('electron');
    electron.app.isPackaged = true;
  });

  it('inicializa aplicativo electron', async () => {
    await import('./main');
    const { app, BrowserWindow } = await import('electron');

    expect(app.whenReady).toHaveBeenCalled();
    const readyPromise = app.whenReady.mock.results[0]?.value as Promise<void>;
    await readyPromise;
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }

    expect(BrowserWindow).toHaveBeenCalled();
    expect(mockWindow.loadFile).toHaveBeenCalled();

    const { registerProductHandlers } = await import('./ipc/productHandlers');
    const { migrateFromJsonIfNeeded } = await import('./database/migrateFromJson');
    const { Menu } = await import('electron');
    await vi.waitFor(() => expect(registerProductHandlers).toHaveBeenCalled());
    expect(migrateFromJsonIfNeeded).toHaveBeenCalled();
    expect(Menu.setApplicationMenu).toHaveBeenCalledWith(null);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const activateHandler = app.on.mock.calls.find(([event]) => event === 'activate')?.[1] as () => void;
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([]);
    activateHandler?.();
    expect(BrowserWindow).toHaveBeenCalledTimes(2);

    vi.mocked(BrowserWindow.getAllWindows).mockReturnValueOnce([mockWindow]);
    activateHandler?.();
    expect(BrowserWindow).toHaveBeenCalledTimes(2);

    const windowClosedHandler = app.on.mock.calls.find(
      ([event]) => event === 'window-all-closed',
    )?.[1] as () => void;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    windowClosedHandler?.();
    expect(app.quit).toHaveBeenCalled();

    const willQuitHandler = app.on.mock.calls.find(([event]) => event === 'will-quit')?.[1] as () => void;
    willQuitHandler?.();
  });
});

describe('dev reloader', () => {
  it('ignora falha do reloader quando require falha', async () => {
    vi.doMock('electron-reloader', () => {
      throw new Error('reloader indisponível');
    });
    vi.resetModules();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const electron = await import('electron');
    electron.app.isPackaged = false;

    await import('./main');
    expect(logSpy).toHaveBeenCalledWith('Recarregamento automático indisponível.');
    logSpy.mockRestore();
  });

});

describe('darwin window-all-closed', () => {
  it('não encerra app no macOS', async () => {
    vi.resetModules();
    const { app } = await import('electron');
    app.isPackaged = true;

    await import('./main');
    await app.whenReady.mock.results[0]?.value;

    const handler = app.on.mock.calls.find(([event]) => event === 'window-all-closed')?.[1] as () => void;
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    handler?.();
    expect(app.quit).not.toHaveBeenCalled();
  });
});

describe('renderer bootstrap', () => {
  it('inicializa aplicação renderer', async () => {
    window.electronAPI = {
      products: {
        list: vi.fn().mockResolvedValue([]),
        listPage: vi.fn().mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        }),
      },
      sales: {
        list: vi.fn().mockResolvedValue([]),
        summary: vi.fn().mockResolvedValue({
          totalSales: 0,
          totalRevenue: 0,
          todaySales: 0,
          todayRevenue: 0,
        }),
        listHistory: vi.fn().mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
          filteredRevenue: 0,
        }),
        chart: vi.fn().mockResolvedValue({
          period: 'week',
          dateFrom: '2026-06-07',
          dateTo: '2026-06-13',
          points: [],
          totalRevenue: 0,
          totalSales: 0,
        }),
        dashboard: vi.fn().mockResolvedValue({
          period: 'week',
          dateFrom: '2026-06-07',
          dateTo: '2026-06-13',
          today: {
            sales: 0,
            revenue: 0,
            ticketAverage: 0,
            salesChangePercent: null,
            revenueChangePercent: null,
          },
          periodComparison: {
            salesChangePercent: null,
            revenueChangePercent: null,
          },
          topProducts: [],
          paymentMethods: [],
        }),
        register: vi.fn(),
        registerBatch: vi.fn(),
      },
      stockEntries: {
        list: vi.fn().mockResolvedValue([]),
        summary: vi.fn().mockResolvedValue({
          totalEntries: 0,
          totalItemsAdded: 0,
          monthEntries: 0,
          monthItemsAdded: 0,
        }),
        listHistory: vi.fn().mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        }),
        register: vi.fn(),
      },
    } as unknown as Window['electronAPI'];

    sessionStorage.setItem('sistema:last-route', 'dashboard');
    vi.resetModules();
    await import('./renderer/index');
    await vi.waitFor(() => expect(window.electronAPI.products.list).toHaveBeenCalled());

    for (const route of ['estoque', 'vendas', 'historico-vendas', 'historico-estoque']) {
      (document.querySelector(`[data-route="${route}"]`) as HTMLElement).click();
      await vi.waitFor(() =>
        expect(document.getElementById(`screen-${route}`)?.classList.contains('active')).toBe(true),
      );
    }
  });

  it('propaga erro de refresh manualmente', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getErrorMessage } = await import('./renderer/utils/format');
    const { productState } = await import('./renderer/state/productState');
    const { saleState } = await import('./renderer/state/saleState');
    const { stockEntryState } = await import('./renderer/state/stockEntryState');

    vi.mocked(window.electronAPI.products.list).mockRejectedValue(new Error('falha de rede'));

    await Promise.all([
      productState.refresh(),
      saleState.refresh(),
      stockEntryState.refresh(),
    ]).catch((error) => {
      console.error(getErrorMessage(error, 'Erro ao carregar dados.'));
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
