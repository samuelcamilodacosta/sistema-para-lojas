import { saleState } from '../state/saleState';
import type { SaleHistoryListResult } from '../../types/saleHistory';
import { onLocaleChange, t, tCount } from '../i18n';
import { escapeHtml } from '../utils/dom';
import { formatCurrency, formatDateTime, formatPageInfo, formatPageRange } from '../utils/format';
import {
  createDefaultSaleHistoryFilters,
  hasActiveSaleHistoryFilters,
  isInvalidDateRange,
  type SaleHistoryFilters,
  type SaleHistoryPaymentFilter,
} from '../utils/saleHistoryFilters';
import {
  cloneSaleHistorySortRules,
  cycleSaleHistorySortRule,
  type SaleHistorySortColumn,
} from '../utils/saleHistorySort';
import { formatPaymentMethod, paymentMethodBadgeClass } from '../utils/payment';

const PAGE_SIZE = 50;

const screen = document.getElementById('screen-historico-vendas') as HTMLElement;
const salesBody = document.getElementById('sales-history-body') as HTMLTableSectionElement;
const historyTable = screen.querySelector('.sales-history-table') as HTMLTableElement;
const historySearch = document.getElementById('sales-history-search') as HTMLInputElement;
const dateFromInput = document.getElementById('sales-history-date-from') as HTMLInputElement;
const dateToInput = document.getElementById('sales-history-date-to') as HTMLInputElement;
const datePresetButtons = screen.querySelectorAll<HTMLButtonElement>(
  '[data-sales-history-date-preset]',
);
const paymentFilterButtons = screen.querySelectorAll<HTMLButtonElement>(
  '[data-sales-history-payment]',
);
const clearFiltersBtn = document.getElementById('sales-history-clear-filters') as HTMLButtonElement;
const totalSalesEl = document.getElementById('sales-history-total-count') as HTMLElement;
const todaySalesEl = document.getElementById('sales-history-today-count') as HTMLElement;
const totalRevenueEl = document.getElementById('sales-history-total-revenue') as HTMLElement;
const todayRevenueEl = document.getElementById('sales-history-today-revenue') as HTMLElement;
const visibleCountEl = document.getElementById('sales-history-visible-count') as HTMLElement | null;
const showingTextEl = document.getElementById('sales-history-showing-text') as HTMLElement;
const filteredRevenueEl = document.getElementById('sales-history-filtered-revenue') as HTMLElement;
const resultsMetaEl = document.getElementById('sales-history-results') as HTMLElement;
const paginationEl = document.getElementById('sales-history-pagination') as HTMLElement;
const pageInfoEl = document.getElementById('sales-history-page-info') as HTMLElement;
const pageRangeEl = document.getElementById('sales-history-page-range') as HTMLElement;
const prevPageBtn = document.getElementById('sales-history-prev-page') as HTMLButtonElement;
const nextPageBtn = document.getElementById('sales-history-next-page') as HTMLButtonElement;

const sortButtons = historyTable.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

let filters: SaleHistoryFilters = createDefaultSaleHistoryFilters();
let currentPage = 1;
let latestResult: SaleHistoryListResult | null = null;
let loadRequestId = 0;

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function clearDatePresets(): void {
  datePresetButtons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function clearDateFilter(): void {
  dateFromInput.value = '';
  dateToInput.value = '';
  clearDatePresets();
  applyFilters();
}

function applyDatePreset(preset: string): void {
  const end = new Date();
  const start = new Date(end);

  if (preset === 'today') {
    // same day
  } else if (preset === 'month') {
    start.setDate(1);
  } else if (preset === 'year') {
    start.setMonth(0, 1);
  } else {
    const days = Number.parseInt(preset, 10);

    if (!Number.isFinite(days) || days < 1) {
      return;
    }

    start.setDate(start.getDate() - (days - 1));
  }

  dateFromInput.value = toDateInputValue(start);
  dateToInput.value = toDateInputValue(end);
  clearDatePresets();

  const activeButton = [...datePresetButtons].find(
    (button) => button.dataset.salesHistoryDatePreset === preset,
  );

  if (activeButton) {
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-pressed', 'true');
  }

  applyFilters();
}

function getSelectedPayments(): SaleHistoryPaymentFilter[] {
  return [...paymentFilterButtons]
    .filter((button) => button.classList.contains('active'))
    .map((button) => button.dataset.salesHistoryPayment as SaleHistoryPaymentFilter);
}

function clearPaymentFilters(): void {
  paymentFilterButtons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function readFiltersFromUi(): SaleHistoryFilters {
  return {
    search: historySearch.value.trim(),
    payments: getSelectedPayments(),
    dateFrom: dateFromInput.value,
    dateTo: dateToInput.value,
    sort: cloneSaleHistorySortRules(filters.sort),
  };
}

function updateSortHeaders(): void {
  sortButtons.forEach((button) => {
    const sortColumn = button.dataset.sortColumn as SaleHistorySortColumn;
    const ruleIndex = filters.sort.findIndex((rule) => rule.column === sortColumn);
    const rule = ruleIndex >= 0 ? filters.sort[ruleIndex] : undefined;
    const indicator = button.querySelector('.table-sort-indicator') as HTMLElement;
    let priority = button.querySelector('.table-sort-priority') as HTMLElement | null;

    button.classList.toggle('active', Boolean(rule));
    button.setAttribute(
      'aria-sort',
      rule ? (rule.direction === 'asc' ? 'ascending' : 'descending') : 'none',
    );
    indicator.textContent = rule ? (rule.direction === 'asc' ? '↑' : '↓') : '';

    if (rule && filters.sort.length > 1) {
      /* v8 ignore start -- prioridade de ordenação múltipla reservada para evolução futura */
      if (!priority) {
        priority = document.createElement('span');
        priority.className = 'table-sort-priority';
        button.appendChild(priority);
      }

      priority.textContent = String(ruleIndex + 1);
      /* v8 ignore stop */
    } else if (priority) {
      /* v8 ignore next */
      priority.remove();
    }
  });
}

function renderSummaryCards(): void {
  const summary = saleState.getSummary();

  totalSalesEl.textContent = String(summary.totalSales);
  todaySalesEl.textContent = String(summary.todaySales);
  totalRevenueEl.textContent = formatCurrency(summary.totalRevenue);
  todayRevenueEl.textContent = formatCurrency(summary.todayRevenue);
}

function renderInvalidDateRange(): void {
  latestResult = null;
  resultsMetaEl.classList.add('hidden');
  paginationEl.classList.add('hidden');
  salesBody.innerHTML =
    `<tr><td colspan="9" class="empty-state">${t('common.invalidDateRange')}</td></tr>`;
}

function renderLoadingState(): void {
  salesBody.innerHTML = `<tr><td colspan="9" class="empty-state">${t('salesHistory.loading')}</td></tr>`;
  paginationEl.classList.add('hidden');
}

function renderRows(result: SaleHistoryListResult): void {
  salesBody.innerHTML = '';

  for (const sale of result.items) {
    const row = document.createElement('tr');
    const paymentBadgeClass = paymentMethodBadgeClass(sale.paymentMethod);
    const paymentLabel = formatPaymentMethod(sale.paymentMethod);

    row.innerHTML = `
      <td class="sales-history-date">${formatDateTime(sale.soldAt)}</td>
      <td>${sale.customerName ? escapeHtml(sale.customerName) : '<span class="cell-muted">—</span>'}</td>
      <td><span class="${paymentBadgeClass}">${escapeHtml(paymentLabel)}</span></td>
      <td class="sales-history-product">${escapeHtml(sale.productName)}</td>
      <td class="cell-mono">${escapeHtml(sale.productBarcode || '—')}</td>
      <td class="cell-numeric">${sale.quantity}</td>
      <td class="cell-numeric">${formatCurrency(sale.unitPrice)}</td>
      <td class="cell-numeric ${sale.discount > 0 ? 'sales-history-discount' : ''}">${sale.discount > 0 ? formatCurrency(sale.discount) : '<span class="cell-muted">—</span>'}</td>
      <td class="cell-numeric sales-history-total">${formatCurrency(sale.total)}</td>
    `;

    salesBody.appendChild(row);
  }
}

function updateResultsMeta(result: SaleHistoryListResult): void {
  const filtersActive = hasActiveSaleHistoryFilters(filters);

  showingTextEl.textContent = tCount('salesHistory.results.showing', result.total);
  if (visibleCountEl) {
    visibleCountEl.textContent = String(result.total);
  }
  filteredRevenueEl.textContent = formatCurrency(result.filteredRevenue);
  resultsMetaEl.classList.toggle('hidden', result.total === 0 && !filtersActive);
  resultsMetaEl.classList.toggle('sales-history-results-filtered', filtersActive);
}

function updatePagination(result: SaleHistoryListResult): void {
  const hasItems = result.total > 0;
  const rangeStart = hasItems ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = hasItems ? Math.min(result.page * result.pageSize, result.total) : 0;

  paginationEl.classList.toggle('hidden', result.totalPages <= 1);
  pageInfoEl.textContent = formatPageInfo(result.page, result.totalPages);
  pageRangeEl.textContent = hasItems
    ? formatPageRange(rangeStart, rangeEnd, result.total)
    : t('common.pagination.noResults');
  prevPageBtn.disabled = result.page <= 1;
  nextPageBtn.disabled = result.page >= result.totalPages;
}

function renderEmptyState(filtersActive: boolean): void {
  paginationEl.classList.add('hidden');
  const message = filtersActive
    ? t('salesHistory.empty.noFilterResults')
    : t('salesHistory.empty.none');
  salesBody.innerHTML = `<tr><td colspan="9" class="empty-state">${message}</td></tr>`;
}

function renderResult(result: SaleHistoryListResult): void {
  latestResult = result;
  currentPage = result.page;
  updateResultsMeta(result);

  if (result.total === 0) {
    renderEmptyState(hasActiveSaleHistoryFilters(filters));
    return;
  }

  renderRows(result);
  updatePagination(result);
}

async function refreshSummary(): Promise<void> {
  const summary = await window.electronAPI.sales.summary();
  saleState.updateSummary(summary);
  renderSummaryCards();
}

async function loadHistoryPage(): Promise<void> {
  if (isInvalidDateRange(filters.dateFrom, filters.dateTo)) {
    renderInvalidDateRange();
    return;
  }

  const requestId = ++loadRequestId;
  renderLoadingState();

  const result = await window.electronAPI.sales.listHistory({
    search: filters.search,
    payments: filters.payments,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sort: filters.sort,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  if (requestId !== loadRequestId) {
    return;
  }

  renderResult(result);
}

function applyFilters(): void {
  filters = readFiltersFromUi();
  currentPage = 1;
  updateSortHeaders();
  void loadHistoryPage();
}

function clearFilters(): void {
  historySearch.value = '';
  dateFromInput.value = '';
  dateToInput.value = '';
  clearPaymentFilters();
  clearDatePresets();
  filters = createDefaultSaleHistoryFilters();
  currentPage = 1;
  updateSortHeaders();
  void loadHistoryPage();
}

function goToPage(page: number): void {
  if (page < 1 || (latestResult && page > latestResult.totalPages)) {
    return;
  }

  currentPage = page;
  void loadHistoryPage();
}

export function initSalesHistoryPage(): void {
  updateSortHeaders();

  saleState.subscribe(() => {
    renderSummaryCards();
    void loadHistoryPage();
  });

  historySearch.addEventListener('input', applyFilters);
  dateFromInput.addEventListener('change', () => {
    clearDatePresets();
    applyFilters();
  });
  dateToInput.addEventListener('change', () => {
    clearDatePresets();
    applyFilters();
  });
  clearFiltersBtn.addEventListener('click', clearFilters);
  prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
  nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));

  datePresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.dataset.salesHistoryDatePreset;

      if (!preset) {
        return;
      }

      if (button.classList.contains('active')) {
        clearDateFilter();
        return;
      }

      applyDatePreset(preset);
    });
  });

  paymentFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isActive = button.classList.toggle('active');
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      applyFilters();
    });
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const column = button.dataset.sortColumn as SaleHistorySortColumn;

      filters = {
        ...readFiltersFromUi(),
        sort: cycleSaleHistorySortRule(filters.sort, column),
      };
      currentPage = 1;
      updateSortHeaders();
      void loadHistoryPage();
    });
  });

  onLocaleChange(() => {
    if (!screen.classList.contains('active')) {
      return;
    }

    renderSummaryCards();

    if (latestResult) {
      renderResult(latestResult);
      return;
    }

    void loadHistoryPage();
  });
}

export async function onEnterSalesHistoryPage(): Promise<void> {
  await Promise.all([refreshSummary(), loadHistoryPage()]);
}
