import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ROUTE_META,
  getSavedRoute,
  isValidRoute,
  saveLastRoute,
} from '../../src/renderer/routeMeta';
import { Router, updatePageContext } from '../../src/renderer/router';
import { createElectronApiMock } from '../helpers/electronApiMock';

describe('routeMeta', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('valida rotas conhecidas', () => {
    expect(isValidRoute('vendas')).toBe(true);
    expect(isValidRoute('invalid')).toBe(false);
    expect(isValidRoute(null)).toBe(false);
  });

  it('persiste e recupera última rota', () => {
    saveLastRoute('estoque');
    expect(getSavedRoute()).toBe('estoque');
  });

  it('retorna null quando storage falha ao ler', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage');
    });
    expect(getSavedRoute()).toBeNull();
    getItem.mockRestore();
  });

  it('ignora erro ao salvar rota', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage');
    });
    expect(() => saveLastRoute('vendas')).not.toThrow();
    setItem.mockRestore();
  });

  it('define metadados para todas as rotas', () => {
    expect(Object.keys(ROUTE_META)).toHaveLength(5);
    expect(ROUTE_META.dashboard.documentTitle).toBe('Início');
  });
});

describe('Router', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('valida rota salva', () => {
    sessionStorage.setItem('sistema:last-route', 'vendas');
    expect(getSavedRoute()).toBe('vendas');
    sessionStorage.setItem('sistema:last-route', 'invalid');
    expect(getSavedRoute()).toBeNull();
  });

  it('atualiza contexto da página', () => {
    updatePageContext('vendas');
    expect(document.getElementById('app-page-title')?.textContent).toBe('Vendas');
    expect(document.getElementById('app-page-desc')?.textContent).toContain('carrinho');
    expect(document.title).toBe('Vendas · Sistema para Lojas');
  });

  it('navega entre rotas e chama handlers', async () => {
    const router = new Router();
    const handler = vi.fn();
    router.register('dashboard', handler);
    router.register('vendas', handler);

    await router.navigate('vendas');
    expect(router.getCurrentRoute()).toBe('vendas');
    expect(document.getElementById('screen-vendas')?.classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-link[data-route="vendas"]')?.classList.contains('active')).toBe(true);
    expect(handler).toHaveBeenCalled();

    await router.navigate('dashboard');
    expect(document.getElementById('screen-dashboard')?.classList.contains('active')).toBe(true);
  });

  it('ignora navegação repetida para a mesma rota', async () => {
    const router = new Router();
    const handler = vi.fn();
    router.register('vendas', handler);

    await router.navigate('vendas');
    await router.navigate('vendas');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('inicializa cliques de navegação', async () => {
    const router = new Router();
    router.register('estoque', vi.fn());
    router.init();

    const link = document.querySelector('[data-route="estoque"]') as HTMLAnchorElement;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(router.getCurrentRoute()).toBe('estoque');
  });

  it('ignora clique com rota inválida', async () => {
    const router = new Router();
    router.init();

    const fakeLink = document.createElement('a');
    fakeLink.setAttribute('data-route', 'invalida');
    document.body.appendChild(fakeLink);
    fakeLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(router.getCurrentRoute()).toBe('dashboard');
    fakeLink.remove();
  });

  it('navega sem handler registrado', async () => {
    const router = new Router();
    await router.navigate('historico-vendas');
    expect(router.getCurrentRoute()).toBe('historico-vendas');
  });

  it('aplica animação de entrada após a primeira navegação', async () => {
    const router = new Router();
    await router.navigate('dashboard');
    await router.navigate('estoque');

    const screen = document.getElementById('screen-estoque');
    expect(screen?.classList.contains('screen-entering')).toBe(true);
    screen?.dispatchEvent(new Event('animationend'));
    expect(screen?.classList.contains('screen-entering')).toBe(false);
  });
});

describe('renderer state', () => {
  beforeEach(() => {
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
  });

  it('productState refresh e subscribe', async () => {
    const { productState } = await import('../../src/renderer/state/productState');
    const listener = vi.fn();
    const unsubscribe = productState.subscribe(listener);

    vi.mocked(window.electronAPI.products.list).mockResolvedValueOnce([
      {
        id: 'p1',
        name: 'Produto',
        barcode: '',
        price: 1,
        quantity: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]);

    const products = await productState.refresh();
    expect(products).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('saleState refresh e subscribe', async () => {
    const { saleState } = await import('../../src/renderer/state/saleState');
    const listener = vi.fn();
    saleState.subscribe(listener);

    vi.mocked(window.electronAPI.sales.list).mockResolvedValueOnce([
      {
        id: 's1',
        productId: 'p1',
        productName: 'Produto',
        productBarcode: '',
        unitPrice: 10,
        quantity: 1,
        discount: 0,
        total: 10,
        soldAt: '2024-06-02T10:00:00.000Z',
        customerName: '',
        paymentMethod: 'pix',
      },
      {
        id: 's2',
        productId: 'p1',
        productName: 'Produto',
        productBarcode: '',
        unitPrice: 10,
        quantity: 1,
        discount: 0,
        total: 10,
        soldAt: '2024-06-01T10:00:00.000Z',
        customerName: '',
        paymentMethod: 'pix',
      },
    ]);
    vi.mocked(window.electronAPI.sales.summary).mockResolvedValueOnce({
      totalSales: 2,
      totalRevenue: 20,
      todaySales: 2,
      todayRevenue: 20,
    });

    await saleState.refresh();
    expect(saleState.getSales()[0].id).toBe('s1');
    expect(saleState.getSummary().totalSales).toBe(2);
    expect(listener).toHaveBeenCalled();
  });

  it('saleState atualiza resumo sem recarregar vendas', async () => {
    const { saleState } = await import('../../src/renderer/state/saleState');

    saleState.updateSummary({
      totalSales: 9,
      totalRevenue: 90,
      todaySales: 1,
      todayRevenue: 10,
    });

    expect(saleState.getSummary().totalSales).toBe(9);
  });

  it('stockEntryState refresh e subscribe', async () => {
    const { stockEntryState } = await import('../../src/renderer/state/stockEntryState');
    const listener = vi.fn();
    const unsubscribe = stockEntryState.subscribe(listener);

    vi.mocked(window.electronAPI.stockEntries.list).mockResolvedValueOnce([
      {
        id: 'e1',
        productId: 'p1',
        productName: 'Produto',
        productBarcode: '',
        quantity: 1,
        note: '',
        createdAt: '2024-01-01',
      },
    ]);
    vi.mocked(window.electronAPI.stockEntries.summary).mockResolvedValueOnce({
      totalEntries: 1,
      totalItemsAdded: 1,
      monthEntries: 1,
      monthItemsAdded: 1,
    });

    await stockEntryState.refresh();
    expect(stockEntryState.getEntries()).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    await stockEntryState.refresh();
    expect(listener).not.toHaveBeenCalled();
  });

  it('stockEntryState atualiza resumo sem recarregar entradas', async () => {
    const { stockEntryState } = await import('../../src/renderer/state/stockEntryState');

    stockEntryState.updateSummary({
      totalEntries: 9,
      totalItemsAdded: 90,
      monthEntries: 1,
      monthItemsAdded: 10,
    });

    expect(stockEntryState.getSummary().totalEntries).toBe(9);
  });

  it('saleState unsubscribe', async () => {
    const { saleState } = await import('../../src/renderer/state/saleState');
    const listener = vi.fn();
    const unsubscribe = saleState.subscribe(listener);
    unsubscribe();
    await saleState.refresh();
    expect(listener).not.toHaveBeenCalled();
  });
});
