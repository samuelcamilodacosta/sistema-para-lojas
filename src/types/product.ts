export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  barcode?: string;
  price: number;
  quantity: number;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  barcode?: string;
  price?: number;
  quantity?: number;
}

export interface AdjustStockInput {
  id: string;
  amount: number;
}
