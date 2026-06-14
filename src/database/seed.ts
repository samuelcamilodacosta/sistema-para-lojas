import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { AppDatabase } from './db';
import { getLocalDataDir } from './getDataDir';
import { MetaRepository } from '../repositories/metaRepository';
import { ProductRepository } from '../repositories/productRepository';
import { SaleRepository } from '../repositories/saleRepository';
import { StockEntryRepository } from '../repositories/stockEntryRepository';
import type { PaymentMethod } from '../types/sale';
import type { Product } from '../types/product';

interface SeedProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
}

interface SeedSale {
  productId: string;
  productName: string;
  productBarcode: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  soldAt: string;
  customerName?: string;
  paymentMethod: PaymentMethod;
}

interface SeedStockEntry {
  productId: string;
  productName: string;
  productBarcode: string;
  quantity: number;
  note: string;
  createdAt: string;
}

const PRODUCTS: SeedProduct[] = [
  { id: 'prod-001', name: 'Camiseta básica branca', barcode: '7891000000010', price: 49.9, quantity: 52 },
  { id: 'prod-002', name: 'Camiseta básica preta', barcode: '7891000000027', price: 49.9, quantity: 41 },
  { id: 'prod-003', name: 'Camiseta polo masculina', barcode: '7891000000034', price: 79.9, quantity: 28 },
  { id: 'prod-004', name: 'Regata feminina', barcode: '7891000000041', price: 39.9, quantity: 19 },
  { id: 'prod-005', name: 'Calça jeans slim masculina', barcode: '7891000000058', price: 159.9, quantity: 22 },
  { id: 'prod-006', name: 'Calça jeans feminina', barcode: '7891000000065', price: 149.9, quantity: 17 },
  { id: 'prod-007', name: 'Calça social masculina', barcode: '7891000000072', price: 189.9, quantity: 11 },
  { id: 'prod-008', name: 'Legging fitness', barcode: '7891000000089', price: 69.9, quantity: 36 },
  { id: 'prod-009', name: 'Shorts jeans', barcode: '7891000000096', price: 89.9, quantity: 24 },
  { id: 'prod-010', name: 'Vestido floral', barcode: '7891000000102', price: 179.9, quantity: 9 },
  { id: 'prod-011', name: 'Vestido preto básico', barcode: '7891000000119', price: 129.9, quantity: 14 },
  { id: 'prod-012', name: 'Saia midi plissada', barcode: '7891000000126', price: 99.9, quantity: 12 },
  { id: 'prod-013', name: 'Blusa manga longa', barcode: '7891000000133', price: 89.9, quantity: 21 },
  { id: 'prod-014', name: 'Camisa social masculina', barcode: '7891000000140', price: 119.9, quantity: 16 },
  { id: 'prod-015', name: 'Moletom com capuz', barcode: '7891000000157', price: 129.9, quantity: 8 },
  { id: 'prod-016', name: 'Jaqueta jeans', barcode: '7891000000164', price: 199.9, quantity: 7 },
  { id: 'prod-017', name: 'Corta-vento impermeável', barcode: '7891000000171', price: 249.9, quantity: 5 },
  { id: 'prod-018', name: 'Tênis casual', barcode: '7891000000188', price: 219.9, quantity: 13 },
  { id: 'prod-019', name: 'Tênis esportivo', barcode: '7891000000195', price: 289.9, quantity: 6 },
  { id: 'prod-020', name: 'Sandália rasteira', barcode: '7891000000201', price: 59.9, quantity: 27 },
  { id: 'prod-021', name: 'Chinelo slide', barcode: '7891000000218', price: 34.9, quantity: 48 },
  { id: 'prod-022', name: 'Boné aba reta', barcode: '7891000000225', price: 39.9, quantity: 18 },
  { id: 'prod-023', name: 'Cinto couro sintético', barcode: '7891000000232', price: 59.9, quantity: 25 },
  { id: 'prod-024', name: 'Kit 3 pares de meias', barcode: '7891000000249', price: 29.9, quantity: 62 },
  { id: 'prod-025', name: 'Mochila escolar', barcode: '7891000000256', price: 89.9, quantity: 10 },
  { id: 'prod-026', name: 'Bolsa transversal', barcode: '7891000000263', price: 149.9, quantity: 6 },
  { id: 'prod-027', name: 'Óculos de sol', barcode: '7891000000270', price: 79.9, quantity: 15 },
  { id: 'prod-028', name: 'Relógio digital', barcode: '7891000000287', price: 129.9, quantity: 4 },
  { id: 'prod-029', name: 'Bermuda tactel', barcode: '7891000000294', price: 64.9, quantity: 30 },
  { id: 'prod-030', name: 'Casaco meia-estação', barcode: '7891000000300', price: 199.9, quantity: 16 },
  { id: 'prod-031', name: 'Ecobag personalizada', barcode: '', price: 24.9, quantity: 15 },
  { id: 'prod-032', name: 'Blazer feminino', barcode: '7891000000324', price: 219.9, quantity: 9 },
  { id: 'prod-033', name: 'Calça jogger', barcode: '7891000000331', price: 99.9, quantity: 20 },
  { id: 'prod-034', name: 'Top fitness', barcode: '7891000000348', price: 54.9, quantity: 32 },
  { id: 'prod-035', name: 'Pijama flanela', barcode: '7891000000355', price: 119.9, quantity: 14 },
  { id: 'prod-036', name: 'Cachecol de lã', barcode: '7891000000362', price: 69.9, quantity: 18 },
  { id: 'prod-037', name: 'Luvas térmicas', barcode: '7891000000379', price: 44.9, quantity: 22 },
  { id: 'prod-038', name: 'Carteira masculina', barcode: '7891000000386', price: 89.9, quantity: 11 },
  { id: 'prod-039', name: 'Necessaire viagem', barcode: '7891000000393', price: 49.9, quantity: 26 },
  { id: 'prod-040', name: 'Kit presente perfume + body splash', barcode: '7891000000409', price: 159.9, quantity: 8 },
];

const productById = Object.fromEntries(PRODUCTS.map((product) => [product.id, product]));

const CUSTOMER_NAMES = [
  'Maria Silva',
  'João Pedro',
  'Ana Costa',
  'Carlos Mendes',
  'Juliana Ramos',
  'Pedro Oliveira',
  'Fernanda Lima',
  'Lucas Souza',
  'Beatriz Alves',
  'Rafael Santos',
  'Camila Rocha',
  'Bruno Ferreira',
  'Patrícia Gomes',
  'Diego Martins',
  'Larissa Nunes',
];

const POPULAR_PRODUCT_IDS = new Set([
  'prod-001',
  'prod-002',
  'prod-003',
  'prod-005',
  'prod-008',
  'prod-018',
  'prod-021',
  'prod-024',
  'prod-029',
  'prod-034',
]);

const STOCK_ENTRY_NOTES = [
  'Compra mensal — fornecedor principal',
  'Reposição de vitrine',
  'Pedido atacado',
  'Entrada pós-inventário',
  'Compra promocional',
  'Renovação de coleção',
  'Ajuste de estoque mínimo',
  'Lote sazonal',
];

const TODAY_SALES_TARGET = 58;

function daysAgo(days: number, hour = 10, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function dateAt(year: number, month: number, day: number, hour: number, minute: number): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function hashToUnit(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function seasonalMultiplier(month: number): number {
  const factors = [0.85, 0.92, 1.0, 0.96, 1.02, 1.18, 1.08, 0.98, 1.06, 1.12, 1.38, 1.48];
  return factors[month - 1] ?? 1;
}

function pickProduct(seed: number): SeedProduct {
  const weightedIds: string[] = [];

  for (const product of PRODUCTS) {
    let weight = 1;
    if (POPULAR_PRODUCT_IDS.has(product.id)) {
      weight = 4;
    } else if (product.price < 55) {
      weight = 2;
    }

    for (let index = 0; index < weight; index += 1) {
      weightedIds.push(product.id);
    }
  }

  const productId = weightedIds[Math.floor(hashToUnit(seed) * weightedIds.length)];
  return productById[productId];
}

function pickPayment(seed: number): PaymentMethod {
  const value = hashToUnit(seed);
  if (value < 0.45) {
    return 'pix';
  }
  if (value < 0.78) {
    return 'debito_credito';
  }
  return 'dinheiro';
}

function pickCustomer(seed: number): string {
  if (hashToUnit(seed) < 0.32) {
    return '';
  }

  return CUSTOMER_NAMES[Math.floor(hashToUnit(seed + 17) * CUSTOMER_NAMES.length)];
}

function pickStoreHour(seed: number, peakHours: boolean): number {
  const hourWeights: Array<[number, number]> = peakHours
    ? [
        [8, 1],
        [9, 3],
        [10, 5],
        [11, 6],
        [12, 8],
        [13, 7],
        [14, 6],
        [15, 5],
        [16, 6],
        [17, 8],
        [18, 9],
        [19, 7],
        [20, 4],
        [21, 2],
      ]
    : [
        [9, 2],
        [10, 4],
        [11, 5],
        [12, 6],
        [13, 5],
        [14, 4],
        [15, 4],
        [16, 5],
        [17, 6],
        [18, 5],
        [19, 4],
        [20, 2],
      ];

  const total = hourWeights.reduce((sum, [, weight]) => sum + weight, 0);
  let remaining = hashToUnit(seed) * total;

  for (const [hour, weight] of hourWeights) {
    remaining -= weight;
    if (remaining <= 0) {
      return hour;
    }
  }

  /* v8 ignore next -- fallback defensivo; loop sempre retorna com pesos positivos */
  return hourWeights[hourWeights.length - 1][0];
}

function salesCountForDay(year: number, month: number, day: number): number {
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const base = isWeekend ? 24 : 18;
  const noise = 0.62 + hashToUnit(year * 10000 + month * 100 + day) * 0.76;
  return Math.max(10, Math.round(base * seasonalMultiplier(month) * noise));
}

function makeSale(
  productId: string,
  quantity: number,
  discount: number,
  soldAt: string,
  customerName = '',
  paymentMethod: PaymentMethod = 'dinheiro',
): SeedSale {
  const product = productById[productId];

  return {
    productId,
    productName: product.name,
    productBarcode: product.barcode,
    unitPrice: product.price,
    quantity,
    discount,
    soldAt,
    customerName,
    paymentMethod,
  };
}

function appendGeneratedSale(sales: SeedSale[], soldAt: string, seed: number): void {
  const product = pickProduct(seed);
  const maxQty = product.price > 160 ? 2 : 4;
  const quantity = 1 + Math.floor(hashToUnit(seed * 3) * maxQty);
  const hasDiscount = hashToUnit(seed * 5) < 0.14;
  const discount = hasDiscount
    ? Math.round(product.price * quantity * (0.05 + hashToUnit(seed * 7) * 0.18) * 100) / 100
    : 0;

  sales.push(
    makeSale(
      product.id,
      quantity,
      discount,
      soldAt,
      pickCustomer(seed),
      pickPayment(seed),
    ),
  );
}

function generateSalesForDay(
  sales: SeedSale[],
  year: number,
  month: number,
  day: number,
  count: number,
  seedCounter: { value: number },
  peakHours: boolean,
): void {
  for (let index = 0; index < count; index += 1) {
    seedCounter.value += 1;
    const seed = seedCounter.value;
    const hour = pickStoreHour(seed, peakHours);
    const minute = Math.floor(hashToUnit(seed * 11) * 60);
    appendGeneratedSale(sales, dateAt(year, month, day, hour, minute), seed);
  }
}

export function buildSeedSales(): SeedSale[] {
  const sales: SeedSale[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayDay = now.getDate();
  const seedCounter = { value: 0 };

  generateSalesForDay(sales, year, currentMonth, todayDay, TODAY_SALES_TARGET, seedCounter, true);

  for (let month = 1; month <= currentMonth; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const lastDay = month === currentMonth ? todayDay : daysInMonth;

    for (let day = 1; day <= lastDay; day += 1) {
      if (month === currentMonth && day === todayDay) {
        continue;
      }

      generateSalesForDay(
        sales,
        year,
        month,
        day,
        salesCountForDay(year, month, day),
        seedCounter,
        false,
      );
    }
  }

  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year - 1, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const count = Math.max(8, Math.round(salesCountForDay(year - 1, month, day) * 0.82));
      generateSalesForDay(sales, year - 1, month, day, count, seedCounter, false);
    }
  }

  return sales;
}

function pickEntry(productId: string) {
  const product = productById[productId];

  return {
    productName: product.name,
    productBarcode: product.barcode,
  };
}

export function buildSeedStockEntries(): SeedStockEntry[] {
  const entries: SeedStockEntry[] = [];
  const now = new Date();
  const year = now.getFullYear();

  for (const product of PRODUCTS) {
    entries.push({
      productId: product.id,
      ...pickEntry(product.id),
      quantity: 20 + Math.floor(hashToUnit(product.id.length * 17) * 80),
      note: 'Estoque inicial — abertura da loja',
      createdAt: dateAt(year - 1, 1, 8, 8, 30),
    });
  }

  for (let daysBack = 1; daysBack <= 180; daysBack += 1) {
    if (hashToUnit(daysBack * 19) > 0.42) {
      continue;
    }

    const entriesToday = 1 + Math.floor(hashToUnit(daysBack * 23) * 3);

    for (let index = 0; index < entriesToday; index += 1) {
      const seed = daysBack * 10 + index;
      const product = PRODUCTS[Math.floor(hashToUnit(seed) * PRODUCTS.length)];
      const hour = 8 + Math.floor(hashToUnit(seed * 3) * 10);
      const minute = Math.floor(hashToUnit(seed * 5) * 60);

      entries.push({
        productId: product.id,
        ...pickEntry(product.id),
        quantity: 8 + Math.floor(hashToUnit(seed * 7) * 72),
        note: STOCK_ENTRY_NOTES[Math.floor(hashToUnit(seed * 13) * STOCK_ENTRY_NOTES.length)],
        createdAt: daysAgo(daysBack, hour, minute),
      });
    }
  }

  for (let month = 1; month <= 12; month += 1) {
    const day = 3 + (month % 5);
    const product = PRODUCTS[(month * 3) % PRODUCTS.length];

    entries.push({
      productId: product.id,
      ...pickEntry(product.id),
      quantity: 15 + month * 4,
      note: `Reposição programada — mês ${month}`,
      createdAt: dateAt(year, month, day, 9, 15),
    });
  }

  return entries;
}

export async function seedDatabase(dataDir: string): Promise<void> {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'sistema.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new AppDatabase(dataDir);
  await db.init();

  const meta = new MetaRepository(db);
  const productRepository = new ProductRepository(db);
  const saleRepository = new SaleRepository(db);
  const stockEntryRepository = new StockEntryRepository(db);

  const now = new Date().toISOString();
  const sales = buildSeedSales();
  const stockEntries = buildSeedStockEntries();

  db.transaction(() => {
    meta.set('json_migrated', '1', 'transaction');

    for (const product of PRODUCTS) {
      const row: Product = {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        quantity: product.quantity,
        createdAt: now,
        updatedAt: now,
      };

      productRepository.insert(row, 'transaction');
    }

    for (const entry of stockEntries) {
      stockEntryRepository.insert(
        {
          id: randomUUID(),
          productId: entry.productId,
          productName: entry.productName,
          productBarcode: entry.productBarcode,
          quantity: entry.quantity,
          note: entry.note,
          createdAt: entry.createdAt,
        },
        'transaction',
      );
    }

    for (const sale of sales) {
      const subtotal = sale.unitPrice * sale.quantity;
      const total = subtotal - sale.discount;

      saleRepository.insert(
        {
          id: randomUUID(),
          productId: sale.productId,
          productName: sale.productName,
          productBarcode: sale.productBarcode,
          unitPrice: sale.unitPrice,
          quantity: sale.quantity,
          discount: sale.discount,
          total,
          soldAt: sale.soldAt,
          customerName: sale.customerName ?? '',
          paymentMethod: sale.paymentMethod,
        },
        'transaction',
      );
    }
  });

  db.close();
}

export async function main(): Promise<void> {
  const dataDir = getLocalDataDir();
  await seedDatabase(dataDir);

  const sales = buildSeedSales();
  const stockEntries = buildSeedStockEntries();
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + sale.unitPrice * sale.quantity - sale.discount,
    0,
  );
  const totalStock = PRODUCTS.reduce((sum, product) => sum + product.quantity, 0);
  const stockValue = PRODUCTS.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );

  const paymentCounts = sales.reduce(
    (counts, sale) => {
      counts[sale.paymentMethod] = (counts[sale.paymentMethod] ?? 0) + 1;
      return counts;
    },
    {} as Record<PaymentMethod, number>,
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((sale) => sale.soldAt.slice(0, 10) === todayKey).length;

  console.log('Base de testes criada com sucesso.');
  console.log(`Arquivo: ${path.join(dataDir, 'sistema.db')}`);
  console.log(`Produtos: ${PRODUCTS.length}`);
  console.log(`Itens em estoque: ${totalStock}`);
  console.log(`Valor em estoque: R$ ${stockValue.toFixed(2)}`);
  console.log(`Vendas: ${sales.length} (${todaySales} hoje)`);
  console.log(`Receita total: R$ ${totalRevenue.toFixed(2)}`);
  console.log(`Entradas de estoque: ${stockEntries.length}`);
  console.log(
    `Pagamentos: Pix ${paymentCounts.pix ?? 0} | Dinheiro ${paymentCounts.dinheiro ?? 0} | Débito/Crédito ${paymentCounts.debito_credito ?? 0}`,
  );
  console.log('');
  console.log('Execute "npm run dev" ou "npm start" para usar esta base local.');
}

/* v8 ignore start -- entrada CLI testada via spawn */
if (require.main === module) {
  void main();
}
/* v8 ignore stop */
