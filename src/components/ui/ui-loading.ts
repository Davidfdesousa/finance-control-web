const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2.5rem 1rem;
    }
    .spinner {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 3px solid var(--paper-deep);
      border-top-color: var(--pine);
      animation: spin 0.8s linear infinite;
    }
    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ink-soft);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <div class="spinner" aria-hidden="true"></div>
  <span class="label" role="status"></span>
`;

export class UiLoading extends HTMLElement {
  static observedAttributes = ['label'];

  private labelEl: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.labelEl = root.querySelector('.label') as HTMLElement;
  }

  attributeChangedCallback(): void {
    this.labelEl.textContent = this.getAttribute('label') ?? 'Carregando…';
  }

  connectedCallback(): void {
    this.attributeChangedCallback();
  }
}

customElements.define('ui-loading', UiLoading);
