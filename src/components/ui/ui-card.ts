const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg, 22px);
      padding: var(--sp-5, 1.25rem);
      box-shadow: var(--shadow-card);
    }
    :host([pad='sm']) .card {
      padding: var(--sp-4, 1rem);
    }
    :host([tone='pine']) .card {
      background:
        radial-gradient(140% 100% at 0% 0%, rgba(246, 243, 236, 0.08), transparent 55%),
        var(--pine-deep);
      border-color: var(--pine-deep);
      color: var(--paper);
    }
    :host([tone='soft']) .card {
      background: var(--pine-soft);
      border-color: transparent;
      box-shadow: none;
    }
  </style>
  <div class="card" part="card"><slot></slot></div>
`;

export class UiCard extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('ui-card', UiCard);
