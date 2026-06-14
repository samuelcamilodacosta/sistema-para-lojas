export interface StockEntry {
  id: string;
  productId: string;
  productName: string;
  productBarcode: string;
  quantity: number;
  note: string;
  createdAt: string;
}

export interface CreateStockEntryInput {
  productId: string;
  quantity: number;
  note?: string;
}

export interface StockEntrySummary {
  totalEntries: number;
  totalItemsAdded: number;
  monthEntries: number;
  monthItemsAdded: number;
}
