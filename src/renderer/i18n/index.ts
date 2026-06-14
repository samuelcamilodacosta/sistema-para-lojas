import { parseAppErrorMessage, type AppErrorCode } from '../../types/appError';
import { getLocale, type Locale } from '../settings/settings';
import { messages, type MessageKey, type MessageParams } from './messages';
import { applyStaticDomTranslations } from './staticDomMap';

type I18nListener = () => void;

const listeners = new Set<I18nListener>();

function interpolate(template: string, params?: MessageParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function t(key: MessageKey, params?: MessageParams): string {
  const locale = getLocale();
  const template = messages[locale][key] ?? messages.pt[key] ?? key;
  return interpolate(template, params);
}

export function tCount(
  baseKey: `${MessageKey}`,
  count: number,
  params?: MessageParams,
): string {
  const suffix = count === 1 ? '.one' : '.other';
  const key = `${baseKey}${suffix}` as MessageKey;
  return t(key, { count: String(count), ...params });
}

export function translateError(error: unknown, fallbackKey: MessageKey = 'common.loadDataError'): string {
  if (error instanceof Error) {
    const parsed = parseAppErrorMessage(error.message);

    if (parsed) {
      const errorKey = `errors.${parsed.code}` as MessageKey;
      const template = messages[getLocale()][errorKey];

      if (template) {
        return interpolate(template, parsed.params);
      }
    }

    if (error.message && !error.message.startsWith('APP_ERROR:')) {
      return error.message;
    }
  }

  return t(fallbackKey);
}

export function translateErrorCode(
  code: AppErrorCode,
  params?: MessageParams,
): string {
  return t(`errors.${code}` as MessageKey, params);
}

export function subscribeI18n(listener: I18nListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyI18nChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getIntlLocale(): string {
  return getLocale() === 'en' ? 'en-US' : 'pt-BR';
}

export function translateDisplayNote(note: string): string {
  if (note === 'Ajuste manual') {
    return t('stockHistory.systemNote.manualAdjustment');
  }

  return note;
}

export function applyDomTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n as MessageKey;
    element.textContent = t(key);
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
    const key = element.dataset.i18nHtml as MessageKey;
    element.innerHTML = t(key);
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    const key = element.dataset.i18nTitle as MessageKey;
    element.title = t(key);
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((element) => {
    const key = element.dataset.i18nAria as MessageKey;
    element.setAttribute('aria-label', t(key));
  });

  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder as MessageKey;
    element.placeholder = t(key);
  });

  root.querySelectorAll<HTMLOptionElement>('[data-i18n-option]').forEach((element) => {
    const key = element.dataset.i18nOption as MessageKey;
    element.textContent = t(key);
  });

  applyStaticDomTranslations(root);
}

export function onLocaleChange(callback: () => void): () => void {
  return subscribeI18n(callback);
}

export type { Locale, MessageKey };
