import type { StockEntry, StockEntrySummary } from '../../types/stockEntry';

type Listener = (data: { entries: StockEntry[]; summary: StockEntrySummary }) => void;

const emptySummary: StockEntrySummary = {
  totalEntries: 0,
  totalItemsAdded: 0,
  monthEntries: 0,
  monthItemsAdded: 0,
};

class StockEntryState {
  private entries: StockEntry[] = [];
  private summary: StockEntrySummary = emptySummary;
  private listeners = new Set<Listener>();

  getEntries(): StockEntry[] {
    return this.entries;
  }

  getSummary(): StockEntrySummary {
    return this.summary;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<void> {
    const [entries, summary] = await Promise.all([
      window.electronAPI.stockEntries.list(),
      window.electronAPI.stockEntries.summary(),
    ]);

    this.entries = entries;
    this.summary = summary;
    this.notify();
  }

  updateSummary(summary: StockEntrySummary): void {
    this.summary = summary;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ entries: this.entries, summary: this.summary });
    }
  }
}

export const stockEntryState = new StockEntryState();
