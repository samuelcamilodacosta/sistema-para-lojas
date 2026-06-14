import type { Product } from '../../types/product';

type Listener = (products: Product[]) => void;

class ProductState {
  private products: Product[] = [];
  private listeners = new Set<Listener>();

  getProducts(): Product[] {
    return this.products;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<Product[]> {
    this.products = await window.electronAPI.products.list();
    this.notify();
    return this.products;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.products);
    }
  }
}

export const productState = new ProductState();
