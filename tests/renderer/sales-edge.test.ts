import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElectronApiMock } from '../helpers/electronApiMock';

describe('sales page ramificações restantes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    const api = createElectronApiMock();
    api.products.list.mockResolvedValue([
      {
        id: 'p1',
        name: 'Zebra',
        barcode: '12',
        price: 10,
        quantity: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'p2',
        name: 'Abacaxi',
        barcode: '123',
        price: 20,
        quantity: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    window.electronAPI = api as unknown as Window['electronAPI'];
  });

  it('cobre buscas vazias, ordenação e remoção do carrinho', async () => {
    const sales = await import('../../src/renderer/pages/salesPage');
    sales.initSalesPage();
    await sales.onEnterSalesPage();

    const searchInput = document.getElementById('sale-search') as HTMLInputElement;
    searchInput.value = '888';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.value = 'inexistente-xyz';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    searchInput.value = '12';
    searchInput.dispatchEvent(new Event('input'));

    searchInput.value = '12';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
    );

    searchInput.value = '123';
    searchInput.dispatchEvent(new Event('input'));

    searchInput.value = 'aba';
    searchInput.dispatchEvent(new Event('input'));

    searchInput.value = 'Abacaxi';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
    );

    const { productState } = await import('../../src/renderer/state/productState');
    vi.mocked(window.electronAPI.products.list).mockResolvedValue([]);
    await productState.refresh();

    const ghostIncrease = document.createElement('button');
    ghostIncrease.dataset.cartAction = 'increase';
    ghostIncrease.dataset.cartIndex = '0';
    document.getElementById('sale-cart-body')!.appendChild(ghostIncrease);
    ghostIncrease.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      {
        id: 'p1',
        name: 'Zebra',
        barcode: '12',
        price: 10,
        quantity: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    await productState.refresh();

    searchInput.value = '12';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-cart-action="decrease"]')).toBeTruthy(),
    );

    const decreaseBtn = document.querySelector('[data-cart-action="decrease"]') as HTMLButtonElement;
    decreaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    decreaseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
});
