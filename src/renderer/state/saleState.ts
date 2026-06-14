import type { Sale, SalesSummary } from '../../types/sale';

type Listener = (data: { sales: Sale[]; summary: SalesSummary }) => void;

const emptySummary: SalesSummary = {
  totalSales: 0,
  totalRevenue: 0,
  todaySales: 0,
  todayRevenue: 0,
};

class SaleState {
  private sales: Sale[] = [];
  private summary: SalesSummary = emptySummary;
  private listeners = new Set<Listener>();

  getSales(): Sale[] {
    return this.sales;
  }

  getSummary(): SalesSummary {
    return this.summary;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<void> {
    const [sales, summary] = await Promise.all([
      window.electronAPI.sales.list(),
      window.electronAPI.sales.summary(),
    ]);

    this.sales = sales.sort((left, right) => right.soldAt.localeCompare(left.soldAt));
    this.summary = summary;
    this.notify();
  }

  updateSummary(summary: SalesSummary): void {
    this.summary = summary;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ sales: this.sales, summary: this.summary });
    }
  }
}

export const saleState = new SaleState();
