export type Theme = 'dark' | 'light';
export type Locale = 'pt' | 'en';

const THEME_KEY = 'sistema:theme';
const LOCALE_KEY = 'sistema:locale';

type SettingsListener = () => void;

const listeners = new Set<SettingsListener>();

let currentTheme: Theme = 'dark';
let currentLocale: Locale = 'pt';

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

export function getTheme(): Theme {
  return currentTheme;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getHtmlLang(): string {
  return currentLocale === 'en' ? 'en' : 'pt-BR';
}

export function applyTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage errors
  }
}

export function applyLocale(locale: Locale): void {
  currentLocale = locale;
  document.documentElement.lang = getHtmlLang();

  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore storage errors
  }
}

export function setTheme(theme: Theme): void {
  if (theme === currentTheme) {
    return;
  }

  applyTheme(theme);
  notifyListeners();
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) {
    return;
  }

  applyLocale(locale);
  notifyListeners();
}

export function subscribeSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function initSettings(): void {
  currentTheme = readStoredTheme();
  currentLocale = readStoredLocale();
  applyTheme(currentTheme);
  applyLocale(currentLocale);
}

/** Applies persisted theme/locale before first paint (inline in index.html). */
export function bootstrapSettingsScript(): string {
  return `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var l=localStorage.getItem('${LOCALE_KEY}');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');document.documentElement.lang=l==='en'?'en':'pt-BR';}catch(e){}})();`;
}
