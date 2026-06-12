import { appStore } from '../state/store';
import './app-router';
import './ui/ui-bottom-nav';

/**
 * Estrutura da aplicação autenticada: conteúdo roteado + navegação inferior.
 */
export class AppShell extends HTMLElement {
  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <app-router></app-router>
      <ui-bottom-nav hidden></ui-bottom-nav>
    `;

    const nav = this.querySelector('ui-bottom-nav') as HTMLElement;
    this.unsubscribe = appStore.subscribe((state) => {
      nav.hidden = !(state.authReady && state.user);
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

customElements.define('app-shell', AppShell);
