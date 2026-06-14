import fs from 'fs';
import path from 'path';
import { AppDatabase } from './db';
import { getLocalDataDir, getLocalDatabasePath } from './getDataDir';
import { SaleRepository } from '../repositories/saleRepository';
import type { PaymentMethod } from '../types/sale';

const VALID_METHODS = new Set<PaymentMethod>(['pix', 'dinheiro', 'debito_credito']);

/** Distribuição aproximada: Pix 45%, Débito/Crédito 33%, Dinheiro 22% */
const WEIGHTED_METHODS: PaymentMethod[] = [
  'pix',
  'pix',
  'pix',
  'pix',
  'debito_credito',
  'debito_credito',
  'debito_credito',
  'dinheiro',
  'dinheiro',
];

function isMissingPaymentMethod(value: string): boolean {
  return !value || !VALID_METHODS.has(value as PaymentMethod);
}

function methodForIndex(index: number): PaymentMethod {
  return WEIGHTED_METHODS[index % WEIGHTED_METHODS.length];
}

export async function backfillPaymentMethods(dataDir: string): Promise<number> {
  const db = new AppDatabase(dataDir);
  await db.init();

  const sales = new SaleRepository(db);
  const rows = sales.findAllWithPaymentMethod();

  let updated = 0;

  db.transaction(() => {
    for (const [index, row] of rows.entries()) {
      if (!isMissingPaymentMethod(row.payment_method)) {
        continue;
      }

      sales.updatePaymentMethod(row.id, methodForIndex(index), 'transaction');
      updated += 1;
    }
  });

  db.close();
  return updated;
}

export async function main(): Promise<void> {
  const targets = [
    getLocalDatabasePath(),
    path.join(process.env.APPDATA ?? '', 'sistema', 'sistema.db'),
  ].filter((dbPath) => dbPath && fs.existsSync(dbPath));

  if (targets.length === 0) {
    console.error('Nenhum banco encontrado (data/sistema.db ou %APPDATA%\\sistema\\sistema.db).');
    console.error('Execute "npm run seed" para criar a base de testes ou use o app para gerar vendas.');
    process.exit(1);
  }

  let totalUpdated = 0;

  for (const dbPath of targets) {
    const dataDir = path.dirname(dbPath);
    const updated = await backfillPaymentMethods(dataDir);
    totalUpdated += updated;
    console.log(`Banco: ${dbPath}`);
    console.log(`  ${updated} venda(s) atualizada(s).`);
  }

  console.log(`Total: ${totalUpdated} venda(s) com forma de pagamento preenchida.`);
}

/* v8 ignore start -- entrada CLI testada via spawn */
if (require.main === module) {
  void main();
}
/* v8 ignore stop */
