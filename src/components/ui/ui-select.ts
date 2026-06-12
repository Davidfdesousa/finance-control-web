export interface SelectOption {
  value: string;
  label: string;
}

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
    .label:empty {
      display: none;
    }
    select {
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--ink);
      width: 100%;
      min-height: var(--touch, 48px);
      padding: 0.75rem 2.25rem 0.75rem 1rem;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm, 10px);
      background: var(--surface);
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235c6a61' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.875rem center;
    }
    select:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: 1px;
    }
    :host([invalid]) select {
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
    <select></select>
    <span class="error" role="alert" hidden></span>
  </label>
`;

export class UiSelect extends HTMLElement {
  static observedAttributes = ['label'];

  private select: HTMLSelectElement;
  private labelEl: HTMLElement;
  private errorEl: HTMLElement;
  private optionList: SelectOption[] = [];
  private pendingValue: string | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.select = root.querySelector('select') as HTMLSelectElement;
    this.labelEl = root.querySelector('.label') as HTMLElement;
    this.errorEl = root.querySelector('.error') as HTMLElement;

    // O evento nativo 'change' não atravessa Shadow DOM (composed: false)
    this.select.addEventListener('change', () => {
      this.setError(null);
      this.dispatchEvent(
        new CustomEvent('change', {
          bubbles: true,
          composed: true,
          detail: { value: this.select.value },
        }),
      );
    });
  }

  attributeChangedCallback(): void {
    this.labelEl.textContent = this.getAttribute('label') ?? '';
  }

  set options(options: SelectOption[]) {
    this.optionList = options;
    this.renderOptions();
  }

  get options(): SelectOption[] {
    return this.optionList;
  }

  private renderOptions(): void {
    const previous = this.pendingValue ?? this.select.value;
    this.select.innerHTML = '';
    const placeholder = this.getAttribute('placeholder');
    if (placeholder !== null) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder || 'Selecione…';
      this.select.appendChild(option);
    }
    for (const { value, label } of this.optionList) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      this.select.appendChild(option);
    }
    if (previous && this.optionList.some((o) => o.value === previous)) {
      this.select.value = previous;
    }
    this.pendingValue = null;
  }

  get value(): string {
    return this.select.value;
  }

  set value(value: string) {
    if (this.optionList.some((o) => o.value === value) || value === '') {
      this.select.value = value;
    } else {
      // Valor definido antes das opções chegarem
      this.pendingValue = value;
    }
  }

  setError(message: string | null): void {
    this.toggleAttribute('invalid', Boolean(message));
    this.errorEl.textContent = message ?? '';
    this.errorEl.hidden = !message;
  }

  focus(): void {
    this.select.focus();
  }
}

customElements.define('ui-select', UiSelect);
