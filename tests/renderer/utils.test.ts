import { describe, expect, it, vi } from 'vitest';
import {
  CHART_BORDER_PALETTE,
  CHART_PALETTE,
  formatSharePercent,
  getPaletteBorderColors,
  getPaletteColors,
  PAYMENT_BORDER_COLORS,
  PAYMENT_COLORS,
  PAYMENT_CHART_STYLES,
  getPaymentChartStyle,
  PERIOD_CHART_THEMES,
} from '../../src/renderer/utils/chartPalette';
import {
  buildDualAxisOptions,
  createBarGradient,
  doughnutCenterPlugin,
  getPeriodCompareLabel,
} from '../../src/renderer/utils/chartOptions';
import { bindDecimalInput, setDecimalInputValue } from '../../src/renderer/utils/decimalInput';
import { escapeHtml, setMessage } from '../../src/renderer/utils/dom';
import {
  formatCurrency,
  formatCompactCurrency,
  formatDateTime,
  formatDecimal,
  formatDecimalInput,
  formatPercentChange,
  formatShortDateTime,
  getErrorMessage,
  parseDecimalInput,
  readDecimalInput,
} from '../../src/renderer/utils/format';
import {
  formatPaymentMethod,
  isPaymentMethod,
  paymentMethodBadgeClass,
} from '../../src/renderer/utils/payment';
import {
  applyProductListFilters,
  createDefaultProductFilters,
  filterProducts,
  hasActiveProductListFilters,
} from '../../src/renderer/utils/productFilters';
import {
  cloneSortRules,
  cycleSortRule,
  DEFAULT_PRODUCT_SORT,
  sortProducts,
} from '../../src/renderer/utils/productSort';
import {
  applySaleHistoryFilters,
  createDefaultSaleHistoryFilters,
  filterSales,
  hasActiveSaleHistoryFilters,
} from '../../src/renderer/utils/saleHistoryFilters';
import {
  cloneSaleHistorySortRules,
  cycleSaleHistorySortRule,
  DEFAULT_SALE_HISTORY_SORT,
  sortSaleHistory,
} from '../../src/renderer/utils/saleHistorySort';
import {
  cloneRecentSaleSortRules,
  cycleRecentSaleSortRule,
  DEFAULT_RECENT_SALE_SORT,
  sortRecentSales,
} from '../../src/renderer/utils/saleSort';
import {
  applyStockHistoryFilters,
  createDefaultStockHistoryFilters,
  filterStockEntries,
  hasActiveStockHistoryFilters,
} from '../../src/renderer/utils/stockEntryFilters';
import {
  cloneStockEntrySortRules,
  cycleStockEntrySortRule,
  DEFAULT_STOCK_ENTRY_SORT,
  sortStockEntries,
} from '../../src/renderer/utils/stockEntrySort';
import {
  isInvalidDateRange,
  matchesDateRange,
  sortByDate,
} from '../../src/renderer/utils/stockHistoryFilters';
import { getProductStatusKey, getStockStatus, LOW_STOCK_THRESHOLD } from '../../src/renderer/utils/stock';

const product = {
  id: 'p1',
  name: 'Alpha',
  barcode: '123',
  price: 10,
  quantity: 3,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const sale = {
  id: 's1',
  productId: 'p1',
  productName: 'Alpha',
  productBarcode: '123',
  unitPrice: 10,
  quantity: 1,
  discount: 0,
  total: 10,
  soldAt: '2024-06-01T10:00:00.000Z',
  customerName: 'Cliente',
  paymentMethod: 'pix' as const,
};

const entry = {
  id: 'e1',
  productId: 'p1',
  productName: 'Alpha',
  productBarcode: '123',
  quantity: 5,
  note: 'Compra',
  createdAt: '2024-06-01T10:00:00.000Z',
};

describe('renderer utils', () => {
  it('formata valores monetários e decimais', () => {
    expect(formatCurrency(10)).toContain('10');
    expect(formatCurrency(Number.NaN)).toBe(formatCurrency(0));
    expect(formatCompactCurrency(850)).toContain('850');
    expect(formatCompactCurrency(12_500)).toContain('mil');
    expect(formatCompactCurrency(2_500_000)).toContain('mi');
    expect(formatCompactCurrency(Number.NaN)).toBe('R$ 0');
    expect(formatPercentChange(12.4)).toBe('+12,4%');
    expect(formatPercentChange(-3.2)).toBe('-3,2%');
    expect(formatPercentChange(0)).toBe('0,0%');
    expect(formatPercentChange(null)).toBe('—');
    expect(formatDecimal(1.5)).toBeTruthy();
    expect(formatDecimal(Number.POSITIVE_INFINITY)).toBe(formatDecimal(0));
    expect(formatDecimalInput(2)).toBe(formatDecimal(2));
    expect(parseDecimalInput('')).toBe(0);
    expect(parseDecimalInput('1.234,56')).toBe(1234.56);
    expect(parseDecimalInput('10.5')).toBe(10.5);
    expect(parseDecimalInput('10')).toBe(10);
    expect(Number.isNaN(parseDecimalInput('abc'))).toBe(true);

    const input = document.createElement('input');
    input.value = '12,50';
    expect(readDecimalInput(input)).toBe(12.5);
  });

  it('formata datas e mensagens de erro', () => {
    expect(formatDateTime('2024-06-01T10:00:00.000Z')).toBeTruthy();
    expect(formatShortDateTime('invalid')).toBe('—');
    expect(formatShortDateTime('2024-06-01T10:00:00.000Z')).toBeTruthy();
    expect(getErrorMessage(new Error('falha'), 'fallback')).toBe('falha');
    expect(getErrorMessage('x', 'fallback')).toBe('fallback');
  });

  it('escapa HTML e define mensagens', () => {
    expect(escapeHtml('<script>"\'</script>')).toContain('&lt;');
    const el = document.createElement('p');
    setMessage(el, 'ok', 'success');
    expect(el.className).toContain('success');
    setMessage(el, '', 'none');
    expect(el.className).toBe('form-message');
  });

  it('formata pagamentos', () => {
    expect(formatPaymentMethod('')).toBe('—');
    expect(formatPaymentMethod('pix')).toBe('Pix');
    expect(isPaymentMethod('pix')).toBe(true);
    expect(isPaymentMethod('outro')).toBe(false);
    expect(paymentMethodBadgeClass('pix')).toContain('pix');
    expect(paymentMethodBadgeClass('dinheiro')).toContain('cash');
    expect(paymentMethodBadgeClass('debito_credito')).toContain('card');
    expect(paymentMethodBadgeClass('')).toContain('empty');
  });

  it('calcula status de estoque', () => {
    expect(LOW_STOCK_THRESHOLD).toBe(5);
    expect(getProductStatusKey(0)).toBe('out');
    expect(getProductStatusKey(3)).toBe('low');
    expect(getProductStatusKey(10)).toBe('ok');
    expect(getStockStatus(0).label).toBe('Esgotado');
    expect(getStockStatus(3).label).toBe('Estoque baixo');
    expect(getStockStatus(10).label).toBe('Disponível');
  });

  it('ordena e filtra produtos', () => {
    const products = [
      product,
      { ...product, id: 'p2', name: 'Beta', barcode: '456', price: 20, quantity: 0 },
    ];

    expect(createDefaultProductFilters().sort).toEqual(DEFAULT_PRODUCT_SORT);
    expect(filterProducts(products, { search: 'beta', statuses: [], sort: [] })).toHaveLength(1);
    expect(
      filterProducts(products, { search: '', statuses: ['out'], sort: [] }),
    ).toHaveLength(1);
    expect(applyProductListFilters(products, createDefaultProductFilters())).toHaveLength(2);
    expect(hasActiveProductListFilters(createDefaultProductFilters())).toBe(false);
    expect(
      hasActiveProductListFilters({ ...createDefaultProductFilters(), search: 'x' }),
    ).toBe(true);

    expect(sortProducts(products, [{ column: 'price', direction: 'desc' }])[0].price).toBe(20);
    expect(sortProducts(products, [{ column: 'quantity', direction: 'asc' }])[0].quantity).toBe(0);
    expect(sortProducts(products, [{ column: 'status', direction: 'asc' }])[0].quantity).toBe(0);
    expect(
      sortProducts(
        [
          { ...product, id: 'p3', name: 'Gamma', quantity: 20 },
          { ...product, id: 'p4', name: 'Delta', quantity: 30 },
        ],
        [{ column: 'status', direction: 'asc' }],
      )[0].quantity,
    ).toBe(20);
    expect(sortProducts(products, [])).toHaveLength(2);
    expect(
      sortProducts(
        [
          { ...product, name: 'Igual' },
          { ...product, id: 'p5', name: 'Igual' },
        ],
        [{ column: 'name', direction: 'asc' }],
      ),
    ).toHaveLength(2);

    let rules = cycleSortRule([], 'name');
    expect(rules[0].direction).toBe('asc');
    rules = cycleSortRule(rules, 'name');
    expect(rules[0].direction).toBe('desc');
    rules = cycleSortRule(rules, 'name');
    expect(rules).toHaveLength(0);
    expect(cloneSortRules(rules)).toEqual([]);
  });

  it('ordena e filtra vendas recentes e histórico', () => {
    const sales = [
      sale,
      { ...sale, id: 's2', productName: 'Beta', soldAt: '2024-06-02T10:00:00.000Z', paymentMethod: '' },
      { ...sale, id: 's3', productName: 'Alpha', soldAt: '2024-06-01T10:00:00.000Z', paymentMethod: 'dinheiro' as const },
    ];

    expect(sortRecentSales(sales, [{ column: 'product', direction: 'asc' }])[0].productName).toBe(
      'Alpha',
    );
    expect(
      sortRecentSales(
        [
          { ...sale, id: 'a', productName: 'X', soldAt: '2024-01-01' },
          { ...sale, id: 'b', productName: 'X', soldAt: '2024-01-01' },
        ],
        [{ column: 'product', direction: 'asc' }],
      ),
    ).toHaveLength(2);
    expect(sortRecentSales(sales, [])).toHaveLength(3);

    let recentRules = cycleRecentSaleSortRule([], 'date');
    recentRules = cycleRecentSaleSortRule(recentRules, 'date');
    recentRules = cycleRecentSaleSortRule(recentRules, 'date');
    expect(recentRules).toEqual(cloneRecentSaleSortRules(DEFAULT_RECENT_SALE_SORT));

    recentRules = cycleRecentSaleSortRule([{ column: 'product', direction: 'asc' }], 'product');
    expect(recentRules[0].direction).toBe('desc');
    recentRules = cycleRecentSaleSortRule([], 'product');
    expect(recentRules[0].direction).toBe('asc');

    expect(createDefaultSaleHistoryFilters().sort).toEqual(DEFAULT_SALE_HISTORY_SORT);
    expect(filterSales(sales, createDefaultSaleHistoryFilters())).toHaveLength(3);
    expect(
      filterSales(sales, {
        ...createDefaultSaleHistoryFilters(),
        dateFrom: '2024-06-02',
      }),
    ).toHaveLength(1);
    expect(
      filterSales(sales, {
        ...createDefaultSaleHistoryFilters(),
        payments: ['pix'],
      }),
    ).toHaveLength(1);
    expect(
      filterSales(sales, {
        ...createDefaultSaleHistoryFilters(),
        search: 'beta',
      }),
    ).toHaveLength(1);
    expect(hasActiveSaleHistoryFilters(createDefaultSaleHistoryFilters())).toBe(false);
    expect(applySaleHistoryFilters(sales, createDefaultSaleHistoryFilters())).toHaveLength(3);
    expect(
      hasActiveSaleHistoryFilters({ ...createDefaultSaleHistoryFilters(), search: 'x' }),
    ).toBe(true);

    expect(
      sortSaleHistory(sales, [{ column: 'customer', direction: 'asc' }]),
    ).toHaveLength(3);
    expect(sortSaleHistory(sales, [{ column: 'product', direction: 'asc' }])).toHaveLength(3);
    expect(
      sortSaleHistory(
        [
          sale,
          { ...sale, id: 's2', paymentMethod: '' as const },
        ],
        [{ column: 'payment', direction: 'asc' }],
      ),
    ).toHaveLength(2);
    expect(sortSaleHistory(sales, [{ column: 'quantity', direction: 'asc' }])).toHaveLength(3);
    expect(sortSaleHistory(sales, [{ column: 'total', direction: 'asc' }])).toHaveLength(3);
    expect(sortSaleHistory(sales, [])).toHaveLength(3);

    let historyRules = cycleSaleHistorySortRule([], 'product');
    historyRules = cycleSaleHistorySortRule(historyRules, 'product');
    historyRules = cycleSaleHistorySortRule(historyRules, 'product');
    expect(historyRules).toEqual(cloneSaleHistorySortRules(DEFAULT_SALE_HISTORY_SORT));
  });

  it('ordena e filtra histórico de estoque', () => {
    const entries = [
      entry,
      { ...entry, id: 'e2', quantity: -1, note: 'Ajuste manual' },
      { ...entry, id: 'e3', quantity: -2, note: 'Saída' },
    ];

    expect(matchesDateRange('2024-06-01T10:00:00.000Z', '2024-06-01', '2024-06-30')).toBe(true);
    expect(matchesDateRange('2024-06-01T10:00:00.000Z', '', '2024-06-01')).toBe(true);
    expect(matchesDateRange('2024-06-02T10:00:00.000Z', '', '2024-06-01')).toBe(false);
    expect(matchesDateRange('2024-06-01T10:00:00.000Z', '2024-07-01', '')).toBe(false);
    expect(isInvalidDateRange('2024-06-02', '2024-06-01')).toBe(true);
    expect(sortByDate(entries, 'asc')[0].id).toBe('e1');

    expect(createDefaultStockHistoryFilters().sort).toEqual(DEFAULT_STOCK_ENTRY_SORT);
    expect(filterStockEntries(entries, createDefaultStockHistoryFilters())).toHaveLength(3);
    expect(
      filterStockEntries(entries, {
        ...createDefaultStockHistoryFilters(),
        dateTo: '2024-05-31',
      }),
    ).toHaveLength(0);
    expect(
      filterStockEntries(entries, {
        ...createDefaultStockHistoryFilters(),
        movements: ['purchase'],
      }),
    ).toHaveLength(1);
    expect(
      filterStockEntries(entries, {
        ...createDefaultStockHistoryFilters(),
        movements: ['adjustment'],
      }),
    ).toHaveLength(1);
    expect(
      filterStockEntries(entries, {
        ...createDefaultStockHistoryFilters(),
        movements: ['outbound'],
      }),
    ).toHaveLength(2);
    expect(applyStockHistoryFilters(entries, createDefaultStockHistoryFilters())).toHaveLength(3);
    expect(
      filterStockEntries(entries, {
        ...createDefaultStockHistoryFilters(),
        search: 'compra',
      }),
    ).toHaveLength(1);
    expect(hasActiveStockHistoryFilters(createDefaultStockHistoryFilters())).toBe(false);
    expect(
      hasActiveStockHistoryFilters({ ...createDefaultStockHistoryFilters(), search: 'x' }),
    ).toBe(true);

    expect(sortStockEntries(entries, [{ column: 'name', direction: 'asc' }])).toHaveLength(3);
    expect(sortStockEntries(entries, [{ column: 'quantity', direction: 'asc' }])).toHaveLength(3);
    expect(sortStockEntries(entries, [])).toHaveLength(3);

    let stockRules = cycleStockEntrySortRule([], 'name');
    stockRules = cycleStockEntrySortRule(stockRules, 'name');
    stockRules = cycleStockEntrySortRule(stockRules, 'name');
    expect(stockRules).toEqual(cloneStockEntrySortRules(DEFAULT_STOCK_ENTRY_SORT));
    expect(cloneStockEntrySortRules([])).toEqual([]);
  });

  it('paleta de gráficos', () => {
    expect(CHART_PALETTE.length).toBeGreaterThan(0);
    expect(CHART_BORDER_PALETTE.length).toBeGreaterThan(0);
    expect(PAYMENT_COLORS.pix).toBeTruthy();
    expect(PAYMENT_BORDER_COLORS.pix).toBeTruthy();
    expect(PAYMENT_CHART_STYLES.dinheiro.fill).not.toBe(PAYMENT_CHART_STYLES.debito_credito.fill);
    expect(getPaymentChartStyle('pix').text).toBe('#5eead4');
    expect(getPaymentChartStyle('dinheiro').fill).toBe('#38bdf8');
    expect(getPaymentChartStyle('desconhecido').text).toBe('#cbd5e1');
    expect(PERIOD_CHART_THEMES.day.bar).toBeTruthy();
    expect(getPaletteColors(3)).toHaveLength(3);
    expect(getPaletteBorderColors(3)).toHaveLength(3);
    expect(formatSharePercent(0, 0)).toBe('0%');
    expect(formatSharePercent(25, 100)).toBe('25.0%');
  });

  it('input decimal com blur e input', () => {
    const input = document.createElement('input');
    const onValueChange = vi.fn();
    bindDecimalInput(input, { defaultValue: 0, onValueChange });
    expect(input.value).toBe('0,00');

    input.value = '12,34';
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('12,34');

    input.value = 'abc';
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('0,00');

    input.dispatchEvent(new Event('input'));
    expect(onValueChange).toHaveBeenCalled();

    setDecimalInputValue(input, 5);
    expect(input.value).toBe('5,00');
  });

  it('helpers de opções de gráfico', () => {
    expect(getPeriodCompareLabel('month')).toBe('mês anterior');

    const options = buildDualAxisOptions(
      'week',
      (value: number) => String(value),
      (value: number) => String(value),
    );
    const yTick = (options.scales as { y: { ticks: { callback: Function } } }).y.ticks.callback;
    expect(yTick(10)).toBe('10');
    const y1Tick = (options.scales as { y1: { ticks: { callback: Function } } }).y1.ticks.callback;
    expect(y1Tick(4.2)).toBe('4.2');

    const monthOptions = buildDualAxisOptions('month', String, String);
    expect((monthOptions.scales as { x: { ticks: { maxTicksLimit?: number } } }).x.ticks.maxTicksLimit).toBe(12);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    expect(createBarGradient({ ctx, chartArea: undefined }, 'from', 'to')).toBe('from');
    expect(
      createBarGradient({ ctx, chartArea: { top: 0, bottom: 100, left: 0, right: 100 } }, 'from', 'to'),
    ).not.toBe('from');

    const plugin = doughnutCenterPlugin(['Total', '50%']);
    const chart = {
      getDatasetMeta: () => ({ data: [{ x: 50, y: 50 }] }),
      ctx,
    };
    plugin.beforeDraw?.(chart as never, { cancelable: true } as never, {} as never);
    plugin.beforeDraw?.({ getDatasetMeta: () => ({ data: [] }), ctx } as never, { cancelable: true } as never, {} as never);

    const accentPlugin = doughnutCenterPlugin(['Pix', '50%'], '#5eead4');
    accentPlugin.beforeDraw?.(chart as never, { cancelable: true } as never, {} as never);
  });
});