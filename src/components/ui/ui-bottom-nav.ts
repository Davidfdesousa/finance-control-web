interface NavItem {
  route: string;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  {
    route: 'dashboard',
    label: 'Dashboard',
    icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  },
  {
    route: 'despesas',
    label: 'Despesas',
    icon: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  },
  {
    route: 'receitas',
    label: 'Receitas',
    icon: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  },
  {
    route: 'recorrencias',
    label: 'Recorr.',
    icon: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  },
  {
    route: 'parcelamentos',
    label: 'Parcelas',
    icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10"/><path d="M7 13h4"/>',
  },
  {
    route: 'cartoes',
    label: 'Cartoes',
    icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  },
  {
    route: 'reserva',
    label: 'Reserva',
    icon: '<path d="M12 3v18"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>',
  },
  {
    route: 'relatorios',
    label: 'Relatórios',
    icon: '<path d="M4 20v-6"/><path d="M10 20V4"/><path d="M16 20v-9"/><path d="M21 20H3"/>',
  },
  {
    route: 'config',
    label: 'Config',
    icon: '<path d="M4 7h9"/><circle cx="17" cy="7" r="2.5"/><path d="M20 17h-9"/><circle cx="7" cy="17" r="2.5"/>',
  },
];

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      background: var(--surface);
      border-top: 1px solid var(--line);
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    nav {
      max-width: var(--page-max, 540px);
      margin: 0 auto;
      height: var(--nav-height, 4.25rem);
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
    }
    nav::-webkit-scrollbar {
      display: none;
    }
    a {
      flex: 0 0 4.65rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      text-decoration: none;
      color: var(--ink-faint);
      font-family: var(--font-body);
      font-size: 0.6875rem;
      font-weight: 700;
      -webkit-tap-highlight-color: transparent;
    }
    .ico {
      display: inline-flex;
      padding: 3px 14px;
      border-radius: 999px;
      transition: background 0.2s ease;
    }
    a[aria-current='page'] {
      color: var(--pine);
    }
    a[aria-current='page'] .ico {
      background: var(--pine-soft);
    }
    svg {
      width: 22px;
      height: 22px;
    }
    a:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: -2px;
      border-radius: 12px;
    }
  </style>
  <nav aria-label="Navegação principal"></nav>
`;

export class UiBottomNav extends HTMLElement {
  private nav: HTMLElement;
  private onHashChange = (): void => this.syncActive();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.nav = root.querySelector('nav') as HTMLElement;
    this.nav.innerHTML = ITEMS.map(
      (item) => `
        <a href="#/${item.route}" data-route="${item.route}">
          <span class="ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
          </span>
          <span>${item.label}</span>
        </a>`,
    ).join('');
  }

  connectedCallback(): void {
    window.addEventListener('hashchange', this.onHashChange);
    this.syncActive();
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.onHashChange);
  }

  private syncActive(): void {
    const current = window.location.hash.replace('#/', '') || 'dashboard';
    this.nav.querySelectorAll('a').forEach((anchor) => {
      const isActive = anchor.dataset.route === current;
      if (isActive) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });
  }
}

customElements.define('ui-bottom-nav', UiBottomNav);
