/**
 * Captura screenshots das telas principais para o README.
 * Gera combinações pt/en × tema claro/escuro com janela maximizada.
 * Uso: npm run screenshots
 */
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const outDir = path.join(root, 'docs', 'screenshots');

const { AppDatabase } = require(path.join(distDir, 'database', 'db'));
const { resolveDataDir } = require(path.join(distDir, 'database', 'getDataDir'));
const { migrateFromJsonIfNeeded } = require(path.join(distDir, 'database', 'migrateFromJson'));
const { registerProductHandlers } = require(path.join(distDir, 'ipc', 'productHandlers'));
const { registerSaleHandlers } = require(path.join(distDir, 'ipc', 'saleHandlers'));
const { registerStockEntryHandlers } = require(path.join(distDir, 'ipc', 'stockEntryHandlers'));
const { ProductStore } = require(path.join(distDir, 'services', 'productStore'));
const { SaleService } = require(path.join(distDir, 'services', 'saleService'));
const { StockEntryService } = require(path.join(distDir, 'services', 'stockEntryService'));
const { ProductRepository } = require(path.join(distDir, 'repositories', 'productRepository'));
const { SaleRepository } = require(path.join(distDir, 'repositories', 'saleRepository'));
const { StockEntryRepository } = require(path.join(distDir, 'repositories', 'stockEntryRepository'));

const CAPTURES = [
  { route: 'dashboard', file: 'dashboard.png', waitMs: 2800 },
  { route: 'estoque', file: 'estoque.png', waitMs: 1400 },
  { route: 'vendas', file: 'vendas.png', waitMs: 1400 },
  { route: 'historico-vendas', file: 'historico-vendas.png', waitMs: 1400 },
  { route: 'historico-estoque', file: 'historico-estoque.png', waitMs: 1400 },
];

const VARIANTS = [
  { locale: 'pt', theme: 'dark', dir: 'pt-dark', label: 'Português · tema escuro' },
  { locale: 'pt', theme: 'light', dir: 'pt-light', label: 'Português · tema claro' },
  { locale: 'en', theme: 'dark', dir: 'en-dark', label: 'English · dark theme' },
  { locale: 'en', theme: 'light', dir: 'en-light', label: 'English · light theme' },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function navigateToRoute(window, route) {
  await window.webContents.executeJavaScript(`
    (async () => {
      const route = ${JSON.stringify(route)};
      const link = document.querySelector('.nav-link[data-route="' + route + '"]');
      if (link) {
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    })();
  `);
}

async function applyPreferences(window, locale, theme) {
  await window.webContents.executeJavaScript(`
    localStorage.setItem('sistema:locale', ${JSON.stringify(locale)});
    localStorage.setItem('sistema:theme', ${JSON.stringify(theme)});
  `);
  await window.webContents.reload();
  await delay(1800);
}

function removeLegacyFlatScreenshots() {
  for (const capture of CAPTURES) {
    const legacy = path.join(outDir, capture.file);

    if (fs.existsSync(legacy)) {
      fs.unlinkSync(legacy);
    }
  }
}

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  removeLegacyFlatScreenshots();

  const dataDir = resolveDataDir(() => app.getPath('userData'));
  const database = new AppDatabase(dataDir);
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

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const window = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      preload: path.join(distDir, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.maximize();
  window.show();

  await window.loadFile(path.join(distDir, 'index.html'));
  await delay(1500);

  for (const variant of VARIANTS) {
    const variantDir = path.join(outDir, variant.dir);
    fs.mkdirSync(variantDir, { recursive: true });

    console.log(`[screenshots] ${variant.label}`);
    await applyPreferences(window, variant.locale, variant.theme);

    for (const capture of CAPTURES) {
      await navigateToRoute(window, capture.route);
      await delay(capture.waitMs);

      const image = await window.capturePage();
      const target = path.join(variantDir, capture.file);
      fs.writeFileSync(target, image.toPNG());
      console.log(`[screenshots] Salvo: docs/screenshots/${variant.dir}/${capture.file}`);
    }
  }

  await window.close();
  app.quit();
});

app.on('window-all-closed', () => {
  app.quit();
});
