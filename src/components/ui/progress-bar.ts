export class ProgressBar extends HTMLElement {
  static observedAttributes = ['value'];

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  set value(value: number) {
    this.setAttribute('value', String(value));
  }

  get value(): number {
    return Number(this.getAttribute('value') ?? 0);
  }

  private render(): void {
    const value = Math.max(0, Math.min(100, this.value));
    this.innerHTML = `
      <div class="bar-track" aria-label="Progresso" role="progressbar"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">
        <div class="bar-fill" style="width:${value}%"></div>
      </div>
    `;
  }
}

customElements.define('progress-bar', ProgressBar);
