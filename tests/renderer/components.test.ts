import Chart from 'chart.js/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDashboardCharts } from '../../src/renderer/components/dashboardCharts';
import {
  getCurrentChartPeriod,
  getCurrentChartQuery,
  initSalesChart,
  loadSalesChart,
  setSalesChartPeriodListener,
} from '../../src/renderer/components/salesChart';
import { createElectronApiMock } from '../helpers/electronApiMock';

describe('chart components', () => {
  beforeEach(() => {
    Chart.reset();
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
  });

  it('carrega gráfico de vendas e troca período', async () => {
    const listener = vi.fn();
    setSalesChartPeriodListener(listener);
    initSalesChart();

    await loadSalesChart({ period: 'week' });
    expect(getCurrentChartPeriod()).toBe('week');
    expect(document.getElementById('chart-period-total')?.textContent).toContain('10');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ period: 'week' }));

    const dayButton = document.querySelector('[data-chart-period="day"]') as HTMLButtonElement;
    dayButton.click();
    await vi.waitFor(() => expect(getCurrentChartPeriod()).toBe('day'));
  });

  it('atualiza gráfico ao selecionar intervalo de datas', async () => {
    initSalesChart();

    const fromInput = document.getElementById('chart-date-from') as HTMLInputElement;
    const toInput = document.getElementById('chart-date-to') as HTMLInputElement;
    fromInput.value = '2026-01-01';
    toInput.value = '2026-01-15';
    fromInput.dispatchEvent(new Event('change'));

    await vi.waitFor(() =>
      expect(window.electronAPI.sales.chart).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2026-01-01',
          dateTo: '2026-01-15',
        }),
      ),
    );
    expect(getCurrentChartQuery().dateFrom).toBe('2026-01-01');
    expect(getCurrentChartQuery().dateTo).toBe('2026-01-15');
  });

  it('ignora calendário vazio e atualiza subtítulo de mês e ano', async () => {
    initSalesChart();

    const fromInput = document.getElementById('chart-date-from') as HTMLInputElement;
    const toInput = document.getElementById('chart-date-to') as HTMLInputElement;
    const previousFrom = fromInput.value;
    const previousTo = toInput.value;
    fromInput.value = '';
    toInput.value = '';
    fromInput.dispatchEvent(new Event('change'));
    expect(fromInput.value).toBe(previousFrom);
    expect(toInput.value).toBe(previousTo);

    await loadSalesChart({ period: 'month', dateFrom: '2026-03-01', dateTo: '2026-03-10' });
    expect(document.getElementById('chart-period-subtitle')?.textContent).toContain('Março');

    await loadSalesChart({ period: 'month', dateFrom: '2026-03-10', dateTo: '2026-03-10' });
    expect(document.getElementById('chart-period-subtitle')?.textContent).toContain('Março');

    await loadSalesChart({ period: 'day', dateFrom: '2026-01-01', dateTo: '2026-01-03' });
    expect(document.getElementById('chart-period-subtitle')?.textContent).toContain('por dia');

    await loadSalesChart({ period: 'month', dateFrom: '2026-02-01', dateTo: '2026-03-10' });
    expect(document.getElementById('chart-period-subtitle')?.textContent).toContain('a');

    await loadSalesChart({ period: 'year', dateFrom: '2026-01-01', dateTo: '2026-03-10' });
    expect(document.getElementById('chart-period-subtitle')?.textContent).toContain('2026');
  });

  it('exibe erro quando intervalo de datas é inválido', async () => {
    initSalesChart();
    vi.mocked(window.electronAPI.sales.chart).mockClear();

    await loadSalesChart({
      period: 'week',
      dateFrom: '2026-06-20',
      dateTo: '2026-06-01',
    });

    expect(document.getElementById('chart-period-subtitle')?.textContent).toContain(
      'não pode ser posterior',
    );
    expect(window.electronAPI.sales.chart).not.toHaveBeenCalled();
  });

  it('renderiza gráficos do dashboard com e sem dados', async () => {
    vi.mocked(window.electronAPI.sales.dashboard).mockResolvedValueOnce({
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

    await loadDashboardCharts({ period: 'week' });
    expect(document.getElementById('top-products-empty')?.classList.contains('hidden')).toBe(false);

    vi.mocked(window.electronAPI.sales.dashboard).mockResolvedValueOnce({
      period: 'week',
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
      today: {
        sales: 1,
        revenue: 10,
        ticketAverage: 10,
        salesChangePercent: null,
        revenueChangePercent: null,
      },
      periodComparison: {
        salesChangePercent: null,
        revenueChangePercent: null,
      },
      topProducts: [
        {
          productId: 'p1',
          productName: 'Nome muito longo para truncar label',
          quantitySold: 1,
          revenue: 10,
        },
      ],
      paymentMethods: [
        {
          method: 'pix',
          label: 'Pix',
          count: 1,
          revenue: 10,
        },
      ],
    });

    const analytics = await loadDashboardCharts({ period: 'week' });
    expect(analytics.topProducts).toHaveLength(1);
    expect(document.getElementById('top-products-empty')?.classList.contains('hidden')).toBe(true);
  });
});
