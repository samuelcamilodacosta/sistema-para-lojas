import type { Product } from '../../types/product';
import type { ProductListResult } from '../../types/productList';
import { beginEditProduct, focusNewProductForm, focusPurchaseForm } from './productFormPage';
import { refreshPurchasesView } from './purchasesPage';
import { initStockActionsPanel } from '../utils/stockActionsPanel';
import { onLocaleChange, t, translateError } from '../i18n';
import { productState } from '../state/productState';
import { stockEntryState } from '../state/stockEntryState';
import { escapeHtml, setMessage } from '../utils/dom';
import { formatCurrency, formatPageInfo, formatPageRange } from '../utils/format';
import {
  createDefaultProductFilters,
  hasActiveProductListFilters,
  type ProductListFilters,
  type ProductStatusFilter,
} from '../utils/productFilters';
import {
  cloneSortRules,
  cycleSortRule,
  type ProductSortColumn,
} from '../utils/productSort';
import { getStockStatus } from '../utils/stock';
import type { RouteParams } from '../router';

const PAGE_SIZE = 50;

const screen = document.getElementById('screen-estoque') as HTMLElement;
const productsBody = document.getElementById('products-body') as HTMLTableSectionElement;
const productsTable = screen.querySelector('.products-table-sortable') as HTMLTableElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const statusFilterButtons = screen.querySelectorAll<HTMLButtonElement>('[data-status-filter]');
const clearFiltersBtn = document.getElementById('product-clear-filters') as HTMLButtonElement;
const stockMessage = document.getElementById('stock-message') as HTMLParagraphElement;
const paginationEl = document.getElementById('products-pagination') as HTMLElement;
const pageInfoEl = document.getElementById('products-page-info') as HTMLElement;
const pageRangeEl = document.getElementById('products-page-range') as HTMLElement;
const prevPageBtn = document.getElementById('products-prev-page') as HTMLButtonElement;
const nextPageBtn = document.getElementById('products-next-page') as HTMLButtonElement;

const sortButtons = productsTable.querySelectorAll<HTMLButtonElement>('[data-sort-column]');

let filters: ProductListFilters = createDefaultProductFilters();
let currentPage = 1;
let latestResult: ProductListResult | null = null;
let loadRequestId = 0;

function getSelectedStatuses(): ProductStatusFilter[] {
  return [...statusFilterButtons]
    .filter((button) => button.classList.contains('active'))
    .map((button) => button.dataset.statusFilter as ProductStatusFilter);
}

function clearStatusFilters(): void {
  statusFilterButtons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function showMessage(text: string, type: 'success' | 'error'): void {
  setMessage(stockMessage, text, type);
}

function clearMessage(): void {
  setMessage(stockMessage, '', 'none');
}

function readFiltersFromUi(): ProductListFilters {
  return {
    search: searchInput.value.trim(),
    statuses: getSelectedStatuses(),
    sort: cloneSortRules(filters.sort),
  };
}

function updateSortHeaders(): void {
  sortButtons.forEach((button) => {
    const sortColumn = button.dataset.sortColumn as ProductSortColumn;
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

function renderLoadingState(): void {
  productsBody.innerHTML = `<tr><td colspan="6" class="empty-state">${t('stock.loadingProducts')}</td></tr>`;
  paginationEl.classList.add('hidden');
}

function renderRows(items: Product[]): void {
  productsBody.innerHTML = '';

  for (const product of items) {
    const status = getStockStatus(product.quantity);
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.barcode || '—')}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>${product.quantity}</td>
      <td><span class="status-badge ${status.className}">${status.label}</span></td>
      <td class="actions">
        <button type="button" class="btn btn-small" data-action="decrease" data-id="${product.id}">-1</button>
        <button type="button" class="btn btn-small" data-action="increase" data-id="${product.id}">+1</button>
        <button type="button" class="btn btn-small btn-ghost" data-action="edit" data-id="${product.id}">${t('stock.table.edit')}</button>
        <button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="${product.id}">${t('stock.table.delete')}</button>
      </td>
    `;

    productsBody.appendChild(row);
  }
}

function updatePagination(result: ProductListResult): void {
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
  const message = filtersActive ? t('stock.empty.noFilterResults') : t('stock.empty.noProducts');
  productsBody.innerHTML = `<tr><td colspan="6" class="empty-state">${message}</td></tr>`;
}

function renderResult(result: ProductListResult): void {
  latestResult = result;
  currentPage = result.page;

  if (result.total === 0) {
    renderEmptyState(hasActiveProductListFilters(filters));
    return;
  }

  renderRows(result.items);
  updatePagination(result);
}

async function loadProductsPage(): Promise<void> {
  const requestId = ++loadRequestId;
  renderLoadingState();

  const result = await window.electronAPI.products.listPage({
    search: filters.search,
    statuses: filters.statuses,
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
  void loadProductsPage();
}

function clearFilters(): void {
  searchInput.value = '';
  clearStatusFilters();
  filters = createDefaultProductFilters();
  currentPage = 1;
  updateSortHeaders();
  void loadProductsPage();
}

function goToPage(page: number): void {
  if (page < 1 || (latestResult && page > latestResult.totalPages)) {
    return;
  }

  currentPage = page;
  void loadProductsPage();
}

export function initStockPage(): void {
  initStockActionsPanel();
  updateSortHeaders();

  productState.subscribe(() => {
    void loadProductsPage();
  });

  searchInput.addEventListener('input', applyFilters);

  statusFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isActive = button.classList.toggle('active');
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      applyFilters();
    });
  });

  clearFiltersBtn.addEventListener('click', clearFilters);
  prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
  nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const column = button.dataset.sortColumn as ProductSortColumn;

      filters = {
        ...readFiltersFromUi(),
        sort: cycleSortRule(filters.sort, column),
      };
      currentPage = 1;
      updateSortHeaders();
      void loadProductsPage();
    });
  });

  productsBody.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button[data-action]') as HTMLButtonElement | null;

    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (!action || !id) {
      return;
    }

    clearMessage();

    try {
      if (action === 'edit') {
        await beginEditProduct(id);
        return;
      }

      if (action === 'delete') {
        const product =
          latestResult?.items.find((item) => item.id === id) ??
          productState.getProducts().find((item) => item.id === id);

        if (!product) {
          return;
        }

        const confirmed = window.confirm(t('stock.confirmDelete', { name: product.name }));
        if (!confirmed) {
          return;
        }

        await window.electronAPI.products.remove(id);
        await productState.refresh();
        showMessage(t('stock.messages.productDeleted'), 'success');
        return;
      }

      if (action === 'increase') {
        await window.electronAPI.products.adjustStock({ id, amount: 1 });
        await Promise.all([productState.refresh(), stockEntryState.refresh()]);
        return;
      }

      if (action === 'decrease') {
        await window.electronAPI.products.adjustStock({ id, amount: -1 });
        await Promise.all([productState.refresh(), stockEntryState.refresh()]);
      }
    } catch (error) {
      showMessage(translateError(error, 'stock.messages.actionError'), 'error');
    }
  });

  onLocaleChange(() => {
    if (!screen.classList.contains('active')) {
      return;
    }

    if (latestResult) {
      renderResult(latestResult);
      return;
    }

    void loadProductsPage();
  });
}

export async function onEnterStockPage(params: RouteParams = {}): Promise<void> {
  clearMessage();
  await Promise.all([productState.refresh(), refreshPurchasesView()]);
  await loadProductsPage();

  if (params.productId) {
    await beginEditProduct(params.productId);
    return;
  }

  if (params.tab === 'cadastro') {
    focusNewProductForm();
    return;
  }

  if (params.tab === 'compras') {
    focusPurchaseForm();
  }
}
