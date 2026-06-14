import { beforeEach, describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn().mockResolvedValue(undefined);

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

describe('preload', () => {
  it('expõe todas as funções da electronAPI', async () => {
    vi.resetModules();
    await import('./preload');
    expect(exposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
    const api = exposeInMainWorld.mock.calls[0][1];

    await api.products.list();
    await api.products.listPage({ page: 1, pageSize: 50 });
    await api.products.create({ name: 'A', barcode: '', price: 1, quantity: 1 });
    await api.products.update({ id: 'p1', name: 'B' });
    await api.products.adjustStock({ id: 'p1', amount: 1 });
    await api.products.remove('p1');

    await api.sales.register({
      productId: 'p1',
      quantity: 1,
      paymentMethod: 'pix',
    });
    await api.sales.registerBatch({
      items: [{ productId: 'p1', quantity: 1 }],
      paymentMethod: 'pix',
    });
    await api.sales.list();
    await api.sales.summary();
    await api.sales.listHistory({ page: 1, pageSize: 50 });
    await api.sales.chart({ period: 'week' });
    await api.sales.dashboard({ period: 'month' });

    await api.stockEntries.register({ productId: 'p1', quantity: 1 });
    await api.stockEntries.list();
    await api.stockEntries.summary();
    await api.stockEntries.listHistory({ page: 1, pageSize: 50 });

    expect(invoke).toHaveBeenCalledWith('products:list');
    expect(invoke).toHaveBeenCalledWith('products:listPage', { page: 1, pageSize: 50 });
    expect(invoke).toHaveBeenCalledWith('products:create', {
      name: 'A',
      barcode: '',
      price: 1,
      quantity: 1,
    });
    expect(invoke).toHaveBeenCalledWith('products:update', { id: 'p1', name: 'B' });
    expect(invoke).toHaveBeenCalledWith('products:adjustStock', { id: 'p1', amount: 1 });
    expect(invoke).toHaveBeenCalledWith('products:remove', 'p1');
    expect(invoke).toHaveBeenCalledWith('sales:register', expect.any(Object));
    expect(invoke).toHaveBeenCalledWith('sales:registerBatch', expect.any(Object));
    expect(invoke).toHaveBeenCalledWith('sales:list');
    expect(invoke).toHaveBeenCalledWith('sales:summary');
    expect(invoke).toHaveBeenCalledWith('sales:listHistory', { page: 1, pageSize: 50 });
    expect(invoke).toHaveBeenCalledWith('sales:chart', { period: 'week' });
    expect(invoke).toHaveBeenCalledWith('sales:dashboard', { period: 'month' });
    expect(invoke).toHaveBeenCalledWith('stockEntries:register', expect.any(Object));
    expect(invoke).toHaveBeenCalledWith('stockEntries:list');
    expect(invoke).toHaveBeenCalledWith('stockEntries:summary');
    expect(invoke).toHaveBeenCalledWith('stockEntries:listHistory', { page: 1, pageSize: 50 });
  });
});
