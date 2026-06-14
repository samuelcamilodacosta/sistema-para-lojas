import { applyDomTranslations, notifyI18nChange } from '../i18n';
import { refreshRouteMeta } from '../routeMeta';
import { getLocale, getTheme, setLocale, setTheme, subscribeSettings, type Locale, type Theme } from '../settings/settings';
import { updatePageContext } from '../router';
import type { Route } from '../routeMeta';

let currentRoute: Route = 'dashboard';

export function setPreferencesRoute(route: Route): void {
  currentRoute = route;
}

function syncThemeButtons(theme: Theme): void {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    const value = button.dataset.themeToggle as Theme;
    const isActive = value === theme;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function syncLocaleButtons(locale: Locale): void {
  document.querySelectorAll<HTMLButtonElement>('[data-locale-toggle]').forEach((button) => {
    const value = button.dataset.localeToggle as Locale;
    const isActive = value === locale;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function refreshUi(): void {
  refreshRouteMeta();
  applyDomTranslations();
  syncThemeButtons(getTheme());
  syncLocaleButtons(getLocale());
  updatePageContext(currentRoute);
  notifyI18nChange();
}

export function initPreferencesPanel(getRoute: () => Route): void {
  currentRoute = getRoute();

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const theme = button.dataset.themeToggle as Theme;
      setTheme(theme);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-locale-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const locale = button.dataset.localeToggle as Locale;
      setLocale(locale);
    });
  });

  subscribeSettings(() => {
    currentRoute = getRoute();
    refreshUi();
  });

  refreshUi();
}
