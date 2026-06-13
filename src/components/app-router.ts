import { appStore } from '../state/store';
import '../components/ui/ui-loading';

const ROUTES: Record<string, string> = {
  dashboard: 'dashboard-page',
  despesas: 'expenses-page',
  receitas: 'incomes-page',
  recorrencias: 'recurring-page',
  parcelamentos: 'installments-page',
  cartoes: 'cards-page',
  reserva: 'emergency-reserve-page',
  relatorios: 'reports-page',
  config: 'settings-page',
  login: 'auth-page',
};

/**
 * Roteador por hash (#/rota) com guarda de autenticação.
 */
export class AppRouter extends HTMLElement {
  private currentTag = '';
  private unsubscribe: (() => void) | null = null;
  private onHashChange = (): void => this.renderRoute();

  connectedCallback(): void {
    window.addEventListener('hashchange', this.onHashChange);
    this.unsubscribe = appStore.subscribe(() => this.renderRoute());
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.onHashChange);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private renderRoute(): void {
    const { authReady, user } = appStore.get();

    if (!authReady) {
      this.mount('ui-loading');
      return;
    }

    if (!user) {
      this.mount('auth-page');
      return;
    }

    const route = window.location.hash.replace('#/', '') || 'dashboard';
    const tag = route === 'login' ? 'dashboard-page' : (ROUTES[route] ?? 'dashboard-page');
    this.mount(tag);
  }

  private mount(tag: string): void {
    if (this.currentTag === tag) return;
    this.currentTag = tag;
    this.innerHTML =
      tag === 'ui-loading'
        ? '<ui-loading label="Abrindo seu bolso…" style="min-height: 80dvh;"></ui-loading>'
        : `<${tag}></${tag}>`;
  }
}

customElements.define('app-router', AppRouter);
