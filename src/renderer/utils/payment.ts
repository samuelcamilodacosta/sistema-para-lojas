import type { PaymentMethod } from '../../types/sale';
import { t } from '../i18n';

export function formatPaymentMethod(method: PaymentMethod | ''): string {
  if (!method) {
    return '—';
  }

  if (method === 'pix') {
    return t('payment.pix');
  }

  if (method === 'dinheiro') {
    return t('payment.cash');
  }

  return t('payment.debitCredit');
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return value === 'pix' || value === 'dinheiro' || value === 'debito_credito';
}

export function paymentMethodBadgeClass(method: PaymentMethod | ''): string {
  if (method === 'pix') {
    return 'payment-badge payment-badge-pix';
  }

  if (method === 'dinheiro') {
    return 'payment-badge payment-badge-cash';
  }

  if (method === 'debito_credito') {
    return 'payment-badge payment-badge-card';
  }

  return 'payment-badge payment-badge-empty';
}
