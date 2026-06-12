const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
    }
    .icon {
      font-size: 2.25rem;
      line-height: 1;
    }
    .title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.125rem;
      color: var(--ink);
    }
    .hint {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--ink-soft);
      max-width: 26ch;
    }
    .hint:empty {
      display: none;
    }
    ::slotted(*) {
      margin-top: 0.75rem;
    }
  </style>
  <div class="wrap" part="wrap">
    <div class="icon" aria-hidden="true"></div>
    <p class="title"></p>
    <p class="hint"></p>
    <slot></slot>
  </div>
`;

export class UiEmptyState extends HTMLElement {
  static observedAttributes = ['icon', 'heading', 'hint'];

  private iconEl: HTMLElement;
  private titleEl: HTMLElement;
  private hintEl: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.iconEl = root.querySelector('.icon') as HTMLElement;
    this.titleEl = root.querySelector('.title') as HTMLElement;
    this.hintEl = root.querySelector('.hint') as HTMLElement;
  }

  attributeChangedCallback(): void {
    this.iconEl.textContent = this.getAttribute('icon') ?? '📭';
    this.titleEl.textContent = this.getAttribute('heading') ?? 'Nada por aqui';
    this.hintEl.textContent = this.getAttribute('hint') ?? '';
  }

  connectedCallback(): void {
    this.attributeChangedCallback();
  }
}

customElements.define('ui-empty-state', UiEmptyState);
