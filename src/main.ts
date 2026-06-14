import { app, BrowserWindow, Menu } from 'electron';
import fs from 'fs';
import path from 'path';
import { AppDatabase } from './database/db';
import { resolveDataDir } from './database/getDataDir';
import { migrateFromJsonIfNeeded } from './database/migrateFromJson';
import { registerProductHandlers } from './ipc/productHandlers';
import { registerSaleHandlers } from './ipc/saleHandlers';
import { registerStockEntryHandlers } from './ipc/stockEntryHandlers';
import { ProductStore } from './services/productStore';
import { SaleService } from './services/saleService';
import { StockEntryService } from './services/stockEntryService';
import { ProductRepository } from './repositories/productRepository';
import { SaleRepository } from './repositories/saleRepository';
import { StockEntryRepository } from './repositories/stockEntryRepository';

function setupDevReloader(): void {
  if (app.isPackaged) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('electron-reloader')(module);
  } catch {
    console.log('Recarregamento automático indisponível.');
  }
}

/* v8 ignore next */
setupDevReloader();

let database: AppDatabase | null = null;

function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, '..', 'build', 'icon.png'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: resolveAppIconPath(),
    title: 'Sistema para Lojas',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  /* v8 ignore next */
  const dataDir = resolveDataDir(() => app.getPath('userData'));

  database = new AppDatabase(dataDir);
  await database.init();
  migrateFromJsonIfNeeded(database, dataDir);

  const productRepository = new ProductRepository(database);
  const saleRepository = new SaleRepository(database);
  const stockEntryRepository = new StockEntryRepository(database);

  const productStore = new ProductStore(productRepository);
  const saleService = new SaleService(database, saleRepository, productRepository, productStore);
  const stockEntryService = new StockEntryService(
    database,
    stockEntryRepository,
    productRepository,
    productStore,
  );

  registerProductHandlers(productStore, stockEntryService);
  registerSaleHandlers(saleService);
  registerStockEntryHandlers(stockEntryService);

  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  database?.close();
});
