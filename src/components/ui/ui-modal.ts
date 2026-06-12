const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 50;
    }
    :host([open]) {
      display: block;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 47, 37, 0.45);
      animation: fade-in 0.2s ease both;
    }
    .sheet {
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 100%;
      max-width: var(--page-max, 540px);
      max-height: 92dvh;
      display: flex;
      flex-direction: column;
      background: var(--paper);
      border-radius: var(--radius-lg, 22px) var(--radius-lg, 22px) 0 0;
      box-shadow: 0 -8px 40px rgba(15, 47, 37, 0.25);
      animation: slide-up 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.25rem 0.75rem;
    }
    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 400;
    }
    .close {
      appearance: none;
      border: none;
      background: var(--paper-deep);
      color: var(--ink-soft);
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0;
    }
    .close:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: 2px;
    }
    .close svg {
      width: 18px;
      height: 18px;
    }
    .body {
      overflow-y: auto;
      padding: 0.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px));
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-up {
      from { transform: translateX(-50%) translateY(100%); }
      to { transform: translateX(-50%) translateY(0); }
    }
  </style>
  <div class="backdrop" part="backdrop"></div>
  <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header>
      <h2 id="modal-title"></h2>
      <button class="close" type="button" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </header>
    <div class="body"><slot></slot></div>
  </section>
`;

export class UiModal extends HTMLElement {
  static observedAttributes = ['heading'];

  private titleEl: HTMLElement;
  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.hasAttribute('open')) this.closeModal();
  };

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.titleEl = root.querySelector('#modal-title') as HTMLElement;
    (root.querySelector('.backdrop') as HTMLElement).addEventListener('click', () =>
      this.closeModal(),
    );
    (root.querySelector('.close') as HTMLElement).addEventListener('click', () =>
      this.closeModal(),
    );
  }

  attributeChangedCallback(): void {
    this.titleEl.textContent = this.getAttribute('heading') ?? '';
  }

  connectedCallback(): void {
    document.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.body.style.overflow = '';
  }

  openModal(heading?: string): void {
    if (heading !== undefined) this.setAttribute('heading', heading);
    this.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    document.body.style.overflow = '';
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
}

customElements.define('ui-modal', UiModal);
