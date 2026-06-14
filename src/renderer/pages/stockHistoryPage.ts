import { stockEntryState } from '../state/stockEntryState';
import type { StockHistoryListResult } from '../../types/stockHistory';
import { onLocaleChange, t, translateDisplayNote } from '../i18n';
import { escapeHtml } from '../utils/dom';
import { formatDateTime, formatPageInfo, formatPageRange } from '../utils/format';
import {
  createDefaultStockHistoryFilters,
  hasActiveStockHistoryFilters,
  isInvalidDateRange,
  type StockHistoryFilters,
  type StockMovementFilter,
} from '../utils/stockEntryFilters';
import {
  cloneStockEntrySortRules,
  cycleStockEntrySortRule,
  type StockEntrySortColumn,
} from '../utils/stockEntrySort';

const PAGE_SIZE = 50;

const screen = document.getElementById('screen-historico-estoque') as HTMLElement;
const entriesBody = document.getElementById('stock-history-body') as HTMLTableSectionElement;
const historyTable = screen.querySelector('.stock-history-table') as HTMLTableElement;
const historySearch = document.getElementById('stock-history-search') as HTMLInputElement;
const dateFromInput = document.getElementById('stock-history-date-from') as HTMLInputElement;
const dateToInput = document.getElementById('stock-history-date-to') as HTMLInputElement;
const datePresetButtons = screen.querySelectorAll<HTMLButtonElement>('[data-date-preset]');
const movementFilterButtons = screen.querySelectorAll<HTMLButtonElement>('[data-movement-filter]');
const clearFiltersBtn = document.getElementById('stock-history-clear-filters') as HTMLButtonElement;
const totalEntriesEl = document.getElementById('stock-history-total-count') as HTMLElement;
const monthEntriesEl = document.getElementById('stock-history-month-count') as HTMLElement;
const totalItemsEl = document.getElementById('stock-history-total-items') as HTMLElement;
const monthItemsEl = document.getElementById('stock-history-month-items') as HTMLElement;
const paginationEl = document.getElementById('stock-history-pagination') as HTMLElement;
const pageInfoEl = document.getElementById('stock-history-page-info') as HTMLElement;
const pageRangeEl = document.getElementById('stock-history-page-range') as HTMLElement;
const prevPageBtn = document.getElementById('stock-history-prev-page') as HTMLButtonElement;
const nextPageBtn = document.getElementById('stock-history-next-page') as HTMLButtonElement;

const sortButtons = historyTable.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

let filters: StockHistoryFilters = createDefaultStockHistoryFilters();
let currentPage = 1;
let latestResult: StockHistoryListResult | null = null;
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
    // same day for from and to
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
    (button) => button.dataset.datePreset === preset,
  );

  if (activeButton) {
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-pressed', 'true');
  }

  applyFilters();
}

function formatQuantityChange(quantity: number): string {
  return quantity > 0 ? `+${quantity}` : String(quantity);
}

function getSelectedMovements(): StockMovementFilter[] {
  return [...movementFilterButtons]
    .filter((button) => button.classList.contains('active'))
    .map((button) => button.dataset.movementFilter as StockMovementFilter);
}

function clearMovementFilters(): void {
  movementFilterButtons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function readFiltersFromUi(): StockHistoryFilters {
  return {
    search: historySearch.value.trim(),
    movements: getSelectedMovements(),
    dateFrom: dateFromInput.value,
    dateTo: dateToInput.value,
    sort: cloneStockEntrySortRules(filters.sort),
  };
}

function updateSortHeaders(): void {
  sortButtons.forEach((button) => {
    const sortColumn = button.dataset.sortColumn as StockEntrySortColumn;
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
  const summary = stockEntryState.getSummary();

  totalEntriesEl.textContent = String(summary.totalEntries);
  monthEntriesEl.textContent = String(summary.monthEntries);
  totalItemsEl.textContent = String(summary.totalItemsAdded);
  monthItemsEl.textContent = String(summary.monthItemsAdded);
}

function renderInvalidDateRange(): void {
  latestResult = null;
  paginationEl.classList.add('hidden');
  entriesBody.innerHTML =
    `<tr><td colspan="5" class="empty-state">${t('common.invalidDateRange')}</td></tr>`;
}

function renderLoadingState(): void {
  entriesBody.innerHTML = `<tr><td colspan="5" class="empty-state">${t('stockHistory.loading')}</td></tr>`;
  paginationEl.classList.add('hidden');
}

function renderRows(result: StockHistoryListResult): void {
  entriesBody.innerHTML = '';

  for (const entry of result.items) {
    const row = document.createElement('tr');
    const quantityClass =
      entry.quantity > 0 ? 'history-qty-positive' : 'history-qty-negative';

    row.innerHTML = `
      <td>${formatDateTime(entry.createdAt)}</td>
      <td>${escapeHtml(entry.productName)}</td>
      <td>${escapeHtml(entry.productBarcode || '—')}</td>
      <td><span class="${quantityClass}">${formatQuantityChange(entry.quantity)}</span></td>
      <td>${escapeHtml(translateDisplayNote(entry.note || '') || '—')}</td>
    `;

    entriesBody.appendChild(row);
  }
}

function updatePagination(result: StockHistoryListResult): void {
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
    ? t('stockHistory.empty.noFilterResults')
    : t('stockHistory.empty.none');
  entriesBody.innerHTML = `<tr><td colspan="5" class="empty-state">${message}</td></tr>`;
}

function renderResult(result: StockHistoryListResult): void {
  latestResult = result;
  currentPage = result.page;

  if (result.total === 0) {
    renderEmptyState(hasActiveStockHistoryFilters(filters));
    return;
  }

  renderRows(result);
  updatePagination(result);
}

async function refreshSummary(): Promise<void> {
  const summary = await window.electronAPI.stockEntries.summary();
  stockEntryState.updateSummary(summary);
  renderSummaryCards();
}

async function loadHistoryPage(): Promise<void> {
  if (isInvalidDateRange(filters.dateFrom, filters.dateTo)) {
    renderInvalidDateRange();
    return;
  }

  const requestId = ++loadRequestId;
  renderLoadingState();

  const result = await window.electronAPI.stockEntries.listHistory({
    search: filters.search,
    movements: filters.movements,
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
  clearMovementFilters();
  clearDatePresets();
  filters = createDefaultStockHistoryFilters();
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

export function initStockHistoryPage(): void {
  updateSortHeaders();

  stockEntryState.subscribe(() => {
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
      const preset = button.dataset.datePreset;

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

  movementFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isActive = button.classList.toggle('active');
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      applyFilters();
    });
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const column = button.dataset.sortColumn as StockEntrySortColumn;

      filters = {
        ...readFiltersFromUi(),
        sort: cycleStockEntrySortRule(filters.sort, column),
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

export async function onEnterStockHistoryPage(): Promise<void> {
  await Promise.all([refreshSummary(), loadHistoryPage()]);
}
