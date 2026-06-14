import { t } from './i18n';

export type Route = 'dashboard' | 'estoque' | 'vendas' | 'historico-estoque' | 'historico-vendas';

export type RouteGroup = 'operacao' | 'consultas';

export interface RouteMeta {
  label: string;
  title: string;
  description: string;
  group: RouteGroup;
  documentTitle: string;
}

export const ROUTES: Route[] = [
  'dashboard',
  'estoque',
  'vendas',
  'historico-estoque',
  'historico-vendas',
];

const ROUTE_I18N_KEYS: Record<Route, string> = {
  dashboard: 'dashboard',
  estoque: 'stock',
  vendas: 'sales',
  'historico-estoque': 'stockHistory',
  'historico-vendas': 'salesHistory',
};

const ROUTE_GROUPS: Record<Route, RouteGroup> = {
  dashboard: 'operacao',
  estoque: 'operacao',
  vendas: 'operacao',
  'historico-estoque': 'consultas',
  'historico-vendas': 'consultas',
};

export function getRouteMeta(route: Route): RouteMeta {
  const key = ROUTE_I18N_KEYS[route];

  return {
    label: t(`routes.${key}.documentTitle` as never),
    title: t(`routes.${key}.title` as never),
    description: t(`routes.${key}.description` as never),
    documentTitle: t(`routes.${key}.documentTitle` as never),
    group: ROUTE_GROUPS[route],
  };
}

export const ROUTE_META: Record<Route, RouteMeta> = {
  dashboard: getRouteMeta('dashboard'),
  estoque: getRouteMeta('estoque'),
  vendas: getRouteMeta('vendas'),
  'historico-estoque': getRouteMeta('historico-estoque'),
  'historico-vendas': getRouteMeta('historico-vendas'),
};

export function refreshRouteMeta(): void {
  for (const route of ROUTES) {
    ROUTE_META[route] = getRouteMeta(route);
  }
}

export function getRouteGroupLabel(group: RouteGroup): string {
  return group === 'operacao' ? t('nav.group.operation') : t('nav.group.queries');
}

export function getAppDocumentTitle(pageTitle: string): string {
  return t('app.titleWithPage', { page: pageTitle });
}

const LAST_ROUTE_KEY = 'sistema:last-route';

export function isValidRoute(route: string | null): route is Route {
  return route !== null && ROUTES.includes(route as Route);
}

export function getSavedRoute(): Route | null {
  try {
    const saved = sessionStorage.getItem(LAST_ROUTE_KEY);
    return isValidRoute(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveLastRoute(route: Route): void {
  try {
    sessionStorage.setItem(LAST_ROUTE_KEY, route);
  } catch {
    // ignore storage errors
  }
}
