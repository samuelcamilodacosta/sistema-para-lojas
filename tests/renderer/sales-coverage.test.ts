import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElectronApiMock } from '../helpers/electronApiMock';

const baseProduct = {
  id: 'p1',
  name: 'Camiseta',
  barcode: '789',
  price: 49.9,
  quantity: 10,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function setupSalesApi(products = [baseProduct]) {
  const api = createElectronApiMock();
  api.products.list.mockResolvedValue(products);
  api.sales.registerBatch.mockResolvedValue({
    sales: [{ id: 's1' }, { id: 's2' }],
    total: 99.8,
  });
  api.sales.list.mockResolvedValue([
    {
      id: 's1',
      productId: 'p1',
      productName: 'Camiseta',
      productBarcode: '789',
      unitPrice: 49.9,
      quantity: 1,
      discount: 5,
      total: 44.9,
      soldAt: new Date().toISOString(),
      customerName: 'João',
      paymentMethod: 'pix',
    },
  ]);
  window.electronAPI = api as unknown as Window['electronAPI'];
  return api;
}

async function addProductToCart() {
  const searchInput = document.getElementById('sale-search') as HTMLInputElement;
  searchInput.value = '789';
  searchInput.dispatchEvent(new Event('input'));
  document.getElementById('sale-add-btn')!.click();
  await vi.waitFor(() =>
    expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
  );
}

describe('sales page edge cases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    setupSalesApi();
  });

  it('cobre validações e fluxos do carrinho', async () => {
    const sales = await import('../../src/renderer/pages/salesPage');
    sales.initSalesPage();
    await sales.onEnterSalesPage();

    document.getElementById('sale-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('carrinho'),
    );

    await addProductToCart();

    (document.getElementById('sale-discount') as HTMLInputElement).value = 'abc';
    document.getElementById('sale-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('desconto válido'),
    );

    (document.getElementById('sale-discount') as HTMLInputElement).value = '9999,00';
    document.getElementById('sale-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('subtotal'),
    );

    (document.getElementById('sale-discount') as HTMLInputElement).value = '0,00';
    vi.mocked(window.electronAPI.sales.registerBatch).mockRejectedValueOnce(new Error('falha venda'));
    document.getElementById('sale-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('falha venda'),
    );
  });

  it('cobre busca, sugestões e estoque insuficiente', async () => {
    setupSalesApi([
      { ...baseProduct, quantity: 1 },
      { ...baseProduct, id: 'p2', name: 'Calça', barcode: '111', quantity: 10 },
    ]);
    const { productState } = await import('../../src/renderer/state/productState');
    await productState.refresh();

    const sales = await import('../../src/renderer/pages/salesPage');
    sales.initSalesPage();
    await sales.onEnterSalesPage();

    const searchInput = document.getElementById('sale-search') as HTMLInputElement;
    searchInput.value = 'ca';
    document.getElementById('sale-add-btn')!.click();

    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('Vários produtos'),
    );

    searchInput.value = 'Camiseta';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() =>
      expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
    );

    document.getElementById('sale-cart-body')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });

  it('renderiza vendas recentes com desconto e cliente', async () => {
    const { saleState } = await import('../../src/renderer/state/saleState');
    const sales = await import('../../src/renderer/pages/salesPage');
    sales.initSalesPage();
    await saleState.refresh();
    await vi.waitFor(() =>
      expect(document.getElementById('sales-body')?.textContent).toContain('Camiseta'),
    );
  });
});
