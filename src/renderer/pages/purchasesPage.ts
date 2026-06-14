import { productState } from '../state/productState';
import { stockEntryState } from '../state/stockEntryState';
import { getIntlLocale, onLocaleChange, t, translateError } from '../i18n';
import { setMessage } from '../utils/dom';

const entryForm = document.getElementById('purchase-form') as HTMLFormElement;
const productSelect = document.getElementById('purchase-product') as HTMLSelectElement;
const barcodeInput = document.getElementById('purchase-barcode') as HTMLInputElement;
const quantityInput = document.getElementById('purchase-quantity') as HTMLInputElement;
const noteInput = document.getElementById('purchase-note') as HTMLInputElement;
const purchaseMessage = document.getElementById('purchase-message') as HTMLParagraphElement;
const screen = document.getElementById('screen-estoque') as HTMLElement;

function showMessage(text: string, type: 'success' | 'error'): void {
  setMessage(purchaseMessage, text, type);
}

function clearMessage(): void {
  setMessage(purchaseMessage, '', 'none');
}

function updateProductOptions(): void {
  const products = productState
    .getProducts()
    .sort((a, b) => a.name.localeCompare(b.name, getIntlLocale()));

  const currentValue = productSelect.value;
  productSelect.innerHTML = `<option value="">${t('stock.purchase.select')}</option>`;

  for (const product of products) {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = t('stock.purchase.optionLabel', {
      name: product.name,
      quantity: String(product.quantity),
    });
    option.dataset.barcode = product.barcode;
    productSelect.appendChild(option);
  }

  if (products.some((product) => product.id === currentValue)) {
    productSelect.value = currentValue;
  }
}

function findProductByBarcode(barcode: string) {
  const normalized = barcode.trim();
  if (!normalized) {
    return undefined;
  }

  return productState.getProducts().find((product) => product.barcode === normalized);
}

export function initPurchasesPage(): void {
  productState.subscribe(() => {
    updateProductOptions();
  });

  productSelect.addEventListener('change', () => {
    const selected = productSelect.selectedOptions[0];
    barcodeInput.value = selected?.dataset.barcode ?? '';
  });

  barcodeInput.addEventListener('input', () => {
    const product = findProductByBarcode(barcodeInput.value);
    if (product) {
      productSelect.value = product.id;
    }
  });

  entryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    const productId = productSelect.value;
    const quantity = Number(quantityInput.value);
    const note = noteInput.value.trim();

    if (!productId) {
      showMessage(t('stock.messages.selectProductRestock'), 'error');
      return;
    }

    try {
      await window.electronAPI.stockEntries.register({ productId, quantity, note });
      await Promise.all([productState.refresh(), stockEntryState.refresh()]);

      entryForm.reset();
      noteInput.value = '';
      updateProductOptions();
      showMessage(t('stock.messages.entryRegistered'), 'success');
      barcodeInput.focus();
    } catch (error) {
      showMessage(translateError(error, 'stock.messages.entryError'), 'error');
    }
  });

  onLocaleChange(() => {
    if (!screen.classList.contains('active')) {
      return;
    }

    updateProductOptions();
  });
}

export async function refreshPurchasesView(): Promise<void> {
  clearMessage();
  await stockEntryState.refresh();
  updateProductOptions();
}
