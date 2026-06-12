const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 44px;
      min-width: 44px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
    }
    .mark {
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
      border-radius: 50%;
      border: 2px solid var(--ink-faint);
      background: var(--surface);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    }
    label:active .mark {
      transform: scale(0.9);
    }
    input:checked + .mark {
      background: var(--green);
      border-color: var(--green);
      color: var(--paper);
    }
    input:focus-visible + .mark {
      outline: 2px solid var(--pine);
      outline-offset: 2px;
    }
    .text {
      font-size: 0.9375rem;
      color: var(--ink-soft);
    }
    .text:empty {
      display: none;
    }
    svg {
      width: 16px;
      height: 16px;
    }
  </style>
  <label>
    <input type="checkbox" />
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"
        stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11" /></svg>
    </span>
    <span class="text"><slot></slot></span>
  </label>
`;

export class UiCheckbox extends HTMLElement {
  static observedAttributes = ['checked', 'label'];

  private input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.input = root.querySelector('input') as HTMLInputElement;

    // 'change' nativo não atravessa Shadow DOM (composed: false)
    this.input.addEventListener('change', () => {
      this.toggleAttribute('checked', this.input.checked);
      this.dispatchEvent(
        new CustomEvent('change', {
          bubbles: true,
          composed: true,
          detail: { checked: this.input.checked },
        }),
      );
    });
  }

  attributeChangedCallback(name: string): void {
    if (name === 'checked') {
      this.input.checked = this.hasAttribute('checked');
    }
    if (name === 'label') {
      this.input.setAttribute('aria-label', this.getAttribute('label') ?? '');
    }
  }

  get checked(): boolean {
    return this.input.checked;
  }

  set checked(value: boolean) {
    this.input.checked = value;
    this.toggleAttribute('checked', value);
  }
}

customElements.define('ui-checkbox', UiCheckbox);
