export type StockActionMode = 'purchase' | 'product';

const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-stock-action-mode]');
const purchaseBlock = document.getElementById('stock-purchase-block') as HTMLElement;
const productBlock = document.getElementById('stock-product-form-block') as HTMLElement;

let activeMode: StockActionMode | null = null;

function updateModeButtons(): void {
  modeButtons.forEach((button) => {
    const mode = button.dataset.stockActionMode as StockActionMode;
    const isActive = mode === activeMode;

    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function hideContent(): void {
  purchaseBlock.classList.add('hidden');
  productBlock.classList.add('hidden');
  activeMode = null;
  updateModeButtons();
}

export function closeStockActions(): void {
  hideContent();
}

export function openStockActionMode(mode: StockActionMode): void {
  activeMode = mode;
  purchaseBlock.classList.toggle('hidden', mode !== 'purchase');
  productBlock.classList.toggle('hidden', mode !== 'product');
  updateModeButtons();

  if (mode === 'purchase') {
    const barcode = document.getElementById('purchase-barcode') as HTMLInputElement;
    barcode.focus({ preventScroll: true });
    return;
  }

  const nameInput = document.getElementById('product-name') as HTMLInputElement;
  nameInput.focus({ preventScroll: true });
}

export function toggleStockActionMode(mode: StockActionMode): void {
  if (activeMode === mode) {
    closeStockActions();
    document.dispatchEvent(new CustomEvent('stock-actions:close'));
    return;
  }

  openStockActionMode(mode);
  document.dispatchEvent(new CustomEvent('stock-actions:open', { detail: { mode } }));
}

export function getActiveStockActionMode(): StockActionMode | null {
  return activeMode;
}

export function initStockActionsPanel(): void {
  modeButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const mode = button.dataset.stockActionMode as StockActionMode;

      if (mode) {
        toggleStockActionMode(mode);
      }
    });
  });
}
