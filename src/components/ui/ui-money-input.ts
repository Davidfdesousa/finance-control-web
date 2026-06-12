import { parseCurrencyBRL } from '../../utils/format';

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
    .wrap {
      display: flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm, 10px);
      background: var(--surface);
      min-height: var(--touch, 48px);
    }
    .wrap:focus-within {
      outline: 2px solid var(--pine);
      outline-offset: 1px;
    }
    :host([invalid]) .wrap {
      border-color: var(--red);
    }
    .prefix {
      padding: 0 0 0 1rem;
      font-weight: 700;
      color: var(--ink-faint);
      font-size: 0.9375rem;
    }
    input {
      font-family: var(--font-body);
      font-size: 1.0625rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      padding: 0.75rem 1rem 0.75rem 0.5rem;
    }
    input:focus {
      outline: none;
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
    <span class="wrap">
      <span class="prefix" aria-hidden="true">R$</span>
      <input type="text" inputmode="decimal" placeholder="0,00" autocomplete="off" />
    </span>
    <span class="error" role="alert" hidden></span>
  </label>
`;

export class UiMoneyInput extends HTMLElement {
  static observedAttributes = ['label'];

  private input: HTMLInputElement;
  private labelEl: HTMLElement;
  private errorEl: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.input = root.querySelector('input') as HTMLInputElement;
    this.labelEl = root.querySelector('.label') as HTMLElement;
    this.errorEl = root.querySelector('.error') as HTMLElement;

    this.input.addEventListener('input', () => this.setError(null));
    this.input.addEventListener('blur', () => {
      const parsed = parseCurrencyBRL(this.input.value);
      if (parsed !== null) this.value = parsed;
    });
  }

  attributeChangedCallback(): void {
    this.labelEl.textContent = this.getAttribute('label') ?? '';
  }

  /** Valor numérico em reais, ou null quando vazio/inválido. */
  get value(): number | null {
    if (!this.input.value.trim()) return null;
    return parseCurrencyBRL(this.input.value);
  }

  set value(amount: number | null) {
    this.input.value =
      amount === null
        ? ''
        : amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
  }

  /** True quando há texto digitado que não é um número válido. */
  get isInvalidText(): boolean {
    return this.input.value.trim() !== '' && parseCurrencyBRL(this.input.value) === null;
  }

  setError(message: string | null): void {
    this.toggleAttribute('invalid', Boolean(message));
    this.errorEl.textContent = message ?? '';
    this.errorEl.hidden = !message;
  }

  focus(): void {
    this.input.focus();
  }
}

customElements.define('ui-money-input', UiMoneyInput);
