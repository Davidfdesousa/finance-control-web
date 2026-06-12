const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--ink-soft);
    }
    input,
    textarea {
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--ink);
      width: 100%;
      min-height: var(--touch, 48px);
      padding: 0.75rem 1rem;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm, 10px);
      background: var(--surface);
      box-sizing: border-box;
    }
    textarea {
      resize: vertical;
      line-height: 1.4;
    }
    input:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: 1px;
    }
    :host([invalid]) input,
    :host([invalid]) textarea {
      border-color: var(--red);
    }
    .error {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--red);
    }
    .error[hidden] {
      display: none;
    }
  </style>
  <label>
    <span class="label"></span>
    <span class="control"></span>
    <span class="error" role="alert" hidden></span>
  </label>
`;

export class UiInput extends HTMLElement {
  static observedAttributes = ['label', 'placeholder', 'type', 'inputmode', 'autocomplete'];

  private control!: HTMLInputElement | HTMLTextAreaElement;
  private labelEl: HTMLElement;
  private errorEl: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.labelEl = root.querySelector('.label') as HTMLElement;
    this.errorEl = root.querySelector('.error') as HTMLElement;

    const slot = root.querySelector('.control') as HTMLElement;
    const rows = this.getAttribute('rows');
    if (rows) {
      const textarea = document.createElement('textarea');
      textarea.rows = Number(rows);
      this.control = textarea;
    } else {
      this.control = document.createElement('input');
    }
    slot.replaceWith(this.control);
    this.control.addEventListener('input', () => this.setError(null));
    this.syncAttributes();
  }

  attributeChangedCallback(): void {
    this.syncAttributes();
  }

  private syncAttributes(): void {
    this.labelEl.textContent = this.getAttribute('label') ?? '';
    this.control.placeholder = this.getAttribute('placeholder') ?? '';
    if (this.control instanceof HTMLInputElement) {
      this.control.type = this.getAttribute('type') ?? 'text';
    }
    const inputmode = this.getAttribute('inputmode');
    if (inputmode) this.control.setAttribute('inputmode', inputmode);
    const autocomplete = this.getAttribute('autocomplete');
    if (autocomplete) this.control.setAttribute('autocomplete', autocomplete);
  }

  get value(): string {
    return this.control.value;
  }

  set value(text: string) {
    this.control.value = text;
  }

  setError(message: string | null): void {
    this.toggleAttribute('invalid', Boolean(message));
    this.errorEl.textContent = message ?? '';
    this.errorEl.hidden = !message;
  }

  focus(): void {
    this.control.focus();
  }
}

customElements.define('ui-input', UiInput);
