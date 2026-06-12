const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }
    :host([full]) {
      display: block;
    }
    button {
      font-family: var(--font-body);
      font-size: 1rem;
      font-weight: 700;
      width: 100%;
      min-height: var(--touch, 48px);
      padding: 0 1.25rem;
      border: 1px solid transparent;
      border-radius: var(--radius, 16px);
      background: var(--pine);
      color: var(--paper);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
    }
    button:active {
      transform: scale(0.97);
    }
    button:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: 2px;
    }
    :host([variant='ghost']) button {
      background: transparent;
      color: var(--pine);
    }
    :host([variant='outline']) button {
      background: var(--surface);
      color: var(--ink);
      border-color: var(--line);
    }
    :host([variant='danger']) button {
      background: var(--red-bg);
      color: var(--red);
    }
    :host([size='sm']) button {
      min-height: 2.5rem;
      padding: 0 1rem;
      font-size: 0.875rem;
      border-radius: var(--radius-sm, 10px);
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }
  </style>
  <button part="button" type="button"><slot></slot></button>
`;

export class UiButton extends HTMLElement {
  static observedAttributes = ['disabled'];

  private button: HTMLButtonElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.button = root.querySelector('button') as HTMLButtonElement;
    // Bloqueia cliques no host quando desabilitado
    this.addEventListener(
      'click',
      (event) => {
        if (this.disabled) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      },
      { capture: true },
    );
  }

  attributeChangedCallback(): void {
    this.button.disabled = this.disabled;
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
}

customElements.define('ui-button', UiButton);
