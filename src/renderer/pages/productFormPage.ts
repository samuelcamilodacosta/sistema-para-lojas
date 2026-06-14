import type { Product } from '../../types/product';
import { onLocaleChange, t, translateError } from '../i18n';
import { productState } from '../state/productState';
import { setMessage } from '../utils/dom';
import { bindDecimalInput } from '../utils/decimalInput';
import { formatDecimalInput, readDecimalInput } from '../utils/format';
import {
  closeStockActions,
  openStockActionMode,
} from '../utils/stockActionsPanel';

const form = document.getElementById('product-form') as HTMLFormElement;
const formBlock = document.getElementById('stock-product-form-block') as HTMLElement;
const cancelEditBtn = document.getElementById('cancel-edit-btn') as HTMLButtonElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const productIdInput = document.getElementById('product-id') as HTMLInputElement;
const nameInput = document.getElementById('product-name') as HTMLInputElement;
const barcodeInput = document.getElementById('product-barcode') as HTMLInputElement;
const priceInput = document.getElementById('product-price') as HTMLInputElement;
const quantityInput = document.getElementById('product-quantity') as HTMLInputElement;
const formMessage = document.getElementById('form-message') as HTMLParagraphElement;

let editingProductId: string | null = null;

function clearMessage(): void {
  setMessage(formMessage, '', 'none');
}

function showMessage(text: string, type: 'success' | 'error'): void {
  setMessage(formMessage, text, type);
}

function updateSubmitLabel(): void {
  submitBtn.textContent = editingProductId
    ? t('stock.product.submitSave')
    : t('stock.product.submitRegister');
}

function resetFormFields(): void {
  editingProductId = null;
  productIdInput.value = '';
  form.reset();
  updateSubmitLabel();
  cancelEditBtn.classList.add('hidden');
  formBlock.classList.remove('is-editing');
  clearMessage();
}

function resetForm(): void {
  resetFormFields();
  closeStockActions();
}

function fillForm(product: Product): void {
  editingProductId = product.id;
  productIdInput.value = product.id;
  nameInput.value = product.name;
  barcodeInput.value = product.barcode;
  priceInput.value = formatDecimalInput(product.price);
  quantityInput.value = String(product.quantity);
  updateSubmitLabel();
  cancelEditBtn.classList.remove('hidden');
  formBlock.classList.add('is-editing');
  clearMessage();
  openStockActionMode('product');
  nameInput.focus({ preventScroll: true });
}

export function initProductFormPage(): void {
  bindDecimalInput(priceInput);

  document.addEventListener('stock-actions:close', () => {
    resetFormFields();
  });

  document.addEventListener('stock-actions:open', (event) => {
    const mode = (event as CustomEvent<{ mode: string }>).detail.mode;

    if (mode === 'product') {
      resetFormFields();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    const name = nameInput.value.trim();
    const barcode = barcodeInput.value.trim();
    const price = readDecimalInput(priceInput);
    const quantity = Number(quantityInput.value);

    if (!Number.isFinite(price) || price < 0) {
      showMessage(t('stock.messages.invalidPrice'), 'error');
      return;
    }

    try {
      if (editingProductId) {
        await window.electronAPI.products.update({
          id: editingProductId,
          name,
          barcode,
          price,
          quantity,
        });
        showMessage(t('stock.messages.productUpdated'), 'success');
      } else {
        await window.electronAPI.products.create({ name, barcode, price, quantity });
        showMessage(t('stock.messages.productRegistered'), 'success');
      }

      await productState.refresh();
      resetForm();
    } catch (error) {
      showMessage(translateError(error, 'stock.messages.saveError'), 'error');
    }
  });

  cancelEditBtn.addEventListener('click', () => {
    resetForm();
  });

  onLocaleChange(updateSubmitLabel);
}

export function resetProductForm(): void {
  resetForm();
}

export async function beginEditProduct(productId: string): Promise<void> {
  let product = productState.getProducts().find((item) => item.id === productId);

  if (!product) {
    await productState.refresh();
    product = productState.getProducts().find((item) => item.id === productId);
  }

  if (product) {
    fillForm(product);
    return;
  }

  resetForm();
}

export function focusNewProductForm(): void {
  resetFormFields();
  openStockActionMode('product');
}

export function focusPurchaseForm(): void {
  openStockActionMode('purchase');
}
