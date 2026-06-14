import { Router, getSavedRoute } from './router';
import { initSettings } from './settings/settings';
import { applyDomTranslations } from './i18n';
import { initPreferencesPanel } from './preferences/preferencesPanel';
import { onEnterDashboardPage, initDashboardPage } from './pages/dashboardPage';
import { initProductFormPage } from './pages/productFormPage';
import { initStockPage, onEnterStockPage } from './pages/stockPage';
import { initSalesPage, onEnterSalesPage } from './pages/salesPage';
import { initSalesHistoryPage, onEnterSalesHistoryPage } from './pages/salesHistoryPage';
import { initStockHistoryPage, onEnterStockHistoryPage } from './pages/stockHistoryPage';
import { initPurchasesPage } from './pages/purchasesPage';
import { productState } from './state/productState';
import { saleState } from './state/saleState';
import { stockEntryState } from './state/stockEntryState';
import { translateError } from './i18n';

async function bootstrap(): Promise<void> {
  initSettings();
  applyDomTranslations();

  const router = new Router();

  initPreferencesPanel(() => router.getCurrentRoute());
  initDashboardPage();
  initProductFormPage();
  initPurchasesPage();
  initStockPage();
  initSalesPage();
  initSalesHistoryPage();
  initStockHistoryPage();

  router.register('dashboard', () => onEnterDashboardPage());
  router.register('estoque', (params) => onEnterStockPage(params));
  router.register('vendas', () => onEnterSalesPage());
  router.register('historico-vendas', () => onEnterSalesHistoryPage());
  router.register('historico-estoque', () => onEnterStockHistoryPage());

  router.init();

  const initialRoute = getSavedRoute() ?? 'dashboard';
  await router.navigate(initialRoute);

  /* v8 ignore start -- refresh em segundo plano; erros são tratados sem bloquear a UI */
  void Promise.all([
    productState.refresh(),
    saleState.refresh(),
    stockEntryState.refresh(),
  ]).catch((error) => {
    console.error(translateError(error, 'common.loadDataError'));
  });
  /* v8 ignore stop */
}

void bootstrap();
