import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElectronApiMock } from '../helpers/electronApiMock';

const product = {
  id: 'p1',
  name: 'Camiseta',
  barcode: '789',
  price: 49.9,
  quantity: 10,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const sale = {
  id: 's1',
  productId: 'p1',
  productName: 'Camiseta',
  productBarcode: '789',
  unitPrice: 49.9,
  quantity: 1,
  discount: 0,
  total: 49.9,
  soldAt: new Date().toISOString(),
  customerName: 'Maria',
  paymentMethod: 'pix' as const,
};

const stockEntry = {
  id: 'e1',
  productId: 'p1',
  productName: 'Camiseta',
  productBarcode: '789',
  quantity: 5,
  note: 'Compra',
  createdAt: new Date().toISOString(),
};

function setupApi() {
  const api = createElectronApiMock();
  api.products.list.mockResolvedValue([product]);
  api.products.listPage.mockResolvedValue({
    items: [product],
    total: 1,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  api.products.create.mockResolvedValue({ ...product, id: 'p2', name: 'Novo' });
  api.products.update.mockResolvedValue({ ...product, name: 'Atualizado' });
  api.products.remove.mockResolvedValue(undefined);
  api.products.adjustStock.mockResolvedValue({ ...product, quantity: 11 });
  api.sales.list.mockResolvedValue([sale]);
  api.sales.summary.mockResolvedValue({
    totalSales: 1,
    totalRevenue: 49.9,
    todaySales: 1,
    todayRevenue: 49.9,
  });
  api.sales.registerBatch.mockResolvedValue({
    sales: [sale],
    total: 49.9,
  });
  api.stockEntries.register.mockResolvedValue(stockEntry);
  api.stockEntries.list.mockResolvedValue([stockEntry]);
  api.stockEntries.summary.mockResolvedValue({
    totalEntries: 1,
    totalItemsAdded: 5,
    monthEntries: 1,
    monthItemsAdded: 5,
  });
  api.stockEntries.listHistory.mockResolvedValue({
    items: [stockEntry],
    total: 1,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  window.electronAPI = api as unknown as Window['electronAPI'];
  return api;
}

describe('renderer pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    setupApi();
  });

  it('dashboard exibe alertas de estoque e dispara listeners', async () => {
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      product,
      { ...product, id: 'p2', name: 'Esgotado', quantity: 0 },
      { ...product, id: 'p3', name: 'Baixo', quantity: 2 },
      { ...product, id: 'p4', name: 'Ok', quantity: 20 },
    ]);

    const dashboard = await import('../../src/renderer/pages/dashboardPage');
    const { productState } = await import('../../src/renderer/state/productState');
    const { saleState } = await import('../../src/renderer/state/saleState');

    dashboard.initDashboardPage();
    await dashboard.onEnterDashboardPage();

    expect(document.getElementById('dash-stock-alerts')?.children.length).toBeGreaterThan(0);
    expect(document.getElementById('dash-stock-alerts-empty')?.classList.contains('hidden')).toBe(
      true,
    );

    await productState.refresh();
    await saleState.refresh();
    await vi.waitFor(() =>
      expect(document.getElementById('dash-today-revenue')?.textContent).toBeTruthy(),
    );
  });

  it('dashboard limita alertas de estoque exibidos', async () => {
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
    vi.mocked(window.electronAPI.products.list).mockResolvedValue(
      Array.from({ length: 7 }, (_, index) => ({
        ...product,
        id: `p${index + 1}`,
        name: `Produto ${index + 1}`,
        quantity: index === 0 ? 0 : 2,
      })),
    );

    const dashboard = await import('../../src/renderer/pages/dashboardPage');
    dashboard.initDashboardPage();
    await dashboard.onEnterDashboardPage();

    expect(document.getElementById('dash-stock-alerts')?.children.length).toBe(5);
    expect(document.getElementById('dash-stock-alerts-more')?.classList.contains('hidden')).toBe(
      false,
    );
    expect(document.getElementById('dash-stock-alerts-more')?.textContent).toContain('+2 outros');
  });

  it('dashboard ordena alertas com mesma prioridade', async () => {
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      { ...product, id: 'p2', name: 'Baixo B', quantity: 2 },
      { ...product, id: 'p3', name: 'Baixo A', quantity: 3 },
    ]);

    const dashboard = await import('../../src/renderer/pages/dashboardPage');
    const { productState } = await import('../../src/renderer/state/productState');
    dashboard.initDashboardPage();
    await productState.refresh();
    await dashboard.onEnterDashboardPage();

    expect(document.getElementById('dash-stock-alerts')?.textContent).toContain('Baixo A');
  });

  it('dashboard descreve queda de receita no período', async () => {
    vi.mocked(window.electronAPI.sales.dashboard).mockResolvedValue({
      period: 'month',
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
      today: {
        sales: 2,
        revenue: 50,
        ticketAverage: 25,
        salesChangePercent: 0,
        revenueChangePercent: null,
      },
      periodComparison: {
        salesChangePercent: -4,
        revenueChangePercent: -11,
      },
      topProducts: [],
      paymentMethods: [],
    });

    const dashboard = await import('../../src/renderer/pages/dashboardPage');
    dashboard.initDashboardPage();
    await dashboard.onEnterDashboardPage();

    const insight = document.getElementById('dash-period-insight-text')?.innerHTML ?? '';
    expect(insight).toContain('mês anterior');
    expect(insight).toContain('receita');
    expect(document.getElementById('chart-period-revenue-delta')?.classList.contains('dash-kpi-delta-down')).toBe(
      true,
    );
  });

  it('dashboard inicializa e entra na página', async () => {
    vi.mocked(window.electronAPI.sales.dashboard).mockResolvedValue({
      period: 'week',
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
      today: {
        sales: 4,
        revenue: 120,
        ticketAverage: 30,
        salesChangePercent: -10,
        revenueChangePercent: 15,
      },
      periodComparison: {
        salesChangePercent: 8,
        revenueChangePercent: -5,
      },
      topProducts: [],
      paymentMethods: [],
    });

    const dashboard = await import('../../src/renderer/pages/dashboardPage');
    dashboard.initDashboardPage();
    await dashboard.onEnterDashboardPage();
    expect(document.getElementById('dash-today-revenue')?.textContent).toContain('120');
    expect(document.getElementById('dash-revenue-delta')?.classList.contains('dash-kpi-delta-up')).toBe(
      true,
    );
    expect(document.getElementById('dash-sales-delta')?.classList.contains('dash-kpi-delta-down')).toBe(
      true,
    );
    expect(document.getElementById('dash-period-insight-text')?.textContent).toContain('semana anterior');
  });

  it('dashboard exibe insight sem comparação histórica', async () => {
    vi.mocked(window.electronAPI.sales.dashboard).mockResolvedValue({
      period: 'week',
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
      today: {
        sales: 0,
        revenue: 0,
        ticketAverage: 0,
        salesChangePercent: null,
        revenueChangePercent: null,
      },
      periodComparison: {
        salesChangePercent: null,
        revenueChangePercent: null,
      },
      topProducts: [],
      paymentMethods: [],
    });

    const dashboard = await import('../../src/renderer/pages/dashboardPage');
    dashboard.initDashboardPage();
    await dashboard.onEnterDashboardPage();

    expect(document.getElementById('dash-period-insight-text')?.textContent).toContain(
      'Sem histórico suficiente',
    );
    expect(document.getElementById('dash-revenue-delta')?.classList.contains('dash-kpi-delta-neutral')).toBe(
      true,
    );
  });

  it('productForm cadastra, edita e reseta', async () => {
    const formPage = await import('../../src/renderer/pages/productFormPage');
    const panel = await import('../../src/renderer/utils/stockActionsPanel');
    panel.initStockActionsPanel();
    formPage.initProductFormPage();

    formPage.focusNewProductForm();
    expect(panel.getActiveStockActionMode()).toBe('product');

    const nameInput = document.getElementById('product-name') as HTMLInputElement;
    const priceInput = document.getElementById('product-price') as HTMLInputElement;
    const quantityInput = document.getElementById('product-quantity') as HTMLInputElement;

    nameInput.value = 'Novo';
    priceInput.value = '10,00';
    quantityInput.value = '2';
    document.getElementById('product-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(window.electronAPI.products.create).toHaveBeenCalled(),
    );

    await formPage.beginEditProduct('p1');
    expect(nameInput.value).toBe('Camiseta');

    vi.mocked(window.electronAPI.products.update).mockResolvedValueOnce({
      ...product,
      name: 'Camiseta Premium',
    });
    document.getElementById('product-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(window.electronAPI.products.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1', name: 'Camiseta' }),
      ),
    );

    await formPage.beginEditProduct('p1');
    vi.mocked(window.electronAPI.products.update).mockRejectedValueOnce(new Error('falha ao salvar'));
    document.getElementById('product-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('form-message')?.textContent).toContain('falha ao salvar'),
    );

    (document.getElementById('cancel-edit-btn') as HTMLButtonElement).click();

    document.dispatchEvent(new CustomEvent('stock-actions:open', { detail: { mode: 'product' } }));
    document.dispatchEvent(new CustomEvent('stock-actions:close'));

    await formPage.beginEditProduct('missing');
    formPage.resetProductForm();
    formPage.focusPurchaseForm();
    expect(panel.getActiveStockActionMode()).toBe('purchase');

    panel.toggleStockActionMode('product');
    panel.toggleStockActionMode('product');
    panel.closeStockActions();
    expect(panel.getActiveStockActionMode()).toBeNull();
  });

  it('productForm valida preço inválido', async () => {
    const formPage = await import('../../src/renderer/pages/productFormPage');
    formPage.initProductFormPage();
    formPage.focusNewProductForm();

    (document.getElementById('product-name') as HTMLInputElement).value = 'X';
    (document.getElementById('product-price') as HTMLInputElement).value = 'abc';
    (document.getElementById('product-form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('form-message')?.textContent).toContain('preço'),
    );
  });

  it('purchases ordena produtos por nome', async () => {
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
    vi.mocked(window.electronAPI.products.list).mockResolvedValue([
      { ...product, id: 'p2', name: 'Zebra' },
      product,
    ]);

    const { productState } = await import('../../src/renderer/state/productState');
    await productState.refresh();
    const purchases = await import('../../src/renderer/pages/purchasesPage');
    purchases.initPurchasesPage();
    await purchases.refreshPurchasesView();

    const options = Array.from(
      (document.getElementById('purchase-product') as HTMLSelectElement).options,
    ).map((option) => option.textContent);
    expect(options[1]).toContain('Camiseta');
  });

  it('purchases registra entrada e atualiza opções', async () => {
    const { productState } = await import('../../src/renderer/state/productState');
    await productState.refresh();

    const purchases = await import('../../src/renderer/pages/purchasesPage');
    purchases.initPurchasesPage();
    await purchases.refreshPurchasesView();

    const select = document.getElementById('purchase-product') as HTMLSelectElement;
    select.value = 'p1';
    select.dispatchEvent(new Event('change'));
    expect((document.getElementById('purchase-barcode') as HTMLInputElement).value).toBe('789');

    (document.getElementById('purchase-barcode') as HTMLInputElement).value = '789';
    (document.getElementById('purchase-barcode') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );
    expect(select.value).toBe('p1');

    (document.getElementById('purchase-quantity') as HTMLInputElement).value = '3';
    document.getElementById('purchase-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('purchase-message')?.textContent).toContain('sucesso'),
    );

    select.value = '';
    document.getElementById('purchase-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('purchase-message')?.textContent).toContain('Selecione'),
    );

    vi.mocked(window.electronAPI.stockEntries.register).mockReset();
    vi.mocked(window.electronAPI.stockEntries.register).mockRejectedValue(new Error('falha compra'));
    select.value = 'p1';
    (document.getElementById('purchase-quantity') as HTMLInputElement).value = '2';
    document.getElementById('purchase-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.getElementById('purchase-message')?.textContent).toContain('falha compra'),
    );
    vi.mocked(window.electronAPI.stockEntries.register).mockResolvedValue(stockEntry);

    select.dispatchEvent(new Event('change'));
    (document.getElementById('purchase-barcode') as HTMLInputElement).value = '   ';
    (document.getElementById('purchase-barcode') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );
  });

  it('stock page filtra, ordena e executa ações', async () => {
    const stock = await import('../../src/renderer/pages/stockPage');
    const panel = await import('../../src/renderer/utils/stockActionsPanel');
    panel.initStockActionsPanel();
    document.querySelector('[data-stock-action-mode="product"]')!.dispatchEvent(new Event('click'));
    document.querySelector('[data-stock-action-mode="purchase"]')!.dispatchEvent(new Event('click'));

    stock.initStockPage();
    await stock.onEnterStockPage();

    (document.getElementById('search-input') as HTMLInputElement).value = 'cam';
    (document.getElementById('search-input') as HTMLInputElement).dispatchEvent(new Event('input'));

    const statusBtn = document.querySelector('[data-status-filter="ok"]') as HTMLButtonElement;
    statusBtn.click();

    const sortBtn = document.querySelector('[data-sort-column="price"]') as HTMLButtonElement;
    sortBtn.click();
    sortBtn.click();
    sortBtn.click();

    document.getElementById('product-clear-filters')!.click();

    const editBtn = document.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editBtn?.click();
    await vi.waitFor(() => expect(window.electronAPI.products.list).toHaveBeenCalled());

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const deleteBtn = document.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteBtn?.click();
    await vi.waitFor(() => expect(window.electronAPI.products.remove).toHaveBeenCalled());

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    deleteBtn?.click();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const ghostBtn = document.createElement('button');
    ghostBtn.dataset.action = 'delete';
    ghostBtn.dataset.id = 'missing-id';
    document.getElementById('products-body')!.appendChild(ghostBtn);
    ghostBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const ghostBtn2 = document.createElement('button');
    ghostBtn2.dataset.action = 'delete';
    document.getElementById('products-body')!.appendChild(ghostBtn2);
    ghostBtn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    document.getElementById('products-body')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );

    await stock.onEnterStockPage({ productId: 'p1' });
    await stock.onEnterStockPage({ tab: 'cadastro' });
    await stock.onEnterStockPage({ tab: 'compras' });
  });

  it('stock page ajusta estoque na tabela', async () => {
    const stock = await import('../../src/renderer/pages/stockPage');
    stock.initStockPage();
    await stock.onEnterStockPage();

    await vi.waitFor(() =>
      expect(document.querySelector('[data-action="decrease"]')).toBeTruthy(),
    );

    document.querySelector('[data-action="edit"]')!.click();
    await vi.waitFor(() =>
      expect((document.getElementById('product-id') as HTMLInputElement).value).toBe('p1'),
    );

    const listCallsBefore = vi.mocked(window.electronAPI.products.listPage).mock.calls.length;
    document.querySelector('[data-action="increase"]')!.click();
    await vi.waitFor(() =>
      expect(window.electronAPI.products.adjustStock).toHaveBeenCalledWith({
        id: 'p1',
        amount: 1,
      }),
    );
    await vi.waitFor(() =>
      expect(vi.mocked(window.electronAPI.products.listPage).mock.calls.length).toBeGreaterThan(
        listCallsBefore,
      ),
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-action="decrease"]')).toBeTruthy(),
    );

    const listCallsBeforeDecrease = vi.mocked(window.electronAPI.products.listPage).mock.calls.length;
    document.querySelector('[data-action="decrease"]')!.click();
    await vi.waitFor(() =>
      expect(window.electronAPI.products.adjustStock).toHaveBeenCalledWith({
        id: 'p1',
        amount: -1,
      }),
    );
    await vi.waitFor(() =>
      expect(vi.mocked(window.electronAPI.products.listPage).mock.calls.length).toBeGreaterThan(
        listCallsBeforeDecrease,
      ),
    );
    await vi.waitFor(() =>
      expect(document.querySelector('[data-action="decrease"]')).toBeTruthy(),
    );

    vi.mocked(window.electronAPI.products.adjustStock).mockRejectedValueOnce(new Error('erro'));
    document.querySelector('[data-action="decrease"]')!.click();
    await vi.waitFor(() =>
      expect(document.getElementById('stock-message')?.textContent).toContain('erro'),
    );
  });

  it('stock page pagina resultados', async () => {
    vi.mocked(window.electronAPI.products.listPage).mockImplementation(async (query) => ({
      items: [product],
      total: 120,
      page: query.page,
      pageSize: 50,
      totalPages: 3,
    }));

    const stock = await import('../../src/renderer/pages/stockPage');
    stock.initStockPage();
    await stock.onEnterStockPage();

    expect(document.getElementById('products-body')?.children.length).toBe(1);
    expect(document.getElementById('products-pagination')?.classList.contains('hidden')).toBe(
      false,
    );

    (document.getElementById('products-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.products.listPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    (document.getElementById('products-prev-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.products.listPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );

    (document.getElementById('products-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.products.listPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    (document.getElementById('products-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.products.listPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3 }),
      ),
    );

    await vi.waitFor(() =>
      expect(
        (document.getElementById('products-next-page') as HTMLButtonElement).disabled,
      ).toBe(true),
    );

    const callsBefore = vi.mocked(window.electronAPI.products.listPage).mock.calls.length;
    (document.getElementById('products-next-page') as HTMLButtonElement).click();
    expect(vi.mocked(window.electronAPI.products.listPage).mock.calls.length).toBe(callsBefore);
  });

  it('stock page exibe estado vazio', async () => {
    vi.mocked(window.electronAPI.products.listPage).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    const stock = await import('../../src/renderer/pages/stockPage');
    stock.initStockPage();
    await stock.onEnterStockPage();

    expect(document.getElementById('products-body')?.textContent).toContain(
      'Nenhum produto cadastrado',
    );

    (document.getElementById('search-input') as HTMLInputElement).value = 'inexistente';
    (document.getElementById('search-input') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );

    await vi.waitFor(() =>
      expect(document.getElementById('products-body')?.textContent).toContain(
        'Nenhum produto encontrado',
      ),
    );
  });

  it('stock page descarta resposta antiga', async () => {
    vi.resetModules();
    setupApi();

    let resolveFirst: (value: unknown) => void = () => undefined;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(window.electronAPI.products.listPage)
      .mockReturnValueOnce(first as Promise<never>)
      .mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

    const stock = await import('../../src/renderer/pages/stockPage');
    stock.initStockPage();

    const search = document.getElementById('search-input') as HTMLInputElement;
    search.value = 'a';
    search.dispatchEvent(new Event('input'));
    search.value = 'b';
    search.dispatchEvent(new Event('input'));

    resolveFirst({
      items: [product],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    await vi.waitFor(() =>
      expect(document.getElementById('products-body')?.textContent).toContain(
        'Nenhum produto',
      ),
    );
  });

  it('sales page gerencia carrinho e finaliza venda', async () => {
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

    const increaseBtn = document.querySelector('[data-cart-action="increase"]') as HTMLButtonElement;
    increaseBtn?.click();
    const decreaseBtn = document.querySelector('[data-cart-action="decrease"]') as HTMLButtonElement;
    decreaseBtn?.click();

    document.querySelector('[data-sale-payment="dinheiro"]')!.dispatchEvent(new Event('click'));

    document.getElementById('sale-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => expect(window.electronAPI.sales.registerBatch).toHaveBeenCalled());

    searchInput.value = '';
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() =>
      expect(document.getElementById('sale-message')?.textContent).toContain('Informe'),
    );

    searchInput.value = 'inexistente';
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    vi.mocked(window.electronAPI.products.list).mockResolvedValueOnce([
      product,
      { ...product, id: 'p2', name: 'Calça', barcode: '111' },
    ]);
    const { productState } = await import('../../src/renderer/state/productState');
    await productState.refresh();
    searchInput.value = 'ca';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.dispatchEvent(new Event('keydown', { key: 'Enter' }));

    searchInput.value = '789';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.dispatchEvent(new Event('keydown', { key: 'ArrowDown' }));
    searchInput.dispatchEvent(new Event('keydown', { key: 'ArrowUp' }));
    searchInput.dispatchEvent(new Event('keydown', { key: 'Escape' }));
    searchInput.dispatchEvent(new Event('blur'));

    document.getElementById('sale-clear-cart-btn')!.click();

    const sortBtn = document.querySelector('[data-recent-sale-sort="product"]') as HTMLButtonElement;
    sortBtn?.click();
  });

  it('sales history cobre presets inválidos e ordenação múltipla', async () => {
    vi.resetModules();
    const screen = document.getElementById('screen-historico-vendas')!;
    const invalidPreset = document.createElement('button');
    invalidPreset.dataset.salesHistoryDatePreset = 'invalid';
    const emptyPreset = document.createElement('button');
    emptyPreset.dataset.salesHistoryDatePreset = '';
    screen.appendChild(invalidPreset);
    screen.appendChild(emptyPreset);

    const history = await import('../../src/renderer/pages/salesHistoryPage');
    history.initSalesHistoryPage();
    await history.onEnterSalesHistoryPage();

    invalidPreset.click();
    emptyPreset.click();

    (document.getElementById('sales-history-date-to') as HTMLInputElement).value = '2024-06-15';
    (document.getElementById('sales-history-date-to') as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );

    const productSort = document.querySelector(
      '#screen-historico-vendas [data-sort-column="product"]',
    ) as HTMLButtonElement;
    const totalSort = document.querySelector(
      '#screen-historico-vendas [data-sort-column="total"]',
    ) as HTMLButtonElement;
    productSort.click();
    totalSort.click();
    productSort.click();
    productSort.click();
    productSort.click();
  });

  it('sales history aplica filtros e presets', async () => {
    const history = await import('../../src/renderer/pages/salesHistoryPage');
    history.initSalesHistoryPage();
    await history.onEnterSalesHistoryPage();

    (document.getElementById('sales-history-search') as HTMLInputElement).value = 'cam';
    (document.getElementById('sales-history-search') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );

    const preset = document.querySelector('[data-sales-history-date-preset="7"]') as HTMLButtonElement;
    preset.click();
    preset.click();

    const monthPreset = document.querySelector(
      '[data-sales-history-date-preset="month"]',
    ) as HTMLButtonElement;
    monthPreset.click();

    const yearPreset = document.querySelector(
      '[data-sales-history-date-preset="year"]',
    ) as HTMLButtonElement;
    yearPreset.click();

    const todayPreset = document.querySelector(
      '[data-sales-history-date-preset="today"]',
    ) as HTMLButtonElement;
    todayPreset.click();

    (document.getElementById('sales-history-date-from') as HTMLInputElement).value = '2024-12-31';
    (document.getElementById('sales-history-date-to') as HTMLInputElement).value = '2024-01-01';
    (document.getElementById('sales-history-date-from') as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );

    const paymentBtn = document.querySelector('[data-sales-history-payment="pix"]') as HTMLButtonElement;
    paymentBtn.click();

    const sortBtn = document.querySelector(
      '#screen-historico-vendas [data-sort-column="total"]',
    ) as HTMLButtonElement;
    sortBtn.click();
    sortBtn.click();
    sortBtn.click();

    document.getElementById('sales-history-clear-filters')!.click();
  });

  it('sales history pagina resultados', async () => {
    vi.mocked(window.electronAPI.sales.listHistory).mockImplementation(async (query) => ({
      items: [
        {
          id: 's1',
          productId: 'p1',
          productName: 'Camiseta',
          productBarcode: '789',
          unitPrice: 49.9,
          quantity: 1,
          discount: 0,
          total: 49.9,
          soldAt: '2026-06-13T10:00:00',
          customerName: 'Maria',
          paymentMethod: 'pix',
        },
      ],
      total: 120,
      page: query.page,
      pageSize: 50,
      totalPages: 3,
      filteredRevenue: 6000,
    }));

    const history = await import('../../src/renderer/pages/salesHistoryPage');
    history.initSalesHistoryPage();
    await history.onEnterSalesHistoryPage();

    expect(document.getElementById('sales-history-body')?.children.length).toBe(1);
    expect(document.getElementById('sales-history-pagination')?.classList.contains('hidden')).toBe(
      false,
    );

    (document.getElementById('sales-history-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.sales.listHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    (document.getElementById('sales-history-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.sales.listHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3 }),
      ),
    );

    (document.getElementById('sales-history-prev-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.sales.listHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    (document.getElementById('sales-history-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(
        (document.getElementById('sales-history-next-page') as HTMLButtonElement).disabled,
      ).toBe(true),
    );

    const callsBefore = vi.mocked(window.electronAPI.sales.listHistory).mock.calls.length;
    (document.getElementById('sales-history-next-page') as HTMLButtonElement).click();
    expect(vi.mocked(window.electronAPI.sales.listHistory).mock.calls.length).toBe(callsBefore);
  });

  it('sales history descarta resposta antiga', async () => {
    vi.resetModules();
    setupApi();
    vi.mocked(window.electronAPI.sales.listHistory).mockClear();

    let resolveFirst: (value: unknown) => void = () => undefined;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(window.electronAPI.sales.listHistory)
      .mockReturnValueOnce(first as Promise<never>)
      .mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
        filteredRevenue: 0,
      });

    const history = await import('../../src/renderer/pages/salesHistoryPage');
    history.initSalesHistoryPage();

    const search = document.getElementById('sales-history-search') as HTMLInputElement;
    search.value = 'a';
    search.dispatchEvent(new Event('input'));
    search.value = 'b';
    search.dispatchEvent(new Event('input'));

    resolveFirst({
      items: [
        {
          id: 'old',
          productId: 'p1',
          productName: 'Antiga',
          productBarcode: '',
          unitPrice: 1,
          quantity: 1,
          discount: 0,
          total: 1,
          soldAt: '2026-06-13T10:00:00',
          customerName: '',
          paymentMethod: 'pix',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      filteredRevenue: 1,
    });

    await vi.waitFor(() => expect(vi.mocked(window.electronAPI.sales.listHistory).mock.calls.length).toBeGreaterThanOrEqual(2));
    await vi.waitFor(() =>
      expect(document.getElementById('sales-history-body')?.textContent).toContain(
        'Nenhuma venda',
      ),
    );
  });

  it('stock history ignora preset inválido', async () => {
    vi.resetModules();
    const screen = document.getElementById('screen-historico-estoque')!;
    const invalidPreset = document.createElement('button');
    invalidPreset.dataset.datePreset = 'invalid';
    const emptyPreset = document.createElement('button');
    emptyPreset.dataset.datePreset = '';
    screen.appendChild(invalidPreset);
    screen.appendChild(emptyPreset);

    const history = await import('../../src/renderer/pages/stockHistoryPage');
    history.initStockHistoryPage();
    await history.onEnterStockHistoryPage();
    invalidPreset.click();
    emptyPreset.click();

    (document.getElementById('stock-history-date-to') as HTMLInputElement).value = '2024-06-15';
    (document.getElementById('stock-history-date-to') as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );
  });

  it('stock history aplica filtros e presets', async () => {
    const history = await import('../../src/renderer/pages/stockHistoryPage');
    history.initStockHistoryPage();
    await history.onEnterStockHistoryPage();

    (document.getElementById('stock-history-search') as HTMLInputElement).value = 'cam';
    (document.getElementById('stock-history-search') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );

    const preset = document.querySelector('[data-date-preset="7"]') as HTMLButtonElement;
    preset.click();
    preset.click();

    document.querySelector('[data-date-preset="month"]')!.dispatchEvent(new Event('click'));
    document.querySelector('[data-date-preset="year"]')!.dispatchEvent(new Event('click'));
    document.querySelector('[data-date-preset="today"]')!.dispatchEvent(new Event('click'));

    (document.getElementById('stock-history-date-from') as HTMLInputElement).value = '2024-12-31';
    (document.getElementById('stock-history-date-to') as HTMLInputElement).value = '2024-01-01';
    (document.getElementById('stock-history-date-from') as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );

    document.querySelector('[data-movement-filter="purchase"]')!.dispatchEvent(new Event('click'));
    document.querySelector('[data-movement-filter="adjustment"]')!.dispatchEvent(new Event('click'));
    document.querySelector('[data-movement-filter="outbound"]')!.dispatchEvent(new Event('click'));

    const sortBtn = document.querySelector('.stock-history-table [data-sort-column="quantity"]') as HTMLButtonElement;
    sortBtn.click();
    sortBtn.click();
    sortBtn.click();

    document.getElementById('stock-history-clear-filters')!.click();
  });

  it('stock history pagina resultados', async () => {
    vi.mocked(window.electronAPI.stockEntries.listHistory).mockImplementation(async (query) => ({
      items: [stockEntry],
      total: 120,
      page: query.page,
      pageSize: 50,
      totalPages: 3,
    }));

    const history = await import('../../src/renderer/pages/stockHistoryPage');
    history.initStockHistoryPage();
    await history.onEnterStockHistoryPage();

    expect(document.getElementById('stock-history-body')?.children.length).toBe(1);
    expect(document.getElementById('stock-history-pagination')?.classList.contains('hidden')).toBe(
      false,
    );

    (document.getElementById('stock-history-next-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.stockEntries.listHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    (document.getElementById('stock-history-prev-page') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.electronAPI.stockEntries.listHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );
  });

  it('stock history exibe estado vazio', async () => {
    vi.mocked(window.electronAPI.stockEntries.listHistory).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    const history = await import('../../src/renderer/pages/stockHistoryPage');
    history.initStockHistoryPage();
    await history.onEnterStockHistoryPage();

    expect(document.getElementById('stock-history-body')?.textContent).toContain(
      'Nenhuma alteração registrada',
    );

    (document.getElementById('stock-history-search') as HTMLInputElement).value = 'xyz';
    (document.getElementById('stock-history-search') as HTMLInputElement).dispatchEvent(
      new Event('input'),
    );

    await vi.waitFor(() =>
      expect(document.getElementById('stock-history-body')?.textContent).toContain(
        'Nenhuma alteração encontrada',
      ),
    );
  });
});
