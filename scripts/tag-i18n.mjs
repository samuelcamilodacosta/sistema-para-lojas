import fs from 'node:fs';

const path = 'src/index.html';
let html = fs.readFileSync(path, 'utf8');

const pairs = [
  ['<span class="dash-kpi-label">Receita hoje</span>', '<span class="dash-kpi-label" data-i18n="dashboard.kpi.revenueToday">Receita hoje</span>'],
  ['<span class="dash-kpi-label">Vendas hoje</span>', '<span class="dash-kpi-label" data-i18n="dashboard.kpi.salesToday">Vendas hoje</span>'],
  ['<span class="dash-kpi-label">Ticket médio hoje</span>', '<span class="dash-kpi-label" data-i18n="dashboard.kpi.ticketAverageToday">Ticket médio hoje</span>'],
  ['<span class="dash-kpi-label">Valor em estoque</span>', '<span class="dash-kpi-label" data-i18n="dashboard.kpi.stockValue">Valor em estoque</span>'],
  ['<span class="dash-kpi-hint">vs. ontem</span>', '<span class="dash-kpi-hint" data-i18n="dashboard.kpi.vsYesterday">vs. ontem</span>'],
  ['<span class="dash-kpi-hint">por venda realizada</span>', '<span class="dash-kpi-hint" data-i18n="dashboard.kpi.perSale">por venda realizada</span>'],
  ['<span class="dash-kpi-hint">capital imobilizado</span>', '<span class="dash-kpi-hint" data-i18n="dashboard.kpi.immobilizedCapital">capital imobilizado</span>'],
  ['<span id="dash-period-insight-text">Carregando indicadores do período…</span>', '<span id="dash-period-insight-text" data-i18n="dashboard.insight.loading">Carregando indicadores do período…</span>'],
  ['<h3>Performance de vendas</h3>', '<h3 data-i18n="dashboard.chart.performanceTitle">Performance de vendas</h3>'],
  ['<p id="chart-period-subtitle" class="chart-subtitle">Últimos 7 dias</p>', '<p id="chart-period-subtitle" class="chart-subtitle" data-i18n="dashboard.chart.defaultSubtitle">Últimos 7 dias</p>'],
  ['data-chart-period="day"', 'data-chart-period="day" data-i18n="dashboard.chart.period.day"'],
  ['data-chart-period="week"', 'data-chart-period="week" data-i18n="dashboard.chart.period.week"'],
  ['data-chart-period="month"', 'data-chart-period="month" data-i18n="dashboard.chart.period.month"'],
  ['data-chart-period="year"', 'data-chart-period="year" data-i18n="dashboard.chart.period.year"'],
  ['<span class="chart-date-picker-label">De</span>', '<span class="chart-date-picker-label" data-i18n="dashboard.chart.dateFrom">De</span>'],
  ['<span class="chart-date-picker-label">Até</span>', '<span class="chart-date-picker-label" data-i18n="dashboard.chart.dateTo">Até</span>'],
  ['<span class="chart-date-range-separator">até</span>', '<span class="chart-date-range-separator" data-i18n="dashboard.chart.dateSeparator">até</span>'],
  ['aria-label="Data inicial do período"', 'data-i18n-aria="dashboard.chart.dateFromAria" aria-label="Data inicial do período"'],
  ['aria-label="Data final do período"', 'data-i18n-aria="dashboard.chart.dateToAria" aria-label="Data final do período"'],
  ['<span>Receita no período</span>', '<span data-i18n="dashboard.chart.kpi.periodRevenue">Receita no período</span>'],
  ['<span>Vendas no período</span>', '<span data-i18n="dashboard.chart.kpi.periodSales">Vendas no período</span>'],
  ['<span>Ticket médio</span>', '<span data-i18n="dashboard.chart.kpi.ticketAverage">Ticket médio</span>'],
  ['<span>Variação receita</span>', '<span data-i18n="dashboard.chart.kpi.revenueChange">Variação receita</span>'],
  ['<h3>Ranking de produtos</h3>', '<h3 data-i18n="dashboard.ranking.title">Ranking de produtos</h3>'],
  ['<p class="chart-subtitle">Top 5 por receita no período selecionado</p>', '<p class="chart-subtitle" data-i18n="dashboard.ranking.subtitle">Top 5 por receita no período selecionado</p>'],
  ['<p id="top-products-empty" class="dashboard-empty hidden">Nenhuma venda no período selecionado.</p>', '<p id="top-products-empty" class="dashboard-empty hidden" data-i18n="dashboard.ranking.empty">Nenhuma venda no período selecionado.</p>'],
  ['<h3>Mix de pagamentos</h3>', '<h3 data-i18n="dashboard.paymentMix.title">Mix de pagamentos</h3>'],
  ['<p class="chart-subtitle">Participação por forma de pagamento</p>', '<p class="chart-subtitle" data-i18n="dashboard.paymentMix.subtitle">Participação por forma de pagamento</p>'],
  ['<p id="payment-methods-empty" class="dashboard-empty hidden">Nenhuma venda no período selecionado.</p>', '<p id="payment-methods-empty" class="dashboard-empty hidden" data-i18n="dashboard.paymentMix.empty">Nenhuma venda no período selecionado.</p>'],
  ['<h3>Alertas de estoque</h3>', '<h3 data-i18n="dashboard.stockAlerts.title">Alertas de estoque</h3>'],
  ['<p class="chart-subtitle">Até 5 itens esgotados ou abaixo do mínimo</p>', '<p class="chart-subtitle" data-i18n="dashboard.stockAlerts.subtitle">Até 5 itens esgotados ou abaixo do mínimo</p>'],
  ['<a href="#" class="btn btn-small btn-ghost" data-route="estoque">Ver estoque</a>', '<a href="#" class="btn btn-small btn-ghost" data-route="estoque" data-i18n="dashboard.stockAlerts.viewStock">Ver estoque</a>'],
  ['<p id="dash-stock-alerts-empty" class="dashboard-empty">Nenhum alerta no momento.</p>', '<p id="dash-stock-alerts-empty" class="dashboard-empty" data-i18n="dashboard.stockAlerts.empty">Nenhum alerta no momento.</p>'],
  ['aria-label="Alertas de estoque"', 'data-i18n-aria="dashboard.stockAlerts.ariaList" aria-label="Alertas de estoque"'],
  ['aria-label="Filtrar período do gráfico"', 'data-i18n-aria="dashboard.chart.periodFilterAria" aria-label="Filtrar período do gráfico"'],
  ['aria-label="Filtrar intervalo de datas"', 'data-i18n-aria="dashboard.chart.dateRangeAria" aria-label="Filtrar intervalo de datas"'],
  ['aria-label="Resumo do ranking"', 'data-i18n-aria="dashboard.ranking.ariaSummary" aria-label="Resumo do ranking"'],
  ['aria-label="Mix de pagamentos"', 'data-i18n-aria="dashboard.paymentMix.ariaLabel" aria-label="Mix de pagamentos"'],
  ['aria-label="Tipo de ação"', 'data-i18n-aria="stock.actionTypeAria" aria-label="Tipo de ação"'],
  ['>Cadastrar produto\n                  </button>', ' data-i18n="stock.action.registerProduct">Cadastrar produto\n                  </button>'],
  ['>Reabastecer\n                  </button>', ' data-i18n="stock.action.restock">Reabastecer\n                  </button>'],
  ['data-route="historico-estoque">Histórico</a>', 'data-route="historico-estoque" data-i18n="stock.action.historyLink">Histórico</a>'],
  ['<h3>Produtos cadastrados</h3>', '<h3 data-i18n="stock.list.title">Produtos cadastrados</h3>'],
  ['placeholder="Nome ou código de barras..."', 'data-i18n-placeholder="stock.list.searchPlaceholder" placeholder="Nome ou código de barras..."'],
  ['aria-label="Filtrar por status"', 'data-i18n-aria="stock.list.statusFilterAria" aria-label="Filtrar por status"'],
  ['<span class="status-filter-label">Status</span>', '<span class="status-filter-label" data-i18n="stock.list.status">Status</span>'],
  ['data-status-filter="ok"\n                        aria-pressed="false"\n                      >\n                        Disponível', 'data-status-filter="ok"\n                        aria-pressed="false"\n                        data-i18n="stockStatus.ok"\n                      >\n                        Disponível'],
  ['data-status-filter="low"\n                        aria-pressed="false"\n                      >\n                        Estoque baixo', 'data-status-filter="low"\n                        aria-pressed="false"\n                        data-i18n="stockStatus.low"\n                      >\n                        Estoque baixo'],
  ['data-status-filter="out"\n                        aria-pressed="false"\n                      >\n                        Esgotado', 'data-status-filter="out"\n                        aria-pressed="false"\n                        data-i18n="stockStatus.out"\n                      >\n                        Esgotado'],
  ['<p class="table-sort-hint">Clique nos cabeçalhos para ordenar a listagem.</p>', '<p class="table-sort-hint" data-i18n="stock.list.sortHint">Clique nos cabeçalhos para ordenar a listagem.</p>'],
  ['placeholder="Leia ou digite"', 'data-i18n-placeholder="stock.purchase.barcodePlaceholder" placeholder="Leia ou digite"'],
  ['<option value="">Selecione</option>', '<option value="" data-i18n-option="stock.purchase.select">Selecione</option>'],
  ['placeholder="Nome do produto"', 'data-i18n-placeholder="stock.product.namePlaceholder" placeholder="Nome do produto"'],
  ['placeholder="0,00"', 'data-i18n-placeholder="stock.product.pricePlaceholder" placeholder="0,00"'],
  ['id="submit-btn" class="btn sale-btn sale-btn-finish stock-form-submit">\n                    Cadastrar', 'id="submit-btn" class="btn sale-btn sale-btn-finish stock-form-submit" data-i18n="stock.product.submitRegister">\n                    Cadastrar'],
  ['id="cancel-edit-btn" class="btn btn-small btn-ghost hidden">\n                    Cancelar', 'id="cancel-edit-btn" class="btn btn-small btn-ghost hidden" data-i18n="stock.product.cancel">\n                    Cancelar'],
  ['id="purchase-submit-btn">\n                  Reabastecer', 'id="purchase-submit-btn" data-i18n="stock.purchase.submit">\n                  Reabastecer'],
];

for (const [from, to] of pairs) {
  if (!html.includes(from)) {
    console.warn('missing:', from.slice(0, 60));
    continue;
  }

  html = html.split(from).join(to);
}

fs.writeFileSync(path, html);
console.log('Tagged index.html');
