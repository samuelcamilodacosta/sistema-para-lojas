import Chart from 'chart.js/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDashboardCharts } from '../../src/renderer/components/dashboardCharts';
import {
  getCurrentChartPeriod,
  initSalesChart,
  loadSalesChart,
} from '../../src/renderer/components/salesChart';
import { createElectronApiMock } from '../helpers/electronApiMock';

describe('chart components callbacks', () => {
  beforeEach(() => {
    Chart.reset();
    window.electronAPI = createElectronApiMock() as unknown as Window['electronAPI'];
  });

  it('executa callbacks de tooltip dos gráficos', async () => {
    vi.mocked(window.electronAPI.sales.dashboard).mockResolvedValueOnce({
      period: 'week',
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
      today: {
        sales: 1,
        revenue: 10,
        ticketAverage: 10,
        salesChangePercent: 50,
        revenueChangePercent: 50,
      },
      periodComparison: {
        salesChangePercent: 50,
        revenueChangePercent: 50,
      },
      topProducts: [
        {
          productId: 'p1',
          productName: 'Produto longo para truncar no gráfico',
          quantitySold: 2,
          revenue: 10,
        },
        {
          productId: 'p2',
          productName: 'Produto B',
          quantitySold: 1,
          revenue: 5,
        },
      ],
      paymentMethods: [
        {
          method: 'pix',
          label: 'Pix',
          count: 1,
          revenue: 10,
        },
        {
          method: 'dinheiro',
          label: 'Dinheiro',
          count: 1,
          revenue: 5,
        },
      ],
    });

    await loadDashboardCharts({ period: 'week' });

    const topChart = Chart.instances.find(
      (chart) =>
        (chart.config as { type?: string }).type === 'bar' &&
        (chart.canvas as HTMLCanvasElement).id === 'top-products-chart',
    );

    expect(topChart).toBeDefined();
    expect(document.getElementById('top-products-ranking')?.children.length).toBe(2);
    expect(document.getElementById('payment-methods-mix')?.querySelectorAll('.payment-mix-row').length).toBe(2);
    expect(document.querySelector('.payment-mix-stack')?.children.length).toBe(2);

    const topOptions = (topChart!.config as { options: Record<string, unknown> }).options;
    const topTooltip = (
      topOptions.plugins as { tooltip: { callbacks: Record<string, Function> } }
    ).tooltip.callbacks;

    expect(topTooltip.title([{ dataIndex: 0 }])).toContain('Produto');
    expect(topTooltip.label({ dataIndex: 0, parsed: { x: 10 } })).toEqual(
      expect.arrayContaining([expect.stringContaining('Receita')]),
    );
    expect(topTooltip.label({ dataIndex: 99, parsed: { x: 0 } })).toBe('');

    const xTick = (topOptions.scales as { x: { ticks: { callback: Function } } }).x.ticks.callback;
    expect(xTick(10)).toContain('10');
  });

  it('executa callbacks do gráfico combo de vendas', async () => {
    vi.mocked(window.electronAPI.sales.chart).mockResolvedValueOnce({
      period: 'week',
      dateFrom: '2026-06-07',
      dateTo: '2026-06-13',
      points: [
        { label: 'Seg', revenue: 10, salesCount: 0 },
        { label: 'Ter', revenue: 25, salesCount: 3 },
      ],
      totalRevenue: 35,
      totalSales: 3,
    });

    initSalesChart();
    await loadSalesChart({ period: 'week' });

    const salesChart = Chart.instances.find(
      (chart) => (chart.canvas as HTMLCanvasElement).id === 'sales-chart',
    );
    expect(salesChart).toBeDefined();
    expect(document.getElementById('chart-period-ticket')?.textContent).toContain('11');

    const config = salesChart!.config as {
      data: { datasets: Array<{ backgroundColor: unknown }> };
      options: Record<string, unknown>;
    };
    const backgroundColor = config.data.datasets[0].backgroundColor as Function;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const chartArea = { top: 0, bottom: 200, left: 0, right: 400 };

    backgroundColor({ chart: { ctx, chartArea }, dataIndex: 0 });
    backgroundColor({ chart: { ctx, chartArea }, dataIndex: 1 });

    const options = config.options;
    const yTicks = (options.scales as { y: { ticks: { callback: Function } } }).y.ticks.callback;
    const y1Ticks = (options.scales as { y1: { ticks: { callback: Function } } }).y1.ticks.callback;
    const tooltip = (
      options.plugins as { tooltip: { callbacks: Record<string, Function> } }
    ).tooltip.callbacks;

    expect(yTicks(1000)).toContain('mil');
    expect(y1Ticks(2.8)).toBe('3');
    expect(tooltip.afterTitle([{ dataIndex: 0 }])).toBe('');
    expect(tooltip.afterTitle([{ dataIndex: 1 }])).toContain('Ticket médio');
    expect(tooltip.label({ datasetIndex: 0, parsed: { y: 25 } })).toContain('Receita');
    expect(tooltip.label({ datasetIndex: 1, parsed: { y: 3 } })).toContain('Vendas');

    const peakColor = backgroundColor({ chart: { ctx, chartArea }, dataIndex: 1 });
    expect(peakColor).toContain('212');

    const dayButton = document.querySelector('[data-chart-period="day"]') as HTMLButtonElement;
    dayButton.click();
    await vi.waitFor(() => expect(getCurrentChartPeriod()).toBe('day'));
  });
});
