import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElectronApiMock } from '../helpers/electronApiMock';

const baseProduct = {
  id: 'p1',
  name: 'Camiseta',
  barcode: '789',
  price: 49.9,
  quantity: 2,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function setupApi(products = [baseProduct, { ...baseProduct, id: 'p2', name: 'Calça', barcode: '111', quantity: 5 }]) {
  const api = createElectronApiMock();
  api.products.list.mockResolvedValue(products);
  api.sales.registerBatch.mockResolvedValue({ sales: [{ id: 's1' }], total: 49.9 });
  api.sales.list.mockResolvedValue([
    {
      id: 's1',
      productId: 'p1',
      productName: 'Camiseta',
      productBarcode: '789',
      unitPrice: 49.9,
      quantity: 1,
      discount: 0,
      total: 49.9,
      soldAt: new Date().toISOString(),
      customerName: '',
      paymentMethod: 'pix' as const,
    },
  ]);
  window.electronAPI = api as unknown as Window['electronAPI'];
  return api;
}

describe('sales page cobertura completa', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    setupApi();
  });

  it('exercita busca, carrinho, atalhos e finalização', async () => {
    const sales = await import('../../src/renderer/pages/salesPage');
    sales.initSalesPage();
    await sales.onEnterSalesPage();

    const searchInput = document.getElementById('sale-search') as HTMLInputElement;

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    searchInput.value = '   ';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('Informe'),
    );

    searchInput.value = 'ca';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    const suggestionBtn = document.querySelector('.sale-search-option') as HTMLButtonElement;
    expect(suggestionBtn).toBeTruthy();
    suggestionBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    await vi.waitFor(() =>
      expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
    );

    const removeFirst = document.querySelector('[data-cart-action="remove"]') as HTMLButtonElement;
    removeFirst.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const { productState } = await import('../../src/renderer/state/productState');
    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      { ...baseProduct, quantity: 0 },
      { ...baseProduct, id: 'p2', name: 'Calça', barcode: '111', quantity: 5 },
    ]);
    await productState.refresh();

    suggestionBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('Estoque insuficiente'),
    );

    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      { ...baseProduct, quantity: 1 },
      { ...baseProduct, id: 'p2', name: 'Calça', barcode: '111', quantity: 5 },
    ]);
    await productState.refresh();

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-cart-action="increase"]')).toBeTruthy(),
    );

    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      { ...baseProduct, quantity: 0 },
      { ...baseProduct, id: 'p2', name: 'Calça', barcode: '111', quantity: 5 },
    ]);
    await productState.refresh();

    const increaseBtn = document.querySelector('[data-cart-action="increase"]') as HTMLButtonElement;
    increaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('Estoque insuficiente'),
    );

    const invalidBtn = document.createElement('button');
    invalidBtn.dataset.cartAction = 'increase';
    invalidBtn.dataset.cartIndex = 'invalid';
    document.getElementById('sale-cart-body')!.appendChild(invalidBtn);
    invalidBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      { ...baseProduct, quantity: 5 },
      { ...baseProduct, id: 'p2', name: 'Calça', barcode: '111', quantity: 5 },
    ]);
    await productState.refresh();

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-cart-action="decrease"]')).toBeTruthy(),
    );

    const decreaseBtn = document.querySelector('[data-cart-action="decrease"]') as HTMLButtonElement;
    decreaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    decreaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();

    const removeBtn = document.querySelector('[data-cart-action="remove"]') as HTMLButtonElement;
    removeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    document.getElementById('sale-cart-body')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
    );

    document.getElementById('sale-clear-cart-btn')!.click();

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-cart-action="increase"]')).toBeTruthy(),
    );

    searchInput.dispatchEvent(new Event('blur'));
  });
});
