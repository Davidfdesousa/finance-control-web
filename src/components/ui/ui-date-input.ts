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
    input {
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
    input:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: 1px;
    }
  </style>
  <label>
    <span class="label"></span>
    <input type="date" />
  </label>
`;

export class UiDateInput extends HTMLElement {
  static observedAttributes = ['label'];

  private input: HTMLInputElement;
  private labelEl: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.input = root.querySelector('input') as HTMLInputElement;
    this.labelEl = root.querySelector('.label') as HTMLElement;
  }

  attributeChangedCallback(): void {
    this.labelEl.textContent = this.getAttribute('label') ?? '';
  }

  /** Data em 'YYYY-MM-DD' ou string vazia. */
  get value(): string {
    return this.input.value;
  }

  set value(isoDate: string) {
    this.input.value = isoDate;
  }

  focus(): void {
    this.input.focus();
  }
}

customElements.define('ui-date-input', UiDateInput);
