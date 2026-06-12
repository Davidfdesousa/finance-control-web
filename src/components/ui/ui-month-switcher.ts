import { appStore, setMonthRef } from '../../state/store';
import { monthRefLabel, shiftMonthRef } from '../../utils/month';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    button {
      appearance: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    button:active {
      transform: scale(0.92);
    }
    button:focus-visible {
      outline: 2px solid var(--pine);
      outline-offset: 2px;
    }
    .label {
      font-family: var(--font-display);
      font-size: 1.1875rem;
      text-align: center;
      flex: 1;
    }
    svg {
      width: 20px;
      height: 20px;
    }
  </style>
  <div class="bar">
    <button type="button" class="prev" aria-label="Mês anterior">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <span class="label" aria-live="polite"></span>
    <button type="button" class="next" aria-label="Próximo mês">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </div>
`;

export class UiMonthSwitcher extends HTMLElement {
  private labelEl: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.labelEl = root.querySelector('.label') as HTMLElement;
    (root.querySelector('.prev') as HTMLElement).addEventListener('click', () =>
      setMonthRef(shiftMonthRef(appStore.get().monthRef, -1)),
    );
    (root.querySelector('.next') as HTMLElement).addEventListener('click', () =>
      setMonthRef(shiftMonthRef(appStore.get().monthRef, 1)),
    );
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe((state) => {
      this.labelEl.textContent = monthRefLabel(state.monthRef);
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

customElements.define('ui-month-switcher', UiMonthSwitcher);
