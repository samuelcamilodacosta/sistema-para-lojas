import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElectronApiMock } from '../helpers/electronApiMock';

vi.mock('../../src/renderer/utils/payment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/renderer/utils/payment')>();
  return {
    ...actual,
    isPaymentMethod: vi.fn(() => false),
  };
});

describe('sales page validação de pagamento', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    const api = createElectronApiMock();
    api.products.list.mockResolvedValue([
      {
        id: 'p1',
        name: 'Camiseta',
        barcode: '789',
        price: 49.9,
        quantity: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    window.electronAPI = api as unknown as Window['electronAPI'];
  });

  it('exige forma de pagamento válida ao finalizar', async () => {
    const sales = await import('../../src/renderer/pages/salesPage');
    sales.initSalesPage();
    await sales.onEnterSalesPage();

    const searchInput = document.getElementById('sale-search') as HTMLInputElement;
    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    document.getElementById('sale-add-btn')!.click();
    await vi.waitFor(() =>
      expect(document.getElementById('sale-cart-count')?.textContent).not.toBe('0 itens'),
    );

    document.getElementById('sale-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('forma de pagamento'),
    );
  });
});
