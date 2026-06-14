import {
  getRouteMeta,
  getAppDocumentTitle,
  isValidRoute,
  saveLastRoute,
  type Route,
} from './routeMeta';

export type { Route } from './routeMeta';
export { getSavedRoute } from './routeMeta';

export type StockTab = 'listagem' | 'cadastro' | 'compras';

export interface RouteParams {
  productId?: string;
  tab?: StockTab;
}

type RouteHandler = (params: RouteParams) => void | Promise<void>;

export function updatePageContext(route: Route): void {
  const meta = getRouteMeta(route);
  document.getElementById('app-page-title')!.textContent = meta.title;
  document.getElementById('app-page-desc')!.textContent = meta.description;
  document.title = getAppDocumentTitle(meta.documentTitle);
}

export class Router {
  private handlers = new Map<Route, RouteHandler>();
  private currentRoute: Route = 'dashboard';
  private hasTransitioned = false;

  register(route: Route, handler: RouteHandler): void {
    this.handlers.set(route, handler);
  }

  getCurrentRoute(): Route {
    return this.currentRoute;
  }

  async navigate(route: Route, params: RouteParams = {}): Promise<void> {
    const hasParams = Object.keys(params).length > 0;
    if (route === this.currentRoute && !hasParams && this.hasTransitioned) {
      return;
    }

    this.currentRoute = route;
    saveLastRoute(route);

    document.querySelectorAll('[data-screen]').forEach((element) => {
      element.classList.remove('active', 'screen-entering');
    });

    const screen = document.getElementById(`screen-${route}`);
    if (screen) {
      screen.classList.add('active');
      if (this.hasTransitioned) {
        screen.classList.add('screen-entering');
        screen.addEventListener(
          'animationend',
          () => {
            screen.classList.remove('screen-entering');
          },
          { once: true },
        );
      }
    }

    document.querySelectorAll('.nav-link[data-route]').forEach((element) => {
      const isActive = element.getAttribute('data-route') === route;
      element.classList.toggle('active', isActive);
      element.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    updatePageContext(route);
    this.hasTransitioned = true;

    const handler = this.handlers.get(route);
    if (handler) {
      await handler(params);
    }
  }

  init(): void {
    document.querySelectorAll('[data-route]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const route = element.getAttribute('data-route');
        if (isValidRoute(route)) {
          void this.navigate(route);
        }
      });
    });
  }
}
