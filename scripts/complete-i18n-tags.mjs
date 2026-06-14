import fs from 'node:fs';

const path = 'src/index.html';
let html = fs.readFileSync(path, 'utf8');

html = html.replace(
  /(data-i18n(?:-aria|-placeholder|-option|-title|-html)?="[^"]+")\s+\1/g,
  '$1',
);

function wrapSortButton(label, key) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(class="table-sort-button[^"]*"[^>]*>\\s*)${escaped}(\\s*<span class="table-sort-indicator")`,
    'g',
  );
  html = html.replace(
    pattern,
    `$1<span data-i18n="${key}">${label}</span>$2`,
  );
}

function wrapRecentSortButton(label, key) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(data-recent-sale-sort="[^"]*"[^>]*>\\s*)${escaped}(\\s*<span class="table-sort-indicator")`,
    'g',
  );
  html = html.replace(
    pattern,
    `$1<span data-i18n="${key}">${label}</span>$2`,
  );
}

const pairs = [
  [
    `data-stock-action-mode="product"
                    aria-pressed="false"
                  >
                    Cadastrar produto`,
    `data-stock-action-mode="product"
                    aria-pressed="false"
                    data-i18n="stock.action.registerProduct"
                  >
                    Cadastrar produto`,
  ],
  [
    `data-stock-action-mode="purchase"
                    aria-pressed="false"
                  >
                    Reabastecer`,
    `data-stock-action-mode="purchase"
                    aria-pressed="false"
                    data-i18n="stock.action.restock"
                  >
                    Reabastecer`,
  ],
  ['<span>Cód. barras</span>\n                  <input\n                    id="purchase-barcode"', '<span data-i18n="stock.purchase.barcode">Cód. barras</span>\n                  <input\n                    id="purchase-barcode"'],
  ['<span>Cód. barras</span>\n                    <input\n                      id="product-barcode"', '<span data-i18n="stock.product.barcode">Cód. barras</span>\n                    <input\n                      id="product-barcode"'],
  ['<span>Produto</span>\n                  <select id="purchase-product"', '<span data-i18n="stock.purchase.product">Produto</span>\n                  <select id="purchase-product"'],
  ['<span>Qtd.</span>\n                  <input\n                    id="purchase-quantity"', '<span data-i18n="stock.purchase.quantity">Qtd.</span>\n                  <input\n                    id="purchase-quantity"'],
  ['<span>Obs.</span>', '<span data-i18n="stock.purchase.note">Obs.</span>'],
  ['id="purchase-note" type="text" placeholder="Opcional"', 'id="purchase-note" type="text" data-i18n-placeholder="stock.purchase.notePlaceholder" placeholder="Opcional"'],
  ['<span>Nome</span>', '<span data-i18n="stock.product.name">Nome</span>'],
  ['<span>Preço</span>', '<span data-i18n="stock.product.price">Preço</span>'],
  ['id="product-barcode"\n                      type="text"\n                      placeholder="Opcional"', 'id="product-barcode"\n                      type="text"\n                      data-i18n-placeholder="stock.product.barcodePlaceholder"\n                      placeholder="Opcional"'],
  ['<span>Qtd.</span>\n                    <input\n                      id="product-quantity"', '<span data-i18n="stock.product.quantity">Qtd.</span>\n                    <input\n                      id="product-quantity"'],
  ['<span>Buscar</span>\n                  <input\n                    id="search-input"', '<span data-i18n="stock.list.search">Buscar</span>\n                  <input\n                    id="search-input"'],
  [
    'id="product-clear-filters"\n                    class="btn btn-small btn-ghost product-filter-clear"\n                  >\n                    Limpar filtros',
    'id="product-clear-filters"\n                    class="btn btn-small btn-ghost product-filter-clear"\n                    data-i18n="stock.list.clearFilters"\n                  >\n                    Limpar filtros',
  ],
  ['<th scope="col">Código de barras</th>', '<th scope="col" data-i18n="stock.table.barcode">Código de barras</th>'],
  ['<th scope="col">Ações</th>', '<th scope="col" data-i18n="stock.table.actions">Ações</th>'],
  [
    '<td colspan="6" class="empty-state">Carregando...</td>',
    '<td colspan="6" class="empty-state" data-i18n="stock.loading">Carregando...</td>',
  ],
  [
    'id="products-pagination" class="table-pagination hidden" aria-label="Paginação de produtos"',
    'id="products-pagination" class="table-pagination hidden" data-i18n-aria="common.pagination.productsAria" aria-label="Paginação de produtos"',
  ],
  [
    'id="products-prev-page">\n                    Anterior',
    'id="products-prev-page" data-i18n="common.pagination.previous">\n                    Anterior',
  ],
  [
    'id="products-next-page">\n                    Próxima',
    'id="products-next-page" data-i18n="common.pagination.next">\n                    Próxima',
  ],

  ['<span>Entradas registradas</span>', '<span data-i18n="stockHistory.summary.totalEntries">Entradas registradas</span>'],
  ['<span>Entradas no mês</span>', '<span data-i18n="stockHistory.summary.monthEntries">Entradas no mês</span>'],
  ['<span>Itens adicionados (total)</span>', '<span data-i18n="stockHistory.summary.totalItems">Itens adicionados (total)</span>'],
  ['<span>Itens adicionados (mês)</span>', '<span data-i18n="stockHistory.summary.monthItems">Itens adicionados (mês)</span>'],
  ['<h3>Alterações de estoque</h3>', '<h3 data-i18n="stockHistory.panel.title">Alterações de estoque</h3>'],
  [
    'id="stock-history-search"\n                  type="search"\n                  placeholder="Produto, código ou observação..."',
    'id="stock-history-search"\n                  type="search"\n                  data-i18n-placeholder="stockHistory.searchPlaceholder"\n                  placeholder="Produto, código ou observação..."',
  ],
  [
    '<span>Buscar</span>\n                <input\n                  id="stock-history-search"',
    '<span data-i18n="common.search">Buscar</span>\n                <input\n                  id="stock-history-search"',
  ],
  ['role="group" aria-label="Filtrar por tipo"', 'role="group" data-i18n-aria="stockHistory.typeFilterAria" aria-label="Filtrar por tipo"'],
  ['<span class="status-filter-label">Tipo</span>', '<span class="status-filter-label" data-i18n="stockHistory.typeLabel">Tipo</span>'],
  [
    'data-movement-filter="purchase"\n                      aria-pressed="false"\n                    >\n                      Compras',
    'data-movement-filter="purchase"\n                      aria-pressed="false"\n                      data-i18n="stockHistory.type.purchases"\n                    >\n                      Compras',
  ],
  [
    'data-movement-filter="adjustment"\n                      aria-pressed="false"\n                    >\n                      Ajustes manuais',
    'data-movement-filter="adjustment"\n                      aria-pressed="false"\n                      data-i18n="stockHistory.type.adjustments"\n                    >\n                      Ajustes manuais',
  ],
  [
    'data-movement-filter="outbound"\n                      aria-pressed="false"\n                    >\n                      Saídas',
    'data-movement-filter="outbound"\n                      aria-pressed="false"\n                      data-i18n="stockHistory.type.outbound"\n                    >\n                      Saídas',
  ],
  ['role="group" aria-label="Filtrar por período"', 'role="group" data-i18n-aria="common.periodFilterAria" aria-label="Filtrar por período"'],
  ['<span class="status-filter-label">Período</span>', '<span class="status-filter-label" data-i18n="common.period">Período</span>'],
  [
    'data-date-preset="today" aria-pressed="false">\n                        Hoje',
    'data-date-preset="today" aria-pressed="false" data-i18n="common.preset.today">\n                        Hoje',
  ],
  [
    'data-date-preset="7" aria-pressed="false">\n                        7 dias',
    'data-date-preset="7" aria-pressed="false" data-i18n="common.preset.last7Days">\n                        7 dias',
  ],
  [
    'data-date-preset="month" aria-pressed="false">\n                        Este mês',
    'data-date-preset="month" aria-pressed="false" data-i18n="common.preset.thisMonth">\n                        Este mês',
  ],
  [
    'data-date-preset="year" aria-pressed="false">\n                        Este ano',
    'data-date-preset="year" aria-pressed="false" data-i18n="common.preset.thisYear">\n                        Este ano',
  ],
  ['id="stock-history-date-from"\n                      type="date"\n                      class="date-range-input"\n                      aria-label="Data inicial"', 'id="stock-history-date-from"\n                      type="date"\n                      class="date-range-input"\n                      data-i18n-aria="common.dateFromAria"\n                      aria-label="Data inicial"'],
  ['id="stock-history-date-to"\n                      type="date"\n                      class="date-range-input"\n                      aria-label="Data final"', 'id="stock-history-date-to"\n                      type="date"\n                      class="date-range-input"\n                      data-i18n-aria="common.dateToAria"\n                      aria-label="Data final"'],
  [
    'id="stock-history-clear-filters"\n                  class="btn btn-small btn-ghost product-filter-clear"\n                >\n                  Limpar filtros',
    'id="stock-history-clear-filters"\n                  class="btn btn-small btn-ghost product-filter-clear"\n                  data-i18n="common.clearFilters"\n                >\n                  Limpar filtros',
  ],
  ['<th scope="col">Observação</th>', '<th scope="col" data-i18n="stockHistory.table.note">Observação</th>'],
  [
    '<td colspan="5" class="empty-state">Carregando...</td>',
    '<td colspan="5" class="empty-state" data-i18n="stockHistory.loading">Carregando...</td>',
  ],
  [
    'id="stock-history-pagination" class="table-pagination hidden" aria-label="Paginação do histórico"',
    'id="stock-history-pagination" class="table-pagination hidden" data-i18n-aria="stockHistory.paginationAria" aria-label="Paginação do histórico"',
  ],
  [
    'id="stock-history-prev-page">\n                  Anterior',
    'id="stock-history-prev-page" data-i18n="common.pagination.previous">\n                  Anterior',
  ],
  [
    'id="stock-history-next-page">\n                  Próxima',
    'id="stock-history-next-page" data-i18n="common.pagination.next">\n                  Próxima',
  ],

  ['<span>Total de vendas</span>\n              <strong id="sales-total-count">', '<span data-i18n="sales.summary.totalSales">Total de vendas</span>\n              <strong id="sales-total-count">'],
  ['<span>Vendas hoje</span>\n              <strong id="sales-today-count">', '<span data-i18n="sales.summary.salesToday">Vendas hoje</span>\n              <strong id="sales-today-count">'],
  ['<span>Faturamento do dia</span>', '<span data-i18n="sales.summary.todayRevenue">Faturamento do dia</span>'],
  ['<h3>Nova venda</h3>', '<h3 data-i18n="sales.register.title">Nova venda</h3>'],
  ['<span>Total</span>\n                  <strong id="sale-total-preview">', '<span data-i18n="sales.register.total">Total</span>\n                  <strong id="sale-total-preview">'],
  ['<span>Código de barras ou produto</span>', '<span data-i18n="sales.register.searchLabel">Código de barras ou produto</span>'],
  [
    'id="sale-search"\n                      type="search"\n                      placeholder="Leia o código ou digite o nome do produto"',
    'id="sale-search"\n                      type="search"\n                      data-i18n-placeholder="sales.register.searchPlaceholder"\n                      placeholder="Leia o código ou digite o nome do produto"',
  ],
  ['aria-label="Produtos encontrados"', 'data-i18n-aria="sales.register.suggestionsAria" aria-label="Produtos encontrados"'],
  [
    'id="sale-add-btn" class="btn sale-btn sale-btn-add">\n                  Adicionar',
    'id="sale-add-btn" class="btn sale-btn sale-btn-add" data-i18n="sales.register.add">\n                  Adicionar',
  ],
  [
    'id="sale-clear-cart-btn" class="btn btn-small btn-ghost" disabled>\n                    Limpar carrinho',
    'id="sale-clear-cart-btn" class="btn btn-small btn-ghost" disabled data-i18n="sales.register.clearCart">\n                    Limpar carrinho',
  ],
  ['<th>Produto</th>', '<th data-i18n="sales.cart.table.product">Produto</th>'],
  ['<th>Qtd.</th>', '<th data-i18n="sales.cart.table.qty">Qtd.</th>'],
  ['<th>Preço un.</th>', '<th data-i18n="sales.cart.table.unitPrice">Preço un.</th>'],
  ['<th>Subtotal</th>', '<th data-i18n="sales.cart.table.subtotal">Subtotal</th>'],
  [
    'class="empty-state sale-empty-state">\n                          Nenhum item no carrinho.',
    'class="empty-state sale-empty-state" data-i18n="sales.cart.empty">\n                          Nenhum item no carrinho.',
  ],
  ['<span>Cliente</span>', '<span data-i18n="sales.register.customer">Cliente</span>'],
  [
    'id="sale-customer"\n                    type="text"\n                    placeholder="Opcional"',
    'id="sale-customer"\n                    type="text"\n                    data-i18n-placeholder="stock.purchase.notePlaceholder"\n                    placeholder="Opcional"',
  ],
  ['<span>Desconto</span>', '<span data-i18n="sales.register.discount">Desconto</span>'],
  [
    'id="sale-submit-btn" disabled>\n                  Finalizar venda',
    'id="sale-submit-btn" disabled data-i18n="sales.register.finish">\n                  Finalizar venda',
  ],
  ['<span>Pagamento</span>\n                  <div class="sale-payment-pills"', '<span data-i18n="sales.register.payment">Pagamento</span>\n                  <div class="sale-payment-pills"'],
  ['<span class="status-filter-label">Pagamento</span>', '<span class="status-filter-label" data-i18n="sales.register.payment">Pagamento</span>'],
  ['role="group" aria-label="Forma de pagamento"', 'role="group" data-i18n-aria="sales.register.paymentAria" aria-label="Forma de pagamento"'],
  [
    'data-sale-payment="pix"\n                      aria-pressed="true"\n                    >\n                      Pix',
    'data-sale-payment="pix"\n                      aria-pressed="true"\n                      data-i18n="payment.pix"\n                    >\n                      Pix',
  ],
  [
    'data-sale-payment="dinheiro"\n                      aria-pressed="false"\n                    >\n                      Dinheiro',
    'data-sale-payment="dinheiro"\n                      aria-pressed="false"\n                      data-i18n="payment.cash"\n                    >\n                      Dinheiro',
  ],
  [
    'data-sale-payment="debito_credito"\n                      aria-pressed="false"\n                    >\n                      Débito/Crédito',
    'data-sale-payment="debito_credito"\n                      aria-pressed="false"\n                      data-i18n="payment.debitCredit"\n                    >\n                      Débito/Crédito',
  ],
  ['<h3>Últimas vendas</h3>', '<h3 data-i18n="sales.recent.title">Últimas vendas</h3>'],
  [
    'data-route="historico-vendas">\n                  Ver histórico',
    'data-route="historico-vendas" data-i18n="sales.recent.viewHistory">\n                  Ver histórico',
  ],
  [
    '<p class="table-sort-hint table-sort-hint-compact">Clique em Data ou Produto para ordenar.</p>',
    '<p class="table-sort-hint table-sort-hint-compact" data-i18n="sales.recent.sortHint">Clique em Data ou Produto para ordenar.</p>',
  ],
  ['<th scope="col">Pagamento</th>\n                      <th scope="col">Total</th>\n                      <th scope="col">Cliente</th>', '<th scope="col" data-i18n="sales.recent.table.payment">Pagamento</th>\n                      <th scope="col" data-i18n="sales.register.total">Total</th>\n                      <th scope="col" data-i18n="sales.recent.table.customer">Cliente</th>'],
  [
    '<td colspan="5" class="empty-state">Carregando...</td>',
    '<td colspan="5" class="empty-state" data-i18n="stock.loading">Carregando...</td>',
  ],

  ['<span>Total de vendas</span>\n              <strong id="sales-history-total-count">', '<span data-i18n="sales.summary.totalSales">Total de vendas</span>\n              <strong id="sales-history-total-count">'],
  ['<span>Vendas hoje</span>\n              <strong id="sales-history-today-count">', '<span data-i18n="sales.summary.salesToday">Vendas hoje</span>\n              <strong id="sales-history-today-count">'],
  ['<span>Receita total</span>', '<span data-i18n="salesHistory.summary.totalRevenue">Receita total</span>'],
  ['<span>Receita hoje</span>', '<span data-i18n="salesHistory.summary.revenueToday">Receita hoje</span>'],
  ['<h3>Todas as vendas</h3>', '<h3 data-i18n="salesHistory.panel.title">Todas as vendas</h3>'],
  [
    'id="sales-history-search"\n                  type="search"\n                  placeholder="Produto, código, cliente ou pagamento..."',
    'id="sales-history-search"\n                  type="search"\n                  data-i18n-placeholder="salesHistory.searchPlaceholder"\n                  placeholder="Produto, código, cliente ou pagamento..."',
  ],
  [
    '<span>Buscar</span>\n                <input\n                  id="sales-history-search"',
    '<span data-i18n="common.search">Buscar</span>\n                <input\n                  id="sales-history-search"',
  ],
  ['role="group" aria-label="Filtrar por pagamento"', 'role="group" data-i18n-aria="salesHistory.paymentFilterAria" aria-label="Filtrar por pagamento"'],
  [
    'data-sales-history-payment="pix"\n                      aria-pressed="false"\n                    >\n                      Pix',
    'data-sales-history-payment="pix"\n                      aria-pressed="false"\n                      data-i18n="payment.pix"\n                    >\n                      Pix',
  ],
  [
    'data-sales-history-payment="dinheiro"\n                      aria-pressed="false"\n                    >\n                      Dinheiro',
    'data-sales-history-payment="dinheiro"\n                      aria-pressed="false"\n                      data-i18n="payment.cash"\n                    >\n                      Dinheiro',
  ],
  [
    'data-sales-history-payment="debito_credito"\n                      aria-pressed="false"\n                    >\n                      Débito/Crédito',
    'data-sales-history-payment="debito_credito"\n                      aria-pressed="false"\n                      data-i18n="payment.debitCredit"\n                    >\n                      Débito/Crédito',
  ],
  [
    'data-sales-history-date-preset="today"\n                        aria-pressed="false"\n                      >\n                        Hoje',
    'data-sales-history-date-preset="today"\n                        aria-pressed="false"\n                        data-i18n="common.preset.today"\n                      >\n                        Hoje',
  ],
  [
    'data-sales-history-date-preset="7"\n                        aria-pressed="false"\n                      >\n                        7 dias',
    'data-sales-history-date-preset="7"\n                        aria-pressed="false"\n                        data-i18n="common.preset.last7Days"\n                      >\n                        7 dias',
  ],
  [
    'data-sales-history-date-preset="month"\n                        aria-pressed="false"\n                      >\n                        Este mês',
    'data-sales-history-date-preset="month"\n                        aria-pressed="false"\n                        data-i18n="common.preset.thisMonth"\n                      >\n                        Este mês',
  ],
  [
    'data-sales-history-date-preset="year"\n                        aria-pressed="false"\n                      >\n                        Este ano',
    'data-sales-history-date-preset="year"\n                        aria-pressed="false"\n                        data-i18n="common.preset.thisYear"\n                      >\n                        Este ano',
  ],
  ['id="sales-history-date-from"\n                      type="date"\n                      class="date-range-input"\n                      aria-label="Data inicial"', 'id="sales-history-date-from"\n                      type="date"\n                      class="date-range-input"\n                      data-i18n-aria="common.dateFromAria"\n                      aria-label="Data inicial"'],
  ['id="sales-history-date-to"\n                      type="date"\n                      class="date-range-input"\n                      aria-label="Data final"', 'id="sales-history-date-to"\n                      type="date"\n                      class="date-range-input"\n                      data-i18n-aria="common.dateToAria"\n                      aria-label="Data final"'],
  [
    'id="sales-history-clear-filters"\n                  class="btn btn-small btn-ghost product-filter-clear"\n                >\n                  Limpar filtros',
    'id="sales-history-clear-filters"\n                  class="btn btn-small btn-ghost product-filter-clear"\n                  data-i18n="common.clearFilters"\n                >\n                  Limpar filtros',
  ],
  [
    `<p
              id="sales-history-results"
              class="sales-history-results hidden"
              aria-live="polite"
            >
              <span>
                Mostrando <strong id="sales-history-visible-count">0</strong> venda(s)
              </span>
              <span class="sales-history-results-separator" aria-hidden="true">·</span>
              <span>
                Receita filtrada:
                <strong id="sales-history-filtered-revenue">R$ 0,00</strong>
              </span>
            </p>`,
    `<p
              id="sales-history-results"
              class="sales-history-results hidden"
              aria-live="polite"
            >
              <span id="sales-history-showing-text"></span>
              <span class="sales-history-results-separator" aria-hidden="true">·</span>
              <span>
                <span data-i18n="salesHistory.results.filteredRevenue">Receita filtrada:</span>
                <strong id="sales-history-filtered-revenue">R$ 0,00</strong>
              </span>
            </p>`,
  ],
  [
    '<p class="table-sort-hint">Clique nos cabeçalhos da tabela para ordenar.</p>',
    '<p class="table-sort-hint" data-i18n="salesHistory.sortHint">Clique nos cabeçalhos da tabela para ordenar.</p>',
  ],
  ['<th scope="col">Código de barras</th>', '<th scope="col" data-i18n="stock.table.barcode">Código de barras</th>'],
  ['<th scope="col">Preço unit.</th>', '<th scope="col" data-i18n="salesHistory.table.unitPrice">Preço unit.</th>'],
  ['<th scope="col">Desconto</th>', '<th scope="col" data-i18n="salesHistory.table.discount">Desconto</th>'],
  [
    '<td colspan="9" class="empty-state">Carregando...</td>',
    '<td colspan="9" class="empty-state" data-i18n="salesHistory.loading">Carregando...</td>',
  ],
  [
    'id="sales-history-pagination" class="table-pagination hidden" aria-label="Paginação do histórico"',
    'id="sales-history-pagination" class="table-pagination hidden" data-i18n-aria="salesHistory.paginationAria" aria-label="Paginação do histórico"',
  ],
  [
    'id="sales-history-prev-page">\n                  Anterior',
    'id="sales-history-prev-page" data-i18n="common.pagination.previous">\n                  Anterior',
  ],
  [
    'id="sales-history-next-page">\n                  Próxima',
    'id="sales-history-next-page" data-i18n="common.pagination.next">\n                  Próxima',
  ],
];

for (const [from, to] of pairs) {
  if (!html.includes(from)) {
    console.warn('missing:', from.slice(0, 70).replace(/\n/g, ' '));
    continue;
  }

  html = html.split(from).join(to);
}

wrapSortButton('Produto', 'stock.table.product');
wrapSortButton('Preço', 'stock.table.price');
wrapSortButton('Estoque', 'stock.table.stock');
wrapSortButton('Status', 'stock.table.status');
wrapSortButton('Data', 'stockHistory.table.date');
wrapSortButton('Quantidade', 'stockHistory.table.quantity');
wrapSortButton('Cliente', 'salesHistory.table.customer');
wrapSortButton('Pagamento', 'sales.recent.table.payment');
wrapSortButton('Qtd.', 'sales.cart.table.qty');
wrapSortButton('Total', 'sales.register.total');

wrapRecentSortButton('Data', 'stockHistory.table.date');
wrapRecentSortButton('Produto', 'stock.table.product');

fs.writeFileSync(path, html);
console.log('Completed i18n tagging for index.html');
