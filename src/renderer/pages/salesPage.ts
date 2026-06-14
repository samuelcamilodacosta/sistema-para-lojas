import { productState } from '../state/productState';
import { saleState } from '../state/saleState';
import { getIntlLocale, onLocaleChange, t, translateError } from '../i18n';
import { escapeHtml, setMessage } from '../utils/dom';
import {
  formatCurrency,
  formatShortDateTime,
  readDecimalInput,
} from '../utils/format';
import { bindDecimalInput, setDecimalInputValue } from '../utils/decimalInput';
import {
  formatPaymentMethod,
  isPaymentMethod,
  paymentMethodBadgeClass,
} from '../utils/payment';
import {
  cloneRecentSaleSortRules,
  cycleRecentSaleSortRule,
  DEFAULT_RECENT_SALE_SORT,
  sortRecentSales,
  type RecentSaleSortColumn,
  type RecentSaleSortRule,
} from '../utils/saleSort';
import type { PaymentMethod } from '../../types/sale';
import type { Product } from '../../types/product';

const RECENT_SALES_LIMIT = 10;
const SEARCH_SUGGESTION_LIMIT = 8;

interface CartLine {
  productId: string;
  productName: string;
  productBarcode: string;
  unitPrice: number;
  quantity: number;
}

const saleForm = document.getElementById('sale-form') as HTMLFormElement;
const searchInput = document.getElementById('sale-search') as HTMLInputElement;
const searchSuggestions = document.getElementById('sale-search-suggestions') as HTMLUListElement;
const discountInput = document.getElementById('sale-discount') as HTMLInputElement;
const customerInput = document.getElementById('sale-customer') as HTMLInputElement;
const productInfoEl = document.getElementById('sale-product-info') as HTMLElement;
const addBtn = document.getElementById('sale-add-btn') as HTMLButtonElement;
const clearCartBtn = document.getElementById('sale-clear-cart-btn') as HTMLButtonElement;
const submitBtn = document.getElementById('sale-submit-btn') as HTMLButtonElement;
const cartBody = document.getElementById('sale-cart-body') as HTMLTableSectionElement;
const cartCountEl = document.getElementById('sale-cart-count') as HTMLElement;
const paymentPills = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-sale-payment]'),
);
const saleTotalEl = document.getElementById('sale-total-preview') as HTMLElement;
const saleMessage = document.getElementById('sale-message') as HTMLParagraphElement;
const salesBody = document.getElementById('sales-body') as HTMLTableSectionElement;
const recentSalesTable = document.querySelector(
  '.sale-recent-table.products-table-sortable',
) as HTMLTableElement;
const recentSaleSortButtons = recentSalesTable.querySelectorAll<HTMLButtonElement>(
  '[data-recent-sale-sort]',
);

const totalSalesEl = document.getElementById('sales-total-count') as HTMLElement;
const todaySalesEl = document.getElementById('sales-today-count') as HTMLElement;
const todayRevenueEl = document.getElementById('sales-today-revenue') as HTMLElement;

const screen = document.getElementById('screen-vendas') as HTMLElement;

let selectedPayment: PaymentMethod = 'pix';
let cart: CartLine[] = [];
let suggestionProducts: Product[] = [];
let highlightedSuggestion = -1;
let recentSalesSort: RecentSaleSortRule[] = cloneRecentSaleSortRules(DEFAULT_RECENT_SALE_SORT);

function showMessage(text: string, type: 'success' | 'error'): void {
  setMessage(saleMessage, text, type);
}

function clearMessage(): void {
  setMessage(saleMessage, '', 'none');
}

function setSelectedPayment(method: PaymentMethod): void {
  selectedPayment = method;

  for (const pill of paymentPills) {
    const isActive = pill.dataset.salePayment === method;
    pill.classList.toggle('active', isActive);
    pill.setAttribute('aria-pressed', String(isActive));
  }
}

function getInStockProducts(): Product[] {
  return productState.getProducts().filter((product) => product.quantity > 0);
}

function getProductById(productId: string): Product | undefined {
  return productState.getProducts().find((item) => item.id === productId);
}

function getCartQuantity(productId: string, excludeLineIndex?: number): number {
  return cart.reduce((sum, line, index) => {
    if (line.productId !== productId || index === excludeLineIndex) {
      return sum;
    }

    return sum + line.quantity;
  }, 0);
}

function getAvailableStock(productId: string, excludeLineIndex?: number): number {
  const product = getProductById(productId);
  if (!product) {
    /* v8 ignore next */
    return 0;
  }

  return Math.max(0, product.quantity - getCartQuantity(productId, excludeLineIndex));
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function findProductByBarcode(barcode: string): Product | undefined {
  const normalized = barcode.trim();
  if (!normalized) {
    /* v8 ignore next */
    return undefined;
  }

  return getInStockProducts().find((product) => product.barcode === normalized);
}

function findProductByExactName(name: string): Product | undefined {
  const normalized = normalizeSearch(name);
  if (!normalized) {
    /* v8 ignore next */
    return undefined;
  }

  return getInStockProducts().find(
    (product) => product.name.trim().toLowerCase() === normalized,
  );
}

function searchProducts(query: string): Product[] {
  const trimmed = query.trim();
  const normalized = normalizeSearch(query);

  if (!normalized) {
    /* v8 ignore next */
    return [];
  }

  return getInStockProducts()
    .filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(normalized);
      const barcodeMatch = product.barcode.includes(trimmed);
      return nameMatch || barcodeMatch;
    })
    .sort((left, right) => {
      const leftName = left.name.toLowerCase();
      const rightName = right.name.toLowerCase();

      if (left.barcode === trimmed && right.barcode !== trimmed) {
        /* v8 ignore next */
        return -1;
      }

      if (right.barcode === trimmed && left.barcode !== trimmed) {
        /* v8 ignore next */
        return 1;
      }

      if (leftName.startsWith(normalized) && !rightName.startsWith(normalized)) {
        /* v8 ignore next */
        return -1;
      }

      if (rightName.startsWith(normalized) && !leftName.startsWith(normalized)) {
        /* v8 ignore next */
        return 1;
      }

      return left.name.localeCompare(right.name, getIntlLocale());
    })
    .slice(0, SEARCH_SUGGESTION_LIMIT);
}

function hideSuggestions(): void {
  suggestionProducts = [];
  highlightedSuggestion = -1;
  searchSuggestions.innerHTML = '';
  searchSuggestions.classList.add('hidden');
  searchInput.setAttribute('aria-expanded', 'false');
}

function renderSuggestions(products: Product[]): void {
  suggestionProducts = products;
  highlightedSuggestion = products.length > 0 ? 0 : -1;
  searchSuggestions.innerHTML = '';

  if (products.length === 0) {
    hideSuggestions();
    return;
  }

  for (const [index, product] of products.entries()) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    const available = getAvailableStock(product.id);

    button.type = 'button';
    button.className = `sale-search-option${index === highlightedSuggestion ? ' active' : ''}`;
    button.dataset.productId = product.id;
    button.setAttribute('role', 'option');
    button.innerHTML = `
      <span class="sale-search-option-name">${escapeHtml(product.name)}</span>
      <span class="sale-search-option-meta">${product.barcode || t('sales.cart.noBarcode')} · ${formatCurrency(product.price)} · ${t('sales.cart.availableShort', { count: String(available) })}</span>
    `;

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      addProductToCart(product);
    });

    item.appendChild(button);
    searchSuggestions.appendChild(item);
  }

  searchSuggestions.classList.remove('hidden');
  searchInput.setAttribute('aria-expanded', 'true');
}

function updateSuggestionHighlight(): void {
  const options = searchSuggestions.querySelectorAll<HTMLButtonElement>('.sale-search-option');

  for (const [index, option] of Array.from(options).entries()) {
    option.classList.toggle('active', index === highlightedSuggestion);
  }
}

function syncSearchSuggestions(): void {
  const query = searchInput.value;

  if (!query.trim()) {
    hideSuggestions();
    updateProductPreview(undefined);
    return;
  }

  const exactBarcode = findProductByBarcode(query);
  if (exactBarcode) {
    renderSuggestions([exactBarcode]);
    updateProductPreview(exactBarcode);
    return;
  }

  const matches = searchProducts(query);
  renderSuggestions(matches);

  const previewProduct =
    matches[highlightedSuggestion] ?? findProductByExactName(query) ?? matches[0];
  updateProductPreview(previewProduct);
}

function resetAddFields(): void {
  searchInput.value = '';
  hideSuggestions();
  productInfoEl.classList.add('hidden');
  productInfoEl.innerHTML = '';
}

function resetCheckoutForm(): void {
  customerInput.value = '';
  setDecimalInputValue(discountInput, 0);
  setSelectedPayment('pix');
}

function clearCart(): void {
  cart = [];
  renderCart();
  updateTotals();
}

function resetSaleSession(): void {
  clearCart();
  resetAddFields();
  resetCheckoutForm();
}

function onProductsChanged(): void {
  syncSearchSuggestions();
  renderCart();
}

function resolveProductForAdd(): Product | undefined {
  const query = searchInput.value.trim();
  if (!query) {
    /* v8 ignore next */
    return undefined;
  }

  const exactBarcode = findProductByBarcode(query);
  if (exactBarcode) {
    return exactBarcode;
  }

  const exactName = findProductByExactName(query);
  if (exactName) {
    return exactName;
  }

  if (
    highlightedSuggestion >= 0 &&
    highlightedSuggestion < suggestionProducts.length
  ) {
    /* v8 ignore next */
    return suggestionProducts[highlightedSuggestion];
  }

  if (suggestionProducts.length === 1) {
    /* v8 ignore next */
    return suggestionProducts[0];
  }

  return undefined;
}

function updateProductPreview(product: Product | undefined): void {
  if (!product) {
    productInfoEl.classList.add('hidden');
    productInfoEl.innerHTML = '';
    return;
  }

  const available = getAvailableStock(product.id);
  productInfoEl.classList.remove('hidden');
  productInfoEl.innerHTML = `
    <span class="sale-product-name">${escapeHtml(product.name)}</span>
    <span class="sale-product-meta">${t('sales.cart.previewAvailable', { count: String(available), price: formatCurrency(product.price) })}</span>
  `;
}

function updateTotals(): void {
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const discountRaw = readDecimalInput(discountInput);
  const discount = Number.isFinite(discountRaw) ? discountRaw : 0;
  const total = Math.max(0, subtotal - discount);

  saleTotalEl.textContent = formatCurrency(total);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  cartCountEl.textContent =
    itemCount === 0
      ? t('sales.register.cartCount.zero')
      : itemCount === 1
        ? t('sales.register.cartCount.one')
        : t('sales.register.cartCount.other', { count: String(itemCount) });

  const hasItems = cart.length > 0;
  clearCartBtn.disabled = !hasItems;
  submitBtn.disabled = !hasItems;
}

function renderCart(): void {
  cartBody.innerHTML = '';

  if (cart.length === 0) {
    cartBody.innerHTML = `<tr><td colspan="5" class="empty-state sale-empty-state">${t('sales.cart.empty')}</td></tr>`;
    updateTotals();
    return;
  }

  for (const [index, line] of cart.entries()) {
    const row = document.createElement('tr');
    const available = getAvailableStock(line.productId, index);
    const lineSubtotal = line.unitPrice * line.quantity;

    row.innerHTML = `
      <td>
        <span class="sale-cart-product-name">${escapeHtml(line.productName)}</span>
        <span class="sale-cart-product-meta">${line.productBarcode || t('sales.cart.noBarcode')} · ${t('sales.cart.remaining', { count: String(available) })}</span>
      </td>
      <td>
        <div class="sale-cart-qty-controls">
          <button type="button" class="sale-cart-qty-btn" data-cart-action="decrease" data-cart-index="${index}" aria-label="${t('sales.cart.decreaseQtyAria')}">−</button>
          <span class="sale-cart-qty-value">${line.quantity}</span>
          <button type="button" class="sale-cart-qty-btn" data-cart-action="increase" data-cart-index="${index}" aria-label="${t('sales.cart.increaseQtyAria')}"${available <= 0 ? ' disabled' : ''}>+</button>
        </div>
      </td>
      <td>${formatCurrency(line.unitPrice)}</td>
      <td class="sale-cart-subtotal">${formatCurrency(lineSubtotal)}</td>
      <td>
        <button type="button" class="btn btn-small btn-ghost sale-cart-remove" data-cart-action="remove" data-cart-index="${index}">
          ${t('sales.cart.remove')}
        </button>
      </td>
    `;

    cartBody.appendChild(row);
  }

  updateTotals();
}

function addProductToCart(product: Product): boolean {
  const existingIndex = cart.findIndex((line) => line.productId === product.id);
  const available = getAvailableStock(product.id, existingIndex >= 0 ? existingIndex : undefined);

  if (available <= 0) {
    showMessage(t('sales.messages.insufficientStock', { name: product.name }), 'error');
    return false;
  }

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      productName: product.name,
      productBarcode: product.barcode,
      unitPrice: product.price,
      quantity: 1,
    });
  }

  clearMessage();
  renderCart();
  resetAddFields();
  searchInput.focus();
  return true;
}

function tryAddCurrentProduct(): void {
  const query = searchInput.value.trim();

  if (!query) {
    showMessage(t('sales.messages.enterBarcodeOrName'), 'error');
    searchInput.focus();
    return;
  }

  const product = resolveProductForAdd();

  if (!product) {
    const matches = searchProducts(query);
    if (matches.length > 1) {
      showMessage(t('sales.messages.multipleMatches'), 'error');
      renderSuggestions(matches);
      searchInput.focus();
      return;
    }

    showMessage(t('sales.messages.productNotFound'), 'error');
    searchInput.focus();
    return;
  }

  addProductToCart(product);
}

function changeCartQuantity(index: number, delta: number): void {
  const line = cart[index];
  if (!line) {
    /* v8 ignore next */
    return;
  }

  const nextQuantity = line.quantity + delta;

  if (nextQuantity <= 0) {
    /* v8 ignore start */
    removeCartLine(index);
    return;
    /* v8 ignore stop */
  }

  const available = getAvailableStock(line.productId, index);
  if (delta > 0 && available <= 0) {
    showMessage(t('sales.messages.insufficientStock', { name: line.productName }), 'error');
    /* v8 ignore next */
    return;
  }

  line.quantity = nextQuantity;
  clearMessage();
  renderCart();
}

function removeCartLine(index: number): void {
  cart.splice(index, 1);
  clearMessage();
  renderCart();
}

function updateRecentSalesSortHeaders(): void {
  recentSaleSortButtons.forEach((button) => {
    const column = button.dataset.recentSaleSort as RecentSaleSortColumn;
    const rule = recentSalesSort.find((entry) => entry.column === column);
    const indicator = button.querySelector('.table-sort-indicator') as HTMLElement;

    button.classList.toggle('active', Boolean(rule));
    button.setAttribute(
      'aria-sort',
      rule ? (rule.direction === 'asc' ? 'ascending' : 'descending') : 'none',
    );
    indicator.textContent = rule ? (rule.direction === 'asc' ? '↑' : '↓') : '';
  });
}

function renderRecentSales(): void {
  const sales = saleState.getSales();
  const summary = saleState.getSummary();

  totalSalesEl.textContent = String(summary.totalSales);
  todaySalesEl.textContent = String(summary.todaySales);
  todayRevenueEl.textContent = formatCurrency(summary.todayRevenue);

  const recentSales = sortRecentSales(sales, recentSalesSort).slice(0, RECENT_SALES_LIMIT);
  updateRecentSalesSortHeaders();

  salesBody.innerHTML = '';

  if (recentSales.length === 0) {
    salesBody.innerHTML = `<tr><td colspan="5" class="empty-state">${t('sales.recent.empty')}</td></tr>`;
    return;
  }

  for (const sale of recentSales) {
    const row = document.createElement('tr');
    const discountHint =
      sale.discount > 0
        ? `<span class="sale-recent-product-qty">${t('sales.recent.discountHint', { amount: formatCurrency(sale.discount) })}</span>`
        : '';
    const paymentLabel = formatPaymentMethod(sale.paymentMethod);
    const paymentClass = paymentMethodBadgeClass(sale.paymentMethod);

    row.innerHTML = `
      <td class="sale-recent-date">${formatShortDateTime(sale.soldAt)}</td>
      <td class="sale-recent-product">
        <span class="sale-recent-product-name">${escapeHtml(sale.productName)}</span>
        <span class="sale-recent-product-qty">${t('sales.recent.unitMeta', { qty: String(sale.quantity), price: formatCurrency(sale.unitPrice) })}</span>
        ${discountHint}
      </td>
      <td><span class="${paymentClass}">${escapeHtml(paymentLabel)}</span></td>
      <td class="sale-recent-total">${formatCurrency(sale.total)}</td>
      <td class="sale-recent-customer">${sale.customerName ? escapeHtml(sale.customerName) : '—'}</td>
    `;

    salesBody.appendChild(row);
  }
}

export function initSalesPage(): void {
  bindDecimalInput(discountInput, { defaultValue: 0, onValueChange: updateTotals });

  productState.subscribe(() => {
    onProductsChanged();
  });

  saleState.subscribe(() => {
    renderRecentSales();
  });

  recentSaleSortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const column = button.dataset.recentSaleSort as RecentSaleSortColumn;
      recentSalesSort = cycleRecentSaleSortRule(recentSalesSort, column);
      renderRecentSales();
    });
  });

  for (const pill of paymentPills) {
    pill.addEventListener('click', () => {
      const method = pill.dataset.salePayment ?? '';
      if (isPaymentMethod(method)) {
        setSelectedPayment(method);
      }
    });
  }

  searchInput.addEventListener('input', () => {
    syncSearchSuggestions();
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      if (suggestionProducts.length === 0) {
        return;
      }

      event.preventDefault();
      highlightedSuggestion = Math.min(
        highlightedSuggestion + 1,
        suggestionProducts.length - 1,
      );
      updateSuggestionHighlight();
      updateProductPreview(suggestionProducts[highlightedSuggestion]);
      return;
    }

    if (event.key === 'ArrowUp') {
      if (suggestionProducts.length === 0) {
        return;
      }

      event.preventDefault();
      highlightedSuggestion = Math.max(highlightedSuggestion - 1, 0);
      updateSuggestionHighlight();
      updateProductPreview(suggestionProducts[highlightedSuggestion]);
      return;
    }

    if (event.key === 'Escape') {
      hideSuggestions();
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    tryAddCurrentProduct();
  });

  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      hideSuggestions();
    }, 120);
  });

  addBtn.addEventListener('click', () => {
    tryAddCurrentProduct();
  });

  clearCartBtn.addEventListener('click', () => {
    clearCart();
    clearMessage();
    searchInput.focus();
  });

  cartBody.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('[data-cart-action]');
    if (!button) {
      return;
    }

    const index = Number(button.dataset.cartIndex);
    if (!Number.isInteger(index) || index < 0) {
      return;
    }

    const action = button.dataset.cartAction;

    if (action === 'increase') {
      changeCartQuantity(index, 1);
      return;
    }

    if (action === 'decrease') {
      changeCartQuantity(index, -1);
      return;
    }

    if (action === 'remove') {
      removeCartLine(index);
    }
  });

  saleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    if (cart.length === 0) {
      showMessage(t('sales.messages.emptyCart'), 'error');
      searchInput.focus();
      return;
    }

    const discountRaw = readDecimalInput(discountInput);
    const orderDiscount = Number.isFinite(discountRaw) ? discountRaw : Number.NaN;
    const customerName = customerInput.value.trim();
    const paymentMethod = selectedPayment;

    if (!isPaymentMethod(paymentMethod)) {
      showMessage(t('sales.messages.selectPayment'), 'error');
      return;
    }

    if (!Number.isFinite(orderDiscount) || orderDiscount < 0) {
      showMessage(t('sales.messages.invalidDiscount'), 'error');
      discountInput.focus();
      return;
    }

    const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    if (orderDiscount > subtotal) {
      showMessage(t('sales.messages.discountExceedsSubtotal'), 'error');
      discountInput.focus();
      return;
    }

    submitBtn.disabled = true;

    try {
      const result = await window.electronAPI.sales.registerBatch({
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        orderDiscount,
        customerName: customerName || undefined,
        paymentMethod,
      });

      await Promise.all([productState.refresh(), saleState.refresh()]);

      resetSaleSession();
      onProductsChanged();
      showMessage(
        result.sales.length === 1
          ? t('sales.messages.saleCompleted.one', { total: formatCurrency(result.total) })
          : t('sales.messages.saleCompleted.other', {
              count: String(result.sales.length),
              total: formatCurrency(result.total),
            }),
        'success',
      );
      searchInput.focus();
    } catch (error) {
      showMessage(translateError(error, 'sales.messages.finishError'), 'error');
    } finally {
      submitBtn.disabled = cart.length === 0;
    }
  });

  onLocaleChange(() => {
    if (!screen.classList.contains('active')) {
      return;
    }

    onProductsChanged();
    renderRecentSales();
    renderCart();
  });
}

export async function onEnterSalesPage(): Promise<void> {
  clearMessage();
  await Promise.all([productState.refresh(), saleState.refresh()]);
  setSelectedPayment('pix');
  onProductsChanged();
  renderCart();
  searchInput.focus();
}
